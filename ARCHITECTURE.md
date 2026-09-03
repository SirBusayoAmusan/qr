# Architecture

This document exists because "make it handle 1,000,000 contacts" has an honest
answer and a dishonest one. The dishonest answer is to optimise the client until
the demo looks fast. The honest answer is that the client has a hard ceiling, the
ceiling is documented below, and the code is shaped so crossing it is a swap
rather than a rewrite.

---

## 1. Where the data lives today

| Data | Key | Growth | Bound |
|---|---|---|---|
| Profile, plan, channel, presets | `tf:meta` | fixed | ~2KB |
| Video pages | `tf:campaigns` | one row per upload | ~600 bytes each |
| Counters | `tf:stats` | campaigns × retained days | 73KB at 1M events |
| Lead index | `tf:leads:idx` | count, shard lengths, last 100 | ~40KB at 1M leads |
| Leads | `tf:leads:0…n` | 500 rows per key | ~48KB per shard |

Two decisions carry the weight.

**There is no event log.** A scan or click increments counters in O(1) and is
then discarded. Storage is bounded by `campaigns × retained days`, not by
traffic. Measured: 1,000,000 events aggregate in 564ms into a 73KB blob. A
creator serving 100,000,000 scans stores exactly as much as one serving 1,000.

Retention is 180 days for the global daily series and 60 days for per-campaign
daily series. Lifetime totals are never pruned, only the day buckets.

**Leads are sharded, never loaded whole.** 500 rows per key, with an in-memory
array of shard lengths so paging seeks directly instead of scanning. Reads go
through three functions and nothing else touches storage:

- `getLeadPage({ page, pageSize })` — one or two shard reads at any depth
- `searchLeads({ query, campaignId, shardBudget })` — newest-first with a budget
- `streamLeads(onChunk)` — shard-by-shard, never resident

An LRU holds at most 24 shards (~12,000 rows).

---

## 2. Measured limits

Run `node loadtest.mjs`. On a mid-range machine:

| Operation | Scale | Result |
|---|---|---|
| Aggregate events | 1,000,000 | 564ms → 73KB |
| Chart render | 500 renders | 21ms |
| Bulk lead insert | 250,000 | 352ms |
| Largest single key | 250,000 leads | 48KB |
| Page load (page 0) | 250,000 rows | ~0ms |
| Page load (page 4,000) | 250,000 rows | ~0ms |
| Streamed export | 250,000 rows | 183ms |
| Heap after load | 250,000 rows | 76MB |
| Write coalescing | 60 keystrokes | 2 writes |
| Burst submission | 30 in a loop | 8 accepted, 22 throttled |

**The client ceiling is roughly 100,000 contacts per browser.** Beyond that:

- `localStorage` caps at 5–10MB per origin depending on the browser. 100,000
  leads is ~10MB of shards. This is the binding constraint, not CPU.
- Data lives on one device. Clear the browser, lose the list.
- Search cannot cover the whole set. `searchLeads` reports
  `{ complete: false, scannedShards, totalShards }` and the UI says so plainly:
  *"Searched the 20,000 most recent of 1,000,000 leads."* This is deliberate.
  A search that silently returns partial results is worse than one that admits it.

At 1,000,000 contacts you need a server. Not because the client code is bad, but
because a million rows belong in a database and a QR code needs a public URL that
resolves for someone who is not you.

---

## 3. The backend, when you need it

Nothing in the UI touches storage directly. Swapping `createStore(window.storage)`
for `createStore(httpAdapter)` moves the whole app server-side. The adapter
contract is four async methods: `get`, `set`, `delete`, `list`.

### Schema (Postgres)

```sql
create table creators (
  id            uuid primary key default gen_random_uuid(),
  email         citext unique not null,
  plan          text not null default 'free',
  channel       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table pages (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references creators(id) on delete cascade,
  slug          citext not null,
  title         text not null,
  config        jsonb not null,          -- links, capture, theme
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (slug)
);
create index on pages (creator_id) where not archived;

create table leads (
  id            bigserial primary key,
  creator_id    uuid not null references creators(id) on delete cascade,
  page_id       uuid references pages(id) on delete set null,
  email         citext not null,
  name          text,
  captured_at   timestamptz not null default now()
);
-- Paging and search both ride this index.
create index on leads (creator_id, captured_at desc);
create index on leads using gin (email gin_trgm_ops);
create unique index on leads (creator_id, email);   -- dedupe per creator

-- Counters, not rows. Same model as the client.
create table page_stats_daily (
  page_id       uuid not null references pages(id) on delete cascade,
  day           date not null,
  scans         bigint not null default 0,
  clicks        bigint not null default 0,
  leads         bigint not null default 0,
  primary key (page_id, day)
);
create index on page_stats_daily (day);
```

Scan and click events increment `page_stats_daily` with
`insert … on conflict (page_id, day) do update set scans = page_stats_daily.scans + 1`.
Raw events, if you ever want them, go to a separate append-only table with a
30-day partition drop. Do not join them for dashboards.

### API surface

```
GET    /api/pages                      list
POST   /api/pages                      create
PATCH  /api/pages/:id                  update
DELETE /api/pages/:id                  delete

GET    /api/leads?cursor=&limit=50     keyset pagination, newest first
GET    /api/leads/search?q=            trigram index, whole set
GET    /api/leads/export               streaming CSV response
DELETE /api/leads/:id

GET    /api/stats?range=30             daily series from page_stats_daily
POST   /api/e/:slug/scan               public, no auth
POST   /api/e/:slug/click              public, no auth
POST   /api/e/:slug/lead               public, no auth

GET    /:slug                          public page render (SSR or static)
```

Use **keyset pagination**, not `OFFSET`. `where captured_at < $cursor order by
captured_at desc limit 50` stays constant-time at ten million rows; `OFFSET
200000` does not.

Export must stream. Build the CSV with a server-side cursor and a
`Transfer-Encoding: chunked` response. Never `SELECT *` a million rows into
memory to serialise them.

---

## 4. Rate limiting

The client limiter in `src/lib/ratelimit.js` protects the app from itself and
from a casual bot. It runs in the attacker's browser, so it is not a security
control. Both layers are needed.

### Client (implemented)

| Bucket | Capacity | Refill | Protects |
|---|---|---|---|
| `lead` | 8 | 0.5/s | Form submission loops |
| `seed` | 3 | 0.05/s | Sample-data abuse |

Plus `WriteQueue`, which coalesces writes per key on a 350ms debounce, retries
with exponential backoff (120/240/480ms), and flushes on `beforeunload` and
`visibilitychange`. Lead capture bypasses the debounce — losing a lead to a
timer is not acceptable.

### Server (required before launch)

Apply at the edge, keyed by IP **and** by page slug so one hot page cannot
exhaust a global budget.

| Endpoint | Limit | Key | Rationale |
|---|---|---|---|
| `POST /api/e/:slug/lead` | 5/min, 30/hour | IP + slug | The abuse surface |
| `POST /api/e/:slug/scan` | 60/min | IP + slug | Cheap, but cap it |
| `POST /api/e/:slug/click` | 120/min | IP + slug | Cheap, but cap it |
| `GET /api/leads/export` | 5/hour | creator | Expensive query |
| `GET /api/leads/search` | 60/min | creator | Trigram scans |
| Authenticated writes | 300/min | creator | Runaway client guard |
| Magic-link send | 5/hour | email + IP | Prevents mail-bombing |

Return `429` with `Retry-After`. The client already renders the countdown from
`retryInMs`; wire it to the header.

Three more things that matter at the public endpoints:

1. **Dedupe leads per creator** at the database level (unique index above), so a
   refresh-and-resubmit does not inflate the list.
2. **Bot filtering.** A honeypot field plus a timing check (form submitted in
   under 1.5s is almost certainly automated) removes most junk without a CAPTCHA.
3. **Scan deduplication.** One person scanning twice in ten seconds is one scan.
   Hash `IP + user-agent + slug` into a short-lived cache.

---

## 4b. Pricing model

Free carries the whole core product: unlimited pages, unlimited scans,
unlimited leads, email capture, CSV export, custom URLs, brand presets. The two
gates are the second link per page and the analytics dashboard, both Pro. Pro is
$9.99/month or $75/year. The rationale: the free tier has to be good enough that
a creator will actually put a code in a video, because distribution is the whole
game. You charge once they are getting value (multiple offers per video) or
proving value (analytics for a sponsor).

Gate config lives in `PLAN_LIMITS` in `App.jsx`:

```
free: { linksPerPage: 1, analytics: false, export: true, presets: true, customSlug: true }
pro:  { linksPerPage: Infinity, analytics: true, ... }
```

## 5. Deliberate limitations

Stated plainly so nobody discovers them the hard way:

- **Auth is simulated.** The six-digit code is generated and displayed in the
  browser. Real magic links need Resend, Postmark, or similar.
- **Billing is simulated.** Upgrading switches the plan locally. No Stripe.
- **`qr.clearpath.click/:slug` does not resolve.** QR codes encode a real, valid,
  scannable URL, but nothing is hosted at that domain yet. The in-app preview is
  the working version of that page.
- **Search is partial past ~20,000 leads**, and says so.
- **A scanned QR only resolves on the device that created the page.** Pages live
  in that browser's storage. The `/p/:slug` route renders the page and records
  the scan locally, but another person's phone has no copy to load. This is THE
  reason to stand up the backend first — a QR that only works on your own phone
  is a demo, not a product. The public page route is already built and correct;
  it just needs a shared data source behind it.
- **Single-device.** No sync until there is a server.

The QR encoder is not on this list. It is a complete byte-mode implementation
with Reed-Solomon error correction at level M, versions 1 through 10, verified
module-for-module against a reference encoder across 400 randomised inputs. The
codes it produces are genuinely scannable.

---

## 6. Migration order, when the time comes

1. Stand up Postgres and the public endpoints. Point `qr.clearpath.click/:slug` at
   the page renderer. This alone makes the product real.
2. Add real auth. Everything else depends on identity.
3. Swap the store adapter from `window.storage` to HTTP. The UI does not change.
4. Move rate limiting to the edge. Keep the client buckets as a first line.
5. Add Stripe last. Charge only once the leads are landing.
