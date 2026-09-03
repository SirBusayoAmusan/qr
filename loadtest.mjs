import { createStore, SHARD_SIZE } from "./src/lib/store.js";
import { emptyStats, applyEvent, series, lastNDays, prune } from "./src/lib/stats.js";

// Backend that mimics the real constraints: 5MB per key, async.
function backend() {
  const m = new Map();
  let writes = 0, bytes = 0;
  return {
    api: {
      get: async (k) => (m.has(k) ? { key: k, value: m.get(k) } : null),
      set: async (k, v) => {
        if (v.length > 5 * 1024 * 1024) throw new Error("value too large: " + k);
        writes++; bytes += v.length; m.set(k, v); return { key: k, value: v };
      },
      delete: async (k) => { m.delete(k); return { key: k, deleted: true }; },
      list: async () => ({ keys: [...m.keys()] }),
    },
    stats: () => ({ keys: m.size, writes, bytes, largest: Math.max(0, ...[...m.values()].map(v => v.length)) }),
  };
}

const results = [];
const ok = (n, c, x = "") => results.push([c ? "PASS" : "FAIL", n, c ? "" : x]);
const ms = (t) => (Number(process.hrtime.bigint() - t) / 1e6).toFixed(0) + "ms";

// ---- 1. stats engine at 1,000,000 events ----
{
  const s = emptyStats();
  const t = process.hrtime.bigint();
  const now = Date.now();
  const camps = Array.from({ length: 200 }, (_, i) => "c" + i);
  for (let i = 0; i < 1_000_000; i++) {
    applyEvent(s, {
      type: i % 5 === 0 ? "lead" : i % 2 === 0 ? "scan" : "click",
      campaignId: camps[i % 200],
      linkId: "l" + (i % 600),
      ts: now - (i % 90) * 864e5,
    });
  }
  const elapsed = ms(t);
  prune(s, now);
  const size = JSON.stringify(s).length;
  ok("1M events aggregate", true, "");
  console.log("  1M events in " + elapsed + " | stats blob " + (size / 1024).toFixed(0) + "KB");
  ok("stats blob stays under 5MB at 1M events", size < 5 * 1024 * 1024, (size/1048576).toFixed(2) + "MB");
  ok("totals correct", s.totals.scans + s.totals.clicks + s.totals.leads === 1_000_000);

  const t2 = process.hrtime.bigint();
  for (let i = 0; i < 500; i++) series(s, lastNDays(30));
  console.log("  500 chart renders in " + ms(t2));
}

// ---- 2. lead sharding at 250,000 contacts ----
{
  const be = backend();
  const store = createStore(be.api);
  await store.load();
  store.setMeta({ user: { email: "b@x.com" }, plan: "pro" });

  const t = process.hrtime.bigint();
  const BATCH = 25_000, TOTAL = 250_000;
  for (let b = 0; b < TOTAL / BATCH; b++) {
    const leads = Array.from({ length: BATCH }, (_, i) => ({
      id: "L" + (b * BATCH + i),
      email: "viewer" + (b * BATCH + i) + "@gmail.com",
      name: "", campaignId: "c" + (i % 50), ts: Date.now() - i * 1000,
    }));
    await store.bulkAddLeads(leads);
  }
  console.log("  250,000 leads written in " + ms(t));
  const snap = store.snapshot();
  ok("lead count accurate", snap.leadIndex.count === TOTAL, String(snap.leadIndex.count));
  ok("sharded correctly", snap.leadIndex.shards === Math.ceil(TOTAL / SHARD_SIZE), String(snap.leadIndex.shards));
  ok("no key exceeds 5MB", be.stats().largest < 5 * 1024 * 1024, (be.stats().largest/1048576).toFixed(2) + "MB");
  console.log("  largest key: " + (be.stats().largest / 1024).toFixed(0) + "KB across " + be.stats().keys + " keys");

  const t2 = process.hrtime.bigint();
  const p0 = await store.getLeadPage({ page: 0, pageSize: 50 });
  const p1 = await store.getLeadPage({ page: 1, pageSize: 50 });
  const pLast = await store.getLeadPage({ page: 4000, pageSize: 50 });
  console.log("  3 page loads at 250k rows in " + ms(t2));
  ok("page size correct", p0.rows.length === 50);
  ok("pages don't overlap", p0.rows[0].id !== p1.rows[0].id);
  ok("total reported", p0.total === TOTAL);
  ok("deep page works", pLast.rows.length > 0);

  const t3 = process.hrtime.bigint();
  const found = await store.searchLeads({ query: "viewer249999@" });
  console.log("  search across newest shards in " + ms(t3));
  ok("search finds recent lead", found.rows.length > 0);
  ok("search reports completeness honestly", found.complete === false && found.totalShards > found.scannedShards);

  let streamed = 0;
  const t4 = process.hrtime.bigint();
  await store.streamLeads((rows) => { streamed += rows.length; });
  console.log("  streamed export of " + streamed + " rows in " + ms(t4));
  ok("export streams every row", streamed === TOTAL, String(streamed));

  const mem = process.memoryUsage().heapUsed / 1048576;
  console.log("  heap after 250k: " + mem.toFixed(0) + "MB");
  ok("shard cache bounded", mem < 900, mem.toFixed(0) + "MB");
}

// ---- 3. rate limiting ----
{
  const be = backend();
  const store = createStore(be.api);
  await store.load();
  store.setMeta({ plan: "pro" });
  let accepted = 0, limited = 0;
  for (let i = 0; i < 30; i++) {
    const r = await store.addLead({ email: "spam" + i + "@x.com", campaignId: "c1" });
    r.ok ? accepted++ : (r.reason === "rate_limited" ? limited++ : null);
  }
  ok("burst is throttled", limited > 0 && accepted <= 10, `accepted=${accepted} limited=${limited}`);
  console.log("  30 rapid submits -> " + accepted + " accepted, " + limited + " rate limited");
}

// ---- 4. leads unlimited on free plan ----
{
  const be = backend();
  const store = createStore(be.api);
  await store.load();
  store.setMeta({ plan: "free" });
  await store.bulkAddLeads(Array.from({length:50},(_,i)=>({id:"x"+i,email:i+"@x.com",name:"",campaignId:"c",ts:Date.now()})));
  const r = await store.addLead({ email: "51@x.com", campaignId: "c" });
  ok("free plan has no lead cap", r.ok === true && store.snapshot().leadIndex.count === 51, JSON.stringify(r));
}

// ---- 5. write coalescing ----
{
  const be = backend();
  const store = createStore(be.api);
  await store.load();
  const before = be.stats().writes;
  for (let i = 0; i < 60; i++) store.setMeta({ channel: { name: "typing" + i } });
  await store.flush();
  const after = be.stats().writes - before;
  ok("60 keystrokes coalesce to few writes", after <= 3, String(after));
  console.log("  60 rapid edits -> " + after + " actual write(s)");
}

// ---- 6. migration from v1 blob ----
{
  const be = backend();
  const legacy = {
    user: { email: "old@x.com" }, plan: "creator",
    channel: { name: "Old", handle: "@old", slug: "old", themeId: "ink", tagline: "", avatar: "" },
    presets: [{ id: "p1", name: "Main", themeId: "ink" }],
    campaigns: [{ id: "c1", title: "Old page", links: [{ id: "l1" }], slug: "old-page" }],
    leads: Array.from({ length: 1200 }, (_, i) => ({ id: "old" + i, email: i + "@old.com", name: "", campaignId: "c1", ts: Date.now() - i * 1000 })),
    events: Array.from({ length: 5000 }, (_, i) => ({ id: "e" + i, type: i % 3 === 0 ? "scan" : "click", campaignId: "c1", linkId: "l1", ts: Date.now() - (i % 30) * 864e5 })),
  };
  await be.api.set("tapframe:v1", JSON.stringify(legacy));
  const store = createStore(be.api);
  const s = await store.load();
  ok("migrated user", s.meta.user?.email === "old@x.com");
  ok("migrated plan", s.meta.plan === "creator");
  ok("migrated campaigns", s.campaigns.length === 1);
  ok("migrated leads into shards", s.leadIndex.count === 1200 && s.leadIndex.shards === 3, JSON.stringify(s.leadIndex).slice(0,80));
  ok("migrated events into counters", s.stats.totals.scans + s.stats.totals.clicks === 5000);
  ok("legacy key removed", (await be.api.get("tapframe:v1")) === null);
}

console.log("\n" + results.map(r => r[0].padEnd(5) + r[1] + (r[2] ? "  << " + r[2] : "")).join("\n"));
const f = results.filter(r => r[0] === "FAIL").length;
console.log("\n" + (results.length - f) + " passed, " + f + " failed");
