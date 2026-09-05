/**
 * Persistence.
 *
 * Design constraints that drove this:
 *   - The storage backend caps a single value at ~5MB and rate limits requests.
 *   - A creator's lead list is the only unbounded collection in the product.
 *   - The UI must stay responsive whether the list holds 10 rows or 1,000,000.
 *
 * So: hot, small, always-needed state (profile, plan, campaigns, counters)
 * lives in a handful of fixed keys. Leads are append-only and sharded at
 * SHARD_SIZE rows per key, with an index that holds the count, the shard
 * count, and a small recent window for instant first paint.
 *
 * Nothing loads the full lead list into memory. Paging pulls the two or three
 * shards a page spans. Export streams shard by shard. Search walks shards with
 * an explicit budget and tells the caller honestly when it stopped early.
 */

import { WriteQueue, tokenBucket } from "./ratelimit.js";
import { emptyStats, applyEvent, prune, forgetCampaign } from "./stats.js";

export const SCHEMA = 2;
export const SHARD_SIZE = 500;
const MAX_CACHED_SHARDS = 24; // ~12,000 leads resident at most
const SOFT_VALUE_LIMIT = 4 * 1024 * 1024; // stay under the 5MB hard cap

const K = {
  meta: "tf:meta",
  campaigns: "tf:campaigns",
  stats: "tf:stats",
  leadIndex: "tf:leads:idx",
  shard: (n) => "tf:leads:" + n,
  legacy: "tapframe:v1",
};

const uid = () => Math.random().toString(36).slice(2, 9);

/* ── storage adapter ─────────────────────────────────────────────────────── */

function makeAdapter(backend) {
  return {
    async get(key) {
      try {
        const r = await backend.get(key);
        return r ? JSON.parse(r.value) : null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      const payload = JSON.stringify(value);
      if (payload.length > SOFT_VALUE_LIMIT) {
        throw new Error(`Value for ${key} exceeds the safe size limit`);
      }
      await backend.set(key, payload);
      return true;
    },
    async del(key) {
      try {
        await backend.delete(key);
      } catch {
        /* already gone */
      }
    },
  };
}

/* ── defaults ────────────────────────────────────────────────────────────── */

export const emptyMeta = () => ({
  v: SCHEMA,
  user: null,
  plan: "free",
  channel: { name: "", handle: "", tagline: "", avatar: "", slug: "", themeId: "paper" },
  presets: [],
});

const emptyLeadIndex = () => ({ count: 0, shards: 0, lens: [], recent: [] });

/* ── store ───────────────────────────────────────────────────────────────── */

export function createStore(backend) {
  const adapter = makeAdapter(backend);
  const queue = new WriteQueue({
    adapter,
    flushMs: 350,
    onError: (key, err) => {
      state = { ...state, writeError: `Couldn't save ${key}: ${err.message}` };
      emit();
    },
  });

  // One bucket per concern. Lead capture is the abuse surface; the others
  // exist so a runaway render loop can't hammer storage.
  const buckets = {
    lead: tokenBucket({ capacity: 8, refillPerSec: 0.5, name: "lead" }),
    seed: tokenBucket({ capacity: 3, refillPerSec: 0.05, name: "seed" }),
  };

  const shardCache = new Map(); // shardNo -> leads[]  (insertion-ordered LRU)
  const listeners = new Set();

  let state = {
    ready: false,
    meta: emptyMeta(),
    campaigns: [],
    stats: emptyStats(),
    leadIndex: emptyLeadIndex(),
    writeError: null,
  };

  const emit = () => listeners.forEach((l) => l());
  const snapshot = () => state;
  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  /* ── shard cache ──────────────────────────────────────────────────────── */

  function touchCache(n, rows) {
    shardCache.delete(n);
    shardCache.set(n, rows);
    while (shardCache.size > MAX_CACHED_SHARDS) {
      shardCache.delete(shardCache.keys().next().value);
    }
  }

  async function readShard(n) {
    if (shardCache.has(n)) {
      const rows = shardCache.get(n);
      touchCache(n, rows);
      return rows;
    }
    const rows = (await adapter.get(K.shard(n))) || [];
    touchCache(n, rows);
    return rows;
  }

  /* ── boot ─────────────────────────────────────────────────────────────── */

  async function load() {
    const [meta, campaigns, stats, leadIndex] = await Promise.all([
      adapter.get(K.meta),
      adapter.get(K.campaigns),
      adapter.get(K.stats),
      adapter.get(K.leadIndex),
    ]);

    if (meta) {
      state = {
        ready: true,
        meta: { ...emptyMeta(), ...meta },
        campaigns: campaigns || [],
        stats: { ...emptyStats(), ...(stats || {}) },
        leadIndex: { ...emptyLeadIndex(), ...(leadIndex || {}) },
        writeError: null,
      };
    } else {
      const migrated = await migrateLegacy();
      state = migrated || { ...state, ready: true };
    }

    // Prune at most once a day, off the critical path.
    const now = Date.now();
    if (now - (state.stats.lastPruned || 0) > 864e5) {
      const s = structuredCloneish(state.stats);
      prune(s, now);
      state = { ...state, stats: s };
      queue.set(K.stats, () => state.stats);
    }

    emit();
    return state;
  }

  /** One-time upgrade from the v1 single-blob format. */
  async function migrateLegacy() {
    const old = await adapter.get(K.legacy);
    if (!old) return null;

    const meta = {
      ...emptyMeta(),
      user: old.user || null,
      plan: old.plan || "free",
      channel: old.channel || emptyMeta().channel,
      presets: old.presets || [],
    };
    const stats = emptyStats();
    (old.events || []).forEach((e) =>
      applyEvent(stats, { type: e.type, campaignId: e.campaignId, linkId: e.linkId, ts: e.ts })
    );
    prune(stats);

    const leads = [...(old.leads || [])].sort((a, b) => a.ts - b.ts);
    const shards = Math.max(0, Math.ceil(leads.length / SHARD_SIZE));
    const lens = [];
    for (let i = 0; i < shards; i++) {
      const rows = leads.slice(i * SHARD_SIZE, (i + 1) * SHARD_SIZE);
      await adapter.set(K.shard(i), rows);
      lens[i] = rows.length;
      if (i >= shards - 2) touchCache(i, rows);
    }
    const leadIndex = {
      count: leads.length,
      shards,
      lens,
      recent: leads.slice(-100).reverse(),
    };

    const next = {
      ready: true,
      meta,
      campaigns: old.campaigns || [],
      stats,
      leadIndex,
      writeError: null,
    };

    await adapter.set(K.meta, meta);
    await adapter.set(K.campaigns, next.campaigns);
    await adapter.set(K.stats, stats);
    await adapter.set(K.leadIndex, leadIndex);
    await adapter.del(K.legacy);
    return next;
  }

  /* ── mutations ────────────────────────────────────────────────────────── */

  function setMeta(patch) {
    state = { ...state, meta: { ...state.meta, ...patch } };
    queue.set(K.meta, () => state.meta);
    emit();
  }

  function setCampaigns(next) {
    state = { ...state, campaigns: next };
    queue.set(K.campaigns, () => state.campaigns);
    emit();
  }

  function updateCampaign(id, patch) {
    setCampaigns(state.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addCampaign(campaign) {
    setCampaigns([...state.campaigns, campaign]);
  }

  function removeCampaign(id) {
    const c = state.campaigns.find((x) => x.id === id);
    const s = structuredCloneish(state.stats);
    forgetCampaign(s, id, (c?.links || []).map((l) => l.id));
    state = { ...state, campaigns: state.campaigns.filter((x) => x.id !== id), stats: s };
    queue.set(K.campaigns, () => state.campaigns);
    queue.set(K.stats, () => state.stats);
    emit();
  }

  /** Record a scan or click. O(1), coalesced to storage. */
  function record(type, campaignId, linkId, ts = Date.now()) {
    const s = structuredCloneish(state.stats);
    applyEvent(s, { type, campaignId, linkId, ts });
    state = { ...state, stats: s };
    queue.set(K.stats, () => state.stats);
    emit();
  }

  /**
   * Capture a lead. Rate limited, appended to the tail shard, flushed
   * immediately — losing a lead to a debounce window is not acceptable.
   */
  async function addLead({ email, name = "", campaignId }) {
    const gate = buckets.lead.take();
    if (!gate.ok) {
      return { ok: false, reason: "rate_limited", retryInMs: gate.retryInMs };
    }

    const lead = { id: uid(), email: email.trim().toLowerCase(), name: name.trim(), campaignId, ts: Date.now() };
    const idx = state.leadIndex;
    const shardNo = Math.max(0, idx.shards - 1);
    const tail = idx.shards === 0 ? [] : await readShard(shardNo);

    let targetShard = shardNo;
    let rows;
    if (idx.shards === 0 || tail.length >= SHARD_SIZE) {
      targetShard = idx.shards;
      rows = [lead];
    } else {
      rows = [...tail, lead];
    }
    touchCache(targetShard, rows);

    const lens = [...idx.lens];
    lens[targetShard] = rows.length;

    const nextIndex = {
      count: idx.count + 1,
      shards: Math.max(idx.shards, targetShard + 1),
      lens,
      recent: [lead, ...idx.recent].slice(0, 100),
    };

    const s = structuredCloneish(state.stats);
    applyEvent(s, { type: "lead", campaignId, ts: lead.ts });

    state = { ...state, leadIndex: nextIndex, stats: s };
    emit();

    // Capture `rows` by value. Resolving from the cache at drain time is
    // unsafe: the LRU may have evicted this shard, which would persist [].
    const committed = rows;
    await queue.setNow(K.shard(targetShard), () => committed);
    queue.set(K.leadIndex, () => state.leadIndex);
    queue.set(K.stats, () => state.stats);

    return { ok: true, lead };
  }

  async function deleteLead(id) {
    const idx = state.leadIndex;
    for (let n = idx.shards - 1; n >= 0; n--) {
      const rows = await readShard(n);
      const at = rows.findIndex((l) => l.id === id);
      if (at === -1) continue;
      const next = rows.slice(0, at).concat(rows.slice(at + 1));
      touchCache(n, next);
      const lens = [...idx.lens];
      lens[n] = next.length;
      state = {
        ...state,
        leadIndex: {
          ...idx,
          count: Math.max(0, idx.count - 1),
          lens,
          recent: idx.recent.filter((l) => l.id !== id),
        },
      };
      queue.set(K.shard(n), () => next);
      queue.set(K.leadIndex, () => state.leadIndex);
      emit();
      return true;
    }
    return false;
  }

  /**
   * Newest-first page of leads. Reads only the shards the page spans —
   * typically one, never more than two.
   */
  async function getLeadPage({ page = 0, pageSize = 50 } = {}) {
    const { count, shards, lens } = state.leadIndex;
    if (count === 0) return { rows: [], total: 0, pages: 0 };

    // Seek to the right shard using the in-memory length index, so page 4000
    // costs the same two shard reads as page 0.
    let toSkip = page * pageSize;
    let n = shards - 1;
    for (; n >= 0; n--) {
      const len = lens[n] ?? 0;
      if (toSkip < len) break;
      toSkip -= len;
    }

    const out = [];
    for (; n >= 0 && out.length < pageSize; n--) {
      const rows = await readShard(n);
      let i = rows.length - 1 - toSkip;
      toSkip = 0;
      for (; i >= 0 && out.length < pageSize; i--) out.push(rows[i]);
    }
    return { rows: out, total: count, pages: Math.ceil(count / pageSize) };
  }

  /**
   * Progressive search. Walks newest shards first with a hard budget so the
   * UI never blocks. Reports whether it covered the whole list.
   */
  async function searchLeads({ query = "", campaignId = "all", limit = 100, shardBudget = 40 } = {}) {
    const q = query.trim().toLowerCase();
    const { shards } = state.leadIndex;
    const out = [];
    let scanned = 0;
    let n = shards - 1;
    for (; n >= 0 && out.length < limit && scanned < shardBudget; n--, scanned++) {
      const rows = await readShard(n);
      for (let i = rows.length - 1; i >= 0 && out.length < limit; i--) {
        const l = rows[i];
        if (campaignId !== "all" && l.campaignId !== campaignId) continue;
        if (q && !l.email.includes(q) && !(l.name || "").toLowerCase().includes(q)) continue;
        out.push(l);
      }
    }
    return {
      rows: out,
      complete: n < 0,
      scannedShards: scanned,
      totalShards: shards,
    };
  }

  /** Streams every shard through a callback so export never holds it all. */
  async function streamLeads(onChunk) {
    const { shards } = state.leadIndex;
    for (let n = 0; n < shards; n++) {
      const rows = await readShard(n);
      if (rows.length) await onChunk(rows, n, shards);
    }
  }

  /** Bulk-apply pre-aggregated demo traffic without materializing events. */
  function applyBulkStats(mutator) {
    const gate = buckets.seed.take();
    if (!gate.ok) return { ok: false, retryInMs: gate.retryInMs };
    const s = structuredCloneish(state.stats);
    mutator(s);
    prune(s);
    state = { ...state, stats: s };
    queue.set(K.stats, () => state.stats);
    emit();
    return { ok: true };
  }

  async function bulkAddLeads(incoming) {
    if (!incoming.length) return { added: 0, skipped: 0 };
    const leads = incoming;
    const skipped = 0;

    const idx = state.leadIndex;
    let shardNo = Math.max(0, idx.shards - 1);
    let rows = idx.shards === 0 ? [] : [...(await readShard(shardNo))];
    const lens = [...idx.lens];
    const dirty = new Map(); // shardNo -> rows, captured by value

    for (const lead of leads) {
      if (rows.length >= SHARD_SIZE) {
        dirty.set(shardNo, rows);
        lens[shardNo] = rows.length;
        shardNo++;
        rows = [];
      }
      rows.push(lead);
    }
    dirty.set(shardNo, rows);
    lens[shardNo] = rows.length;

    // Only the tail stays hot; earlier shards are written and released.
    touchCache(shardNo, rows);

    const sorted = [...leads].sort((a, b) => b.ts - a.ts);
    state = {
      ...state,
      leadIndex: {
        count: idx.count + leads.length,
        shards: shardNo + 1,
        lens,
        recent: [...sorted, ...idx.recent].slice(0, 100),
      },
    };
    for (const [n, value] of dirty) queue.set(K.shard(n), () => value);
    queue.set(K.leadIndex, () => state.leadIndex);
    emit();
    await queue.flush();
    return { added: leads.length, skipped };
  }

  async function reset() {
    const { shards } = state.leadIndex;
    for (let n = 0; n < shards; n++) await adapter.del(K.shard(n));
    await Promise.all([
      adapter.del(K.meta),
      adapter.del(K.campaigns),
      adapter.del(K.stats),
      adapter.del(K.leadIndex),
    ]);
    shardCache.clear();
    state = {
      ready: true,
      meta: emptyMeta(),
      campaigns: [],
      stats: emptyStats(),
      leadIndex: emptyLeadIndex(),
      writeError: null,
    };
    emit();
  }

  return {
    load,
    subscribe,
    snapshot,
    setMeta,
    setCampaigns,
    addCampaign,
    updateCampaign,
    removeCampaign,
    record,
    addLead,
    deleteLead,
    getLeadPage,
    searchLeads,
    streamLeads,
    applyBulkStats,
    bulkAddLeads,
    reset,
    flush: () => queue.drain(),
    _queue: queue,
    _buckets: buckets,
  };
}

/** Cheap deep clone for the counter tree. Avoids structuredClone availability issues. */
function structuredCloneish(stats) {
  return {
    totals: { ...stats.totals },
    byCampaign: shallowMapClone(stats.byCampaign),
    byLink: { ...stats.byLink },
    byDay: shallowMapClone(stats.byDay),
    byCampaignDay: Object.fromEntries(
      Object.entries(stats.byCampaignDay).map(([k, v]) => [k, shallowMapClone(v)])
    ),
    lastPruned: stats.lastPruned,
  };
}
function shallowMapClone(o) {
  const out = {};
  for (const k in o) out[k] = { ...o[k] };
  return out;
}
