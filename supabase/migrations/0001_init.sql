-- ============================================================================
-- Tapframe schema for Supabase / Postgres
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query),
-- or via `supabase db push` if you use the CLI.
--
-- The design mirrors the client data layer that already ships in the app:
--   * counters, not an event log, for analytics (bounded storage)
--   * leads are a normal table here (Postgres pages a million rows fine;
--     the client-side sharding was only needed for browser storage)
--   * every table is scoped to a creator and locked down with RLS
-- ============================================================================

create extension if not exists pg_trgm;      -- fast lead search by email
create extension if not exists "uuid-ossp";

-- ── creators ────────────────────────────────────────────────────────────────
-- One row per signed-in user. id matches auth.uid() so RLS is trivial.
create table if not exists creators (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  plan        text not null default 'free' check (plan in ('free','pro')),
  channel     jsonb not null default '{}'::jsonb,   -- name, handle, tagline, avatar, slug, themeId
  presets     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── pages (video pages) ─────────────────────────────────────────────────────
create table if not exists pages (
  id            uuid primary key default uuid_generate_v4(),
  creator_id    uuid not null references creators(id) on delete cascade,
  slug          text not null,
  title         text not null default '',
  headline      text not null default '',
  subhead       text not null default '',
  theme_id      text not null default 'paper',
  campaign_tag  text not null default '',
  video_url     text not null default '',
  links         jsonb not null default '[]'::jsonb,
  email_capture jsonb not null default '{}'::jsonb,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  -- The slug is the public address. It must be globally unique because the
  -- QR resolves /p/:slug with no creator context.
  unique (slug)
);
create index if not exists pages_creator_idx on pages (creator_id) where not archived;

-- ── leads ───────────────────────────────────────────────────────────────────
create table if not exists leads (
  id          bigint generated always as identity primary key,
  creator_id  uuid not null references creators(id) on delete cascade,
  page_id     uuid references pages(id) on delete set null,
  email       text not null,
  name        text not null default '',
  captured_at timestamptz not null default now()
);
-- Paging: newest-first per creator, keyset friendly.
create index if not exists leads_creator_time_idx on leads (creator_id, captured_at desc);
-- Search: trigram on email.
create index if not exists leads_email_trgm_idx on leads using gin (email gin_trgm_ops);
-- Dedupe: one email per creator. Re-submits update the timestamp, never duplicate.
create unique index if not exists leads_creator_email_idx on leads (creator_id, lower(email));

-- ── daily counters (analytics without an event log) ─────────────────────────
create table if not exists page_stats_daily (
  page_id     uuid not null references pages(id) on delete cascade,
  day         date not null,
  scans       bigint not null default 0,
  clicks      bigint not null default 0,
  leads       bigint not null default 0,
  primary key (page_id, day)
);
create index if not exists stats_day_idx on page_stats_daily (day);

-- Per-link click tallies, so the "clicks by link" chart works.
create table if not exists link_clicks (
  page_id   uuid not null references pages(id) on delete cascade,
  link_id   text not null,
  clicks    bigint not null default 0,
  primary key (page_id, link_id)
);

-- ============================================================================
-- Atomic counter bump. Called by the public write endpoints. Runs as
-- security definer so an anonymous scanner can increment counts without any
-- read/write access to the underlying tables.
-- ============================================================================
create or replace function bump_stat(
  p_page_id uuid,
  p_kind    text,          -- 'scan' | 'click' | 'lead'
  p_link_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into page_stats_daily (page_id, day, scans, clicks, leads)
  values (
    p_page_id, current_date,
    case when p_kind = 'scan'  then 1 else 0 end,
    case when p_kind = 'click' then 1 else 0 end,
    case when p_kind = 'lead'  then 1 else 0 end
  )
  on conflict (page_id, day) do update set
    scans  = page_stats_daily.scans  + case when p_kind = 'scan'  then 1 else 0 end,
    clicks = page_stats_daily.clicks + case when p_kind = 'click' then 1 else 0 end,
    leads  = page_stats_daily.leads  + case when p_kind = 'lead'  then 1 else 0 end;

  if p_kind = 'click' and p_link_id is not null then
    insert into link_clicks (page_id, link_id, clicks)
    values (p_page_id, p_link_id, 1)
    on conflict (page_id, link_id) do update set
      clicks = link_clicks.clicks + 1;
  end if;
end;
$$;

-- ============================================================================
-- Public page fetch. Returns exactly what the scanned page needs to render,
-- and nothing else (no creator email, no plan, no other pages). Security
-- definer so anonymous visitors can read one page by slug without RLS on the
-- whole table opening up.
-- ============================================================================
create or replace function get_public_page(p_slug text)
returns table (
  page_id      uuid,
  title        text,
  headline     text,
  subhead      text,
  theme_id     text,
  links        jsonb,
  email_capture jsonb,
  channel      jsonb
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.title, p.headline, p.subhead, p.theme_id, p.links, p.email_capture,
         jsonb_build_object(
           'name',    c.channel->>'name',
           'handle',  c.channel->>'handle',
           'avatar',  c.channel->>'avatar',
           'tagline', c.channel->>'tagline'
         ) as channel
  from pages p
  join creators c on c.id = p.creator_id
  where p.slug = p_slug and not p.archived
  limit 1;
$$;

-- ============================================================================
-- Public lead capture. Dedupes on (creator, email), bumps the lead counter,
-- and never exposes the leads table to anonymous clients.
-- ============================================================================
create or replace function capture_lead(
  p_slug  text,
  p_email text,
  p_name  text default ''
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page   pages%rowtype;
begin
  select * into v_page from pages where slug = p_slug and not archived limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_email');
  end if;

  insert into leads (creator_id, page_id, email, name)
  values (v_page.creator_id, v_page.id, lower(p_email), coalesce(p_name, ''))
  on conflict (creator_id, lower(email)) do update set captured_at = now();

  perform bump_stat(v_page.id, 'lead', null);
  return jsonb_build_object('ok', true);
end;
$$;

-- ============================================================================
-- Row level security. Default deny; creators see only their own rows.
-- ============================================================================
alter table creators        enable row level security;
alter table pages           enable row level security;
alter table leads           enable row level security;
alter table page_stats_daily enable row level security;
alter table link_clicks     enable row level security;

-- creators: a user reads and writes only their own row.
create policy creators_self on creators
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- pages: owner-only for every operation.
create policy pages_owner on pages
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- leads: owner-only. Anonymous capture goes through capture_lead(), which is
-- security definer and bypasses this, so no anon policy is needed.
create policy leads_owner on leads
  for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

-- stats: owner reads via a join to pages. Writes happen through bump_stat()
-- (security definer), so only a read policy is needed here.
create policy stats_owner_read on page_stats_daily
  for select using (
    exists (select 1 from pages p where p.id = page_stats_daily.page_id and p.creator_id = auth.uid())
  );
create policy linkclicks_owner_read on link_clicks
  for select using (
    exists (select 1 from pages p where p.id = link_clicks.page_id and p.creator_id = auth.uid())
  );

-- Let anonymous and authenticated callers execute the three public functions.
grant execute on function get_public_page(text) to anon, authenticated;
grant execute on function capture_lead(text, text, text) to anon, authenticated;
grant execute on function bump_stat(uuid, text, text) to anon, authenticated;

-- Auto-create a creators row the first time someone signs in.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into creators (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
