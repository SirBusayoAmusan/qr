/**
 * Supabase-backed store.
 *
 * This exposes the SAME interface as the local store in store.js — same method
 * names, same shapes, same snapshot — so the UI doesn't change. The only
 * difference is where the data lives: a real Postgres database that every
 * device can reach, which is the whole point (a scanned QR now resolves on any
 * phone, not just the one that made the page).
 *
 * Analytics still use counters, not an event log. Here the counters live in
 * page_stats_daily and are bumped atomically by a SQL function. The client
 * reads them back and reshapes them into the same { totals, byCampaign, byDay,
 * ... } tree the charts already understand.
 */

import { createClient } from "@supabase/supabase-js";
import { emptyStats, applyEvent, dayKey } from "./stats.js";

const uid = () => Math.random().toString(36).slice(2, 9);

export function hasSupabaseConfig() {
  return Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
}

export function createSupabaseClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
}

/* ── row <-> app shape mapping ───────────────────────────────────────────── */

const pageFromRow = (r) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  headline: r.headline,
  subhead: r.subhead,
  themeId: r.theme_id,
  campaignTag: r.campaign_tag,
  videoUrl: r.video_url,
  links: r.links || [],
  emailCapture: r.email_capture || { enabled: false },
  archived: r.archived,
  createdAt: new Date(r.created_at).getTime(),
  slugCustom: true, // slugs from the DB are authoritative; don't auto-rewrite
});

const pageToRow = (c, creatorId) => ({
  id: c.id,
  creator_id: creatorId,
  slug: c.slug,
  title: c.title ?? "",
  headline: c.headline ?? "",
  subhead: c.subhead ?? "",
  theme_id: c.themeId ?? "paper",
  campaign_tag: c.campaignTag ?? "",
  video_url: c.videoUrl ?? "",
  links: c.links ?? [],
  email_capture: c.emailCapture ?? {},
  archived: c.archived ?? false,
});

/* ── stats reshaping ─────────────────────────────────────────────────────── */

function buildStats(dailyRows, linkRows, pageIds) {
  const stats = emptyStats();
  // pageId -> stays the campaignId used everywhere in the UI
  for (const row of dailyRows) {
    const ts = new Date(row.day).getTime();
    if (row.scans) applyEvent(stats, { type: "scan", campaignId: row.page_id, ts, count: row.scans });
    if (row.clicks) applyEvent(stats, { type: "click", campaignId: row.page_id, ts, count: row.clicks });
    if (row.leads) applyEvent(stats, { type: "lead", campaignId: row.page_id, ts, count: row.leads });
  }
  for (const row of linkRows) {
    stats.byLink[row.link_id] = (stats.byLink[row.link_id] || 0) + row.clicks;
  }
  return stats;
}

/* ── store ───────────────────────────────────────────────────────────────── */

export function createSupabaseStore(sb) {
  const listeners = new Set();
  let state = {
    ready: false,
    meta: { user: null, plan: "free", channel: { name: "", handle: "", tagline: "", avatar: "", slug: "", themeId: "paper" }, presets: [] },
    campaigns: [],
    stats: emptyStats(),
    leadIndex: { count: 0, recent: [] },
    writeError: null,
  };
  const emit = () => listeners.forEach((l) => l());
  const snapshot = () => state;
  const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
  const setError = (e) => { state = { ...state, writeError: e }; emit(); };

  async function currentUserId() {
    const { data } = await sb.auth.getUser();
    return data?.user?.id || null;
  }

  async function refreshStats(campaigns) {
    const ids = campaigns.map((c) => c.id);
    if (ids.length === 0) return emptyStats();
    const [{ data: daily }, { data: links }] = await Promise.all([
      sb.from("page_stats_daily").select("page_id,day,scans,clicks,leads").in("page_id", ids),
      sb.from("link_clicks").select("page_id,link_id,clicks").in("page_id", ids),
    ]);
    return buildStats(daily || [], links || [], ids);
  }

  async function refreshLeadIndex() {
    const { count } = await sb.from("leads").select("id", { count: "exact", head: true });
    const { data: recent } = await sb
      .from("leads")
      .select("id,email,name,page_id,captured_at")
      .order("captured_at", { ascending: false })
      .limit(100);
    return {
      count: count || 0,
      recent: (recent || []).map((l) => ({
        id: l.id, email: l.email, name: l.name, campaignId: l.page_id, ts: new Date(l.captured_at).getTime(),
      })),
    };
  }

  async function load() {
    const uidNow = await currentUserId();
    if (!uidNow) {
      state = { ...state, ready: true };
      emit();
      return state;
    }
    const { data: creator } = await sb.from("creators").select("*").eq("id", uidNow).single();
    const { data: pageRows } = await sb.from("pages").select("*").eq("creator_id", uidNow).order("created_at", { ascending: false });
    const campaigns = (pageRows || []).map(pageFromRow);
    const [stats, leadIndex] = await Promise.all([refreshStats(campaigns), refreshLeadIndex()]);

    state = {
      ready: true,
      meta: {
        user: { email: creator?.email, id: uidNow },
        plan: creator?.plan || "free",
        channel: { name: "", handle: "", tagline: "", avatar: "", slug: "", themeId: "paper", ...(creator?.channel || {}) },
        presets: creator?.presets || [],
      },
      campaigns,
      stats,
      leadIndex,
      writeError: null,
    };
    emit();
    return state;
  }

  /* auth ------------------------------------------------------------------- */

  async function sendCode(email) {
    const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return { ok: !error, error: error?.message };
  }
  async function verifyCode(email, token) {
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { ok: false, error: error.message };
    await load();
    return { ok: true };
  }
  async function signOut() {
    await sb.auth.signOut();
    state = { ...state, meta: { ...state.meta, user: null } };
    emit();
  }

  /* meta ------------------------------------------------------------------- */

  async function setMeta(patch) {
    // Optimistic, then persist channel/plan/presets to the creators row.
    state = { ...state, meta: { ...state.meta, ...patch } };
    emit();
    const uidNow = await currentUserId();
    if (!uidNow) return;
    const row = {};
    if (patch.channel) row.channel = state.meta.channel;
    if (patch.presets) row.presets = state.meta.presets;
    if (patch.plan) row.plan = state.meta.plan;
    if (Object.keys(row).length) {
      const { error } = await sb.from("creators").update(row).eq("id", uidNow);
      if (error) setError("Couldn't save settings: " + error.message);
    }
  }

  /* pages ------------------------------------------------------------------ */

  async function addCampaign(c) {
    state = { ...state, campaigns: [c, ...state.campaigns] };
    emit();
    const uidNow = await currentUserId();
    const { error } = await sb.from("pages").insert(pageToRow(c, uidNow));
    if (error) setError("Couldn't create page: " + error.message);
  }

  async function updateCampaign(id, patch) {
    state = { ...state, campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
    emit();
    const c = state.campaigns.find((x) => x.id === id);
    const uidNow = await currentUserId();
    const { error } = await sb.from("pages").update(pageToRow(c, uidNow)).eq("id", id);
    if (error) setError("Couldn't save page: " + error.message);
  }

  function setCampaigns(next) {
    // Used by the seed helper; each page is upserted.
    state = { ...state, campaigns: next };
    emit();
    currentUserId().then((uidNow) => {
      if (!uidNow) return;
      sb.from("pages").upsert(next.map((c) => pageToRow(c, uidNow))).then(({ error }) => {
        if (error) setError("Couldn't save pages: " + error.message);
      });
    });
  }

  async function removeCampaign(id) {
    state = { ...state, campaigns: state.campaigns.filter((c) => c.id !== id) };
    emit();
    const { error } = await sb.from("pages").delete().eq("id", id);
    if (error) setError("Couldn't delete page: " + error.message);
    state = { ...state, stats: await refreshStats(state.campaigns) };
    emit();
  }

  /* events (public, unauthenticated) --------------------------------------- */

  // Called from the authoring UI preview and from the public page. Uses the
  // SQL bump function so an anonymous scanner can record without table access.
  async function record(type, campaignId, linkId) {
    // Optimistic local bump so the dashboard feels live.
    const s = { ...state.stats };
    applyEvent(s, { type, campaignId, linkId, ts: Date.now() });
    state = { ...state, stats: s };
    emit();
    const { error } = await sb.rpc("bump_stat", { p_page_id: campaignId, p_kind: type, p_link_id: linkId || null });
    if (error) { /* non-fatal: a lost count is better than a blocked scan */ }
  }

  /* leads ------------------------------------------------------------------ */

  async function addLead({ email, name = "", campaignId }) {
    // Authoring preview path — writes directly (creator is authenticated).
    const uidNow = await currentUserId();
    if (uidNow) {
      const { error } = await sb.from("leads").upsert(
        { creator_id: uidNow, page_id: campaignId, email: email.trim().toLowerCase(), name: name.trim() },
        { onConflict: "creator_id,email" }
      );
      if (error) return { ok: false, reason: "error", message: error.message };
      await record("lead", campaignId);
      state = { ...state, leadIndex: await refreshLeadIndex() };
      emit();
      return { ok: true };
    }
    return { ok: false, reason: "no_auth" };
  }

  // Public capture from a scanned page — no auth. Goes through the SQL function.
  async function captureLeadPublic(slug, email, name = "") {
    const { data, error } = await sb.rpc("capture_lead", { p_slug: slug, p_email: email, p_name: name });
    if (error) return { ok: false, reason: "error", message: error.message };
    return data || { ok: true };
  }

  async function deleteLead(id) {
    state = { ...state, leadIndex: { ...state.leadIndex, count: Math.max(0, state.leadIndex.count - 1), recent: state.leadIndex.recent.filter((l) => l.id !== id) } };
    emit();
    const { error } = await sb.from("leads").delete().eq("id", id);
    if (error) setError("Couldn't delete lead: " + error.message);
  }

  async function getLeadPage({ page = 0, pageSize = 50 } = {}) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, count } = await sb
      .from("leads")
      .select("id,email,name,page_id,captured_at", { count: "exact" })
      .order("captured_at", { ascending: false })
      .range(from, to);
    return {
      rows: (data || []).map((l) => ({ id: l.id, email: l.email, name: l.name, campaignId: l.page_id, ts: new Date(l.captured_at).getTime() })),
      total: count || 0,
      pages: Math.ceil((count || 0) / pageSize),
    };
  }

  async function searchLeads({ query = "", campaignId = "all", limit = 200 } = {}) {
    let q = sb.from("leads").select("id,email,name,page_id,captured_at").order("captured_at", { ascending: false }).limit(limit);
    if (query.trim()) q = q.ilike("email", `%${query.trim()}%`);
    if (campaignId !== "all") q = q.eq("page_id", campaignId);
    const { data } = await q;
    return {
      rows: (data || []).map((l) => ({ id: l.id, email: l.email, name: l.name, campaignId: l.page_id, ts: new Date(l.captured_at).getTime() })),
      complete: true, // Postgres searched the whole set, unlike the client shards
      scannedShards: 0,
      totalShards: 0,
    };
  }

  async function streamLeads(onChunk) {
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data } = await sb
        .from("leads")
        .select("id,email,name,page_id,captured_at")
        .order("captured_at", { ascending: true })
        .range(from, from + pageSize - 1);
      if (!data || data.length === 0) break;
      await onChunk(data.map((l) => ({ id: l.id, email: l.email, name: l.name, campaignId: l.page_id, ts: new Date(l.captured_at).getTime() })));
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }

  /* seeding (dev only) ----------------------------------------------------- */

  function applyBulkStats() {
    // Sample data doesn't make sense against a shared DB; no-op on Supabase.
    return { ok: false, reason: "not_supported" };
  }
  async function bulkAddLeads() { return { added: 0, skipped: 0 }; }

  async function getPublicPage(slug) {
    const { data, error } = await sb.rpc("get_public_page", { p_slug: slug });
    if (error || !data || data.length === 0) return null;
    const r = data[0];
    return {
      id: r.page_id,
      title: r.title,
      headline: r.headline,
      subhead: r.subhead,
      themeId: r.theme_id,
      links: r.links || [],
      emailCapture: r.email_capture || { enabled: false },
      channel: r.channel || {},
    };
  }

  async function reset() { /* no-op; use the Supabase dashboard */ }

  return {
    backend: "supabase",
    load, subscribe, snapshot,
    sendCode, verifyCode, signOut,
    setMeta, setCampaigns, addCampaign, updateCampaign, removeCampaign,
    record, addLead, captureLeadPublic, deleteLead,
    getLeadPage, searchLeads, streamLeads,
    applyBulkStats, bulkAddLeads,
    getPublicPage,
    reset,
    flush: async () => {},
  };
}
