/**
 * Analytics without an event log.
 *
 * The prototype stored every scan and click as a row, then re-scanned the
 * whole array on every render. That is O(events) per render and O(events) in
 * storage. At 1,000,000 events the tab freezes and the payload exceeds the
 * per-key size limit.
 *
 * Here, an event mutates a small set of counters in O(1) and is then thrown
 * away. Storage is bounded by (campaigns x retained days), not by traffic.
 * A creator with 200 videos and 60 days retained holds ~12,000 small counter
 * rows regardless of whether they served 1,000 scans or 100,000,000.
 *
 * Raw per-event rows are the server's job. See ARCHITECTURE.md.
 */

export const DAY_RETENTION = 180; // global daily series
export const CAMPAIGN_DAY_RETENTION = 60; // per-campaign daily series

export function dayKey(ts) {
  const d = new Date(ts);
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function lastNDays(n, now = Date.now()) {
  const out = [];
  const base = new Date(now);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    out.push(dayKey(d.getTime()));
  }
  return out;
}

export function emptyStats() {
  return {
    totals: { scans: 0, clicks: 0, leads: 0 },
    byCampaign: {}, // id -> {scans, clicks, leads}
    byLink: {}, // linkId -> clicks
    byDay: {}, // 'YYYY-MM-DD' -> {scans, clicks, leads}
    byCampaignDay: {}, // id -> { 'YYYY-MM-DD' -> {scans, clicks, leads} }
    lastPruned: 0,
  };
}

const bump = (obj, key, field, by) => {
  const row = obj[key] || (obj[key] = { scans: 0, clicks: 0, leads: 0 });
  row[field] += by;
};

/**
 * Apply one event. Mutates in place for speed — callers pass a draft they own.
 * type: 'scan' | 'click' | 'lead'
 */
export function applyEvent(stats, { type, campaignId, linkId, ts = Date.now(), count = 1 }) {
  const field = type === "scan" ? "scans" : type === "click" ? "clicks" : "leads";
  const day = dayKey(ts);

  stats.totals[field] += count;
  if (campaignId) {
    bump(stats.byCampaign, campaignId, field, count);
    const perDay = stats.byCampaignDay[campaignId] || (stats.byCampaignDay[campaignId] = {});
    bump(perDay, day, field, count);
  }
  bump(stats.byDay, day, field, count);
  if (type === "click" && linkId) {
    stats.byLink[linkId] = (stats.byLink[linkId] || 0) + count;
  }
  return stats;
}

/** Drop day buckets outside the retention window. Totals are never lost. */
export function prune(stats, now = Date.now()) {
  const keepGlobal = new Set(lastNDays(DAY_RETENTION, now));
  const keepCampaign = new Set(lastNDays(CAMPAIGN_DAY_RETENTION, now));

  for (const k of Object.keys(stats.byDay)) {
    if (!keepGlobal.has(k)) delete stats.byDay[k];
  }
  for (const cid of Object.keys(stats.byCampaignDay)) {
    const rows = stats.byCampaignDay[cid];
    for (const k of Object.keys(rows)) {
      if (!keepCampaign.has(k)) delete rows[k];
    }
    if (Object.keys(rows).length === 0) delete stats.byCampaignDay[cid];
  }
  stats.lastPruned = now;
  return stats;
}

/** Remove everything belonging to a deleted campaign. */
export function forgetCampaign(stats, campaignId, linkIds = []) {
  const row = stats.byCampaign[campaignId];
  if (row) {
    stats.totals.scans -= row.scans;
    stats.totals.clicks -= row.clicks;
    stats.totals.leads -= row.leads;
  }
  // Subtract the campaign's contribution from the global daily series.
  const perDay = stats.byCampaignDay[campaignId] || {};
  for (const [day, r] of Object.entries(perDay)) {
    const g = stats.byDay[day];
    if (!g) continue;
    g.scans = Math.max(0, g.scans - r.scans);
    g.clicks = Math.max(0, g.clicks - r.clicks);
    g.leads = Math.max(0, g.leads - r.leads);
  }
  delete stats.byCampaign[campaignId];
  delete stats.byCampaignDay[campaignId];
  linkIds.forEach((id) => delete stats.byLink[id]);
  return stats;
}

const ZERO = { scans: 0, clicks: 0, leads: 0 };

/** Daily series for a chart. O(days), independent of traffic volume. */
export function series(stats, days, campaignId = null) {
  const src = campaignId ? stats.byCampaignDay[campaignId] || {} : stats.byDay;
  return days.map((d) => {
    const r = src[d] || ZERO;
    const [, m, dd] = d.split("-");
    return { day: d, label: dd + "/" + m, scans: r.scans, clicks: r.clicks, leads: r.leads };
  });
}

/** Totals over an arbitrary window, summed from day buckets. */
export function windowTotals(stats, days, campaignId = null) {
  const src = campaignId ? stats.byCampaignDay[campaignId] || {} : stats.byDay;
  const out = { scans: 0, clicks: 0, leads: 0 };
  for (const d of days) {
    const r = src[d];
    if (!r) continue;
    out.scans += r.scans;
    out.clicks += r.clicks;
    out.leads += r.leads;
  }
  return out;
}

export function campaignTotals(stats, campaignId) {
  return stats.byCampaign[campaignId] || ZERO;
}

export const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : null);
