import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef, lazy, Suspense } from "react";
import {
  QrCode, Plus, Link2, Mail, ArrowRight, ArrowLeft, Download, Check, BarChart3,
  Users, Palette, User, CreditCard, Trash2, Eye, Search, Zap, Lock, TrendingUp,
  MousePointerClick, ScanLine, Sparkles, ChevronRight, Play, Globe, Layers,
  LogOut, Star, AlertTriangle, Copy,
} from "lucide-react";
import { createStore } from "../lib/store.js";
import { createSupabaseStore, createSupabaseClient, hasSupabaseConfig } from "../lib/supabaseStore.js";
import {
  lastNDays, series, windowTotals, campaignTotals, applyEvent, pct, dayKey,
} from "../lib/stats.js";
const Charts = {
  Traffic: lazy(() => import("./Charts.jsx").then((m) => ({ default: m.TrafficChart }))),
  Bars: lazy(() => import("./Charts.jsx").then((m) => ({ default: m.CampaignBars }))),
};

import {
  BASE_URL, PUBLIC_ORIGIN, publicUrl, displayUrl, THEMES, themeById, uid, slugify, isEmail, youtubeId,
  Btn, Field, Input, Card, SectionTitle, Stat, Pill, Empty, Toggle, CopyBtn,
  Spinner, QR, downloadQRPng, downloadBlob,
} from "./primitives.jsx";

/* ── store binding ───────────────────────────────────────────────────────── */

let _store = null;
export function getStore() {
  if (!_store) {
    if (hasSupabaseConfig()) {
      _store = createSupabaseStore(createSupabaseClient());
    } else {
      _store = createStore(window.storage);
    }
  }
  return _store;
}
export const usingSupabase = () => hasSupabaseConfig();
function useStore() {
  const store = getStore();
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return [state, store];
}

const LINK_KINDS = {
  link: { label: "Link", icon: Link2 },
  product: { label: "Product", icon: Star },
  community: { label: "Community", icon: Users },
};

// Everything a solo creator needs is free. The two things that cost real
// money to run at scale, or that only matter once someone is serious, sit
// behind Pro: more than one link per page, and analytics.
const PLAN_LIMITS = {
  free: { linksPerPage: 1, analytics: false, export: true, presets: true, customSlug: true, advanced: false },
  pro: { linksPerPage: Infinity, analytics: true, export: true, presets: true, customSlug: true, advanced: true },
};
const limitsFor = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.free;

/* ── landing ─────────────────────────────────────────────────────────────── */

const DEMO_LINES = ["the-lagos-fintech-teardown", "how-i-priced-my-first-deal", "50-cold-emails-breakdown"];

function Landing({ onStart }) {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const target = DEMO_LINES[i];
    if (typed.length < target.length) {
      const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 55);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setTyped(""); setI((i + 1) % DEMO_LINES.length); }, 2200);
    return () => clearTimeout(t);
  }, [typed, i]);

  return (
    <div className="bg-white min-h-screen font-sans">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-[26px] h-[26px] rounded-md bg-ink flex items-center justify-center">
            <ScanLine size={15} className="text-white" />
          </div>
          <span className="text-base font-semibold tracking-[-0.02em] text-ink">Tapframe</span>
        </div>
        <Btn size="sm" onClick={onStart}>Start free <ArrowRight size={13} /></Btn>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 mb-6 bg-accent-soft text-accent text-[11.5px] font-semibold font-mono">
            <Zap size={12} /> Built for screens you can't click
          </div>
          <h1 className="text-[46px] leading-[1.04] tracking-tightest font-bold text-ink">
            Half your viewers<br />can't tap your link.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-body">
            People watch you on a TV, a desktop tab, a projector in a co-working space. There's no link in bio there.
            Tapframe gives every video a scannable page, and tells you exactly which video sent the traffic.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn size="lg" onClick={onStart}>Create your first code <ArrowRight size={15} /></Btn>
            <Btn size="lg" variant="ghost" onClick={onStart}><Play size={14} /> See the dashboard</Btn>
          </div>
          <p className="mt-4 text-[12.5px] text-muted">No card. No password. One email and you're in.</p>
        </div>

        <div className="rounded-2xl p-4 bg-soft border border-line">
          <div className="rounded-xl overflow-hidden relative bg-ink aspect-video">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[#3A3A44] text-[12.5px] font-mono">your video plays here</span>
            </div>
            <div className="absolute right-3.5 bottom-3.5 rounded-lg p-2 bg-white">
              <QR text={`https://${BASE_URL}/${typed || "loading"}`} size={92} quiet={1} />
            </div>
            <div className="absolute left-3.5 bottom-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-muted text-[11px] font-mono">scan · 04:12</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-1">
            <span className="font-mono text-[12.5px] text-muted">{BASE_URL}/</span>
            <span className="font-mono text-[12.5px] text-ink font-semibold">{typed}</span>
            <span className="inline-block w-[7px] h-3.5 bg-accent opacity-80" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14 border-t border-line">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Layers, h: "A page per video", p: "Not one link tree for your whole channel. Each video gets its own page with its own offer, so the page matches what they just watched." },
            { icon: Mail, h: "Leads, not just clicks", p: "Put an email gate in front of any link. Export the list whenever you want. It's yours, not ours." },
            { icon: BarChart3, h: "Attribution YouTube won't give you", p: "Scans, clicks, and signups broken down by video. You'll know which upload actually earns." },
          ].map((f) => (
            <div key={f.h}>
              <f.icon size={18} className="text-accent" />
              <h3 className="mt-3 text-[16.5px] font-semibold tracking-[-0.02em] text-ink">{f.h}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{f.p}</p>
            </div>
          ))}
        </div>
      </section>

      <PricingGrid onPick={onStart} />

      <footer className="px-6 py-10 text-center border-t border-line">
        <p className="text-[12.5px] text-muted font-mono">Tapframe — {BASE_URL}</p>
      </footer>
    </div>
  );
}

const PLANS = [
  { id: "free", name: "Free", price: "$0", per: "forever", tag: null, cta: "Start free",
    lines: ["Unlimited video pages", "Unlimited scans", "One link per page", "Email capture + CSV export", "Custom page URLs", "Brand presets"] },
  { id: "pro", name: "Pro", price: "$9.99", per: "per month", tag: "For serious creators", cta: "Upgrade to Pro",
    lines: ["Everything in Free", "Unlimited links per page", "Full analytics dashboard", "Funnel and conversion by video", "Campaign grouping", "Sponsor-ready reporting", "$75/year — save 37%"] },
];

function PricingGrid({ onPick, current }) {
  return (
    <section className="max-w-6xl mx-auto px-6 py-14 border-t border-line">
      <h2 className="text-[26px] font-semibold tracking-display text-ink">Pricing</h2>
      <p className="mt-1.5 text-sm text-body">Start free. Move up when the leads start landing.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-8 max-w-2xl">
        {PLANS.map((p) => {
          const active = current === p.id;
          return (
            <div key={p.id} className={`rounded-xl p-5 flex flex-col bg-white border ${p.tag ? "border-accent" : "border-line"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[14.5px] font-semibold text-ink">{p.name}</span>
                {active ? <Pill tone="good">Current</Pill> : p.tag ? <Pill tone="accent">{p.tag}</Pill> : null}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-mono nums text-[26px] font-semibold text-ink tracking-[-0.03em]">{p.price}</span>
                <span className="text-[12.5px] text-muted">{p.per}</span>
              </div>
              <ul className="mt-5 space-y-2 flex-1">
                {p.lines.map((l) => (
                  <li key={l} className="flex gap-2 items-start">
                    <Check size={14} className="text-good mt-0.5 shrink-0" />
                    <span className="text-[13.2px] text-body leading-snug">{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Btn full variant={p.tag ? "accent" : "ghost"} onClick={() => onPick(p.id)} disabled={active}>
                  {active ? "You're on this plan" : p.cta}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-muted">
        Prices in USD. Billing isn't wired up in this build, so upgrading switches the plan locally to show what unlocks.
      </p>
    </section>
  );
}

/* ── auth ────────────────────────────────────────────────────────────────── */

function Auth({ onDone, onBack, store }) {
  const live = store.backend === "supabase";
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!isEmail(email)) { setErr("That email doesn't look right."); return; }
    setErr("");
    if (live) {
      setBusy(true);
      const r = await store.sendCode(email);
      setBusy(false);
      if (!r.ok) { setErr(r.error || "Couldn't send the code. Try again."); return; }
      setStep("code");
    } else {
      setSent(String(Math.floor(100000 + Math.random() * 900000)));
      setStep("code");
    }
  };
  const verify = async () => {
    if (live) {
      if (code.trim().length < 6) { setErr("Enter the 6-digit code from your email."); return; }
      setBusy(true);
      const r = await store.verifyCode(email, code.trim());
      setBusy(false);
      if (!r.ok) { setErr(r.error || "That code didn't work. Check your email."); return; }
      onDone(email);
    } else {
      if (code.trim() !== sent) { setErr("That code doesn't match. Check the six digits above."); return; }
      onDone(email);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-soft font-sans">
      <div className="w-full max-w-[380px]">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-[13px] text-muted">
          <ArrowLeft size={14} /> Back
        </button>
        <Card>
          <div className="w-[30px] h-[30px] rounded-md bg-ink flex items-center justify-center mb-5">
            <ScanLine size={17} className="text-white" />
          </div>
          {step === "email" ? (
            <>
              <h2 className="text-[21px] font-semibold tracking-display text-ink">Sign in to Tapframe</h2>
              <p className="mt-1.5 mb-5 text-[13.5px] text-body leading-relaxed">
                We'll email you a six-digit code. No password to remember or lose.
              </p>
              <Field label="Email" htmlFor="auth-email">
                <Input id="auth-email" value={email} onChange={setEmail} placeholder="you@channel.com" autoFocus
                  invalid={!!err} onKeyDown={(e) => e.key === "Enter" && send()} />
              </Field>
              {err && <p className="mt-2 text-[12.5px] text-bad">{err}</p>}
              <div className="mt-5"><Btn full onClick={send} disabled={busy}>{busy ? <Spinner /> : null} Send code <ArrowRight size={14} /></Btn></div>
            </>
          ) : (
            <>
              <h2 className="text-[21px] font-semibold tracking-display text-ink">Enter your code</h2>
              <p className="mt-1.5 mb-4 text-[13.5px] text-body leading-relaxed">
                Sent to <span className="font-mono">{email}</span>. Check your inbox.
              </p>
              {!live && (
                <div className="rounded-lg p-3 mb-5 flex items-center justify-between bg-accent-soft">
                  <span className="text-xs text-accent">Demo build — your code is</span>
                  <span className="font-mono text-[17px] font-semibold text-accent tracking-[0.14em]">{sent}</span>
                </div>
              )}
              <Field label="Six-digit code" htmlFor="auth-code">
                <Input id="auth-code" value={code} onChange={setCode} placeholder="000000" mono autoFocus
                  invalid={!!err} onKeyDown={(e) => e.key === "Enter" && verify()} />
              </Field>
              {err && <p className="mt-2 text-[12.5px] text-bad">{err}</p>}
              <div className="mt-5"><Btn full onClick={verify} disabled={busy}>{busy ? <Spinner /> : null} Continue <ArrowRight size={14} /></Btn></div>
              <button onClick={() => { setStep("email"); setErr(""); }} className="w-full mt-3 text-[12.5px] text-muted">
                Use a different email
              </button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ── public page ─────────────────────────────────────────────────────────── */

function PublicPage({ campaign, channel, onClickLink, onLead, showBadge, width = 344 }) {
  const th = themeById(campaign.themeId || "paper");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const gate = campaign.emailCapture;

  const submit = async () => {
    if (!isEmail(email)) { setError("Enter a working email to get the file."); return; }
    setError(""); setBusy(true);
    const res = await onLead?.({ email, name });
    setBusy(false);
    if (res?.ok === false) {
      setError(
        res.reason === "rate_limited"
          ? `Too many submissions. Try again in ${Math.ceil((res.retryInMs || 2000) / 1000)}s.`
          : `This list is full (${res.cap} on the current plan).`
      );
      return;
    }
    setDone(true);
  };

  return (
    <div style={{ width, background: th.bg }} className="font-sans rounded-2xl overflow-hidden border border-line">
      <div className="px-5 pt-7 pb-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center mb-3 overflow-hidden text-[21px] font-semibold"
            style={{ background: th.btn, color: th.btnText }}>
            {channel.avatar
              ? <img src={channel.avatar} alt="" className="w-full h-full object-cover" />
              : (channel.name || "C").slice(0, 1).toUpperCase()}
          </div>
          <p className="text-[13px] font-mono" style={{ color: th.sub }}>{channel.handle || "@yourchannel"}</p>
          <h2 className="mt-2 text-[19px] font-semibold tracking-display leading-tight" style={{ color: th.text }}>
            {campaign.headline || campaign.title || "Untitled page"}
          </h2>
          {campaign.subhead && (
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: th.sub }}>{campaign.subhead}</p>
          )}
        </div>

        {gate?.enabled && (
          <div className="mt-6 rounded-xl p-4" style={{ background: th.card }}>
            {done ? (
              <div className="text-center py-2">
                <Check size={20} style={{ color: th.btn, margin: "0 auto" }} />
                <p className="mt-2 text-sm font-semibold" style={{ color: th.text }}>Check your inbox</p>
                <p className="mt-1 text-[12.5px]" style={{ color: th.sub }}>
                  {gate.magnetName || "Your file"} is on its way.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: th.text }}>
                  {gate.headline || "Get the free breakdown"}
                </p>
                {gate.sub && <p className="mt-1 text-[12.5px] leading-snug" style={{ color: th.sub }}>{gate.sub}</p>}
                <div className="mt-3 space-y-2">
                  {gate.askName && (
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name"
                      className="w-full outline-none rounded-lg px-3 py-2.5 text-[13.5px] border border-line bg-white text-ink" />
                  )}
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
                    type="email" inputMode="email"
                    className="w-full outline-none rounded-lg px-3 py-2.5 text-[13.5px] border border-line bg-white text-ink" />
                  {error && <p className="text-xs text-bad">{error}</p>}
                  <button onClick={submit} disabled={busy}
                    className="w-full rounded-lg py-2.5 font-medium text-[13.5px] flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: th.btn, color: th.btnText }}>
                    {busy && <Spinner />}
                    {gate.buttonText || "Send it to me"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {campaign.links.filter((l) => l.label).map((l) => {
            const Icon = LINK_KINDS[l.kind]?.icon || Link2;
            return (
              <button key={l.id} onClick={() => onClickLink?.(l)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: th.card, border: `1px solid ${th.bg === "#0E0E12" ? "#2A2A32" : "rgba(0,0,0,0.05)"}` }}>
                <Icon size={16} style={{ color: th.sub }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13.8px] font-semibold" style={{ color: th.text }}>{l.label}</p>
                  {l.note && <p className="truncate text-[11.5px]" style={{ color: th.sub }}>{l.note}</p>}
                </div>
                <ChevronRight size={15} style={{ color: th.sub }} />
              </button>
            );
          })}
          {campaign.links.filter((l) => l.label).length === 0 && !gate?.enabled && (
            <p className="text-center py-6 text-[12.5px]" style={{ color: th.sub }}>Add a link and it shows up here.</p>
          )}
        </div>

        {showBadge && <p className="text-center mt-7 text-[11px] font-mono" style={{ color: th.sub }}>made with tapframe</p>}
      </div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div className="rounded-3xl p-2.5 bg-ink w-[364px]">
      <div className="rounded-2xl overflow-hidden bg-white">{children}</div>
    </div>
  );
}

/* ── app shell ───────────────────────────────────────────────────────────── */

const NAV = [
  { id: "campaigns", label: "Video pages", icon: Layers },
  { id: "leads", label: "Leads", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "brand", label: "Brand presets", icon: Palette },
  { id: "channel", label: "Channel page", icon: User },
  { id: "pricing", label: "Plan", icon: CreditCard },
];

/* ── public route (what a scan resolves to) ──────────────────────────────── */

function PublicRoute({ slug, state, store }) {
  const live = store.backend === "supabase";
  const [status, setStatus] = useState(live ? "loading" : "ready");
  const [remote, setRemote] = useState(null);
  const recorded = useRef(false);

  // Local build: the page must already be in this browser's state.
  const localCampaign = state.campaigns.find((c) => c.slug === slug && !c.archived);

  useEffect(() => {
    let cancelled = false;
    if (live) {
      store.getPublicPage(slug).then((page) => {
        if (cancelled) return;
        if (!page) { setStatus("missing"); return; }
        setRemote(page);
        setStatus("ready");
        if (!recorded.current) { recorded.current = true; store.record("scan", page.id); }
      });
    } else if (localCampaign && !recorded.current) {
      recorded.current = true;
      store.record("scan", localCampaign.id);
    }
    return () => { cancelled = true; };
  }, [live, slug, store, localCampaign]);

  if (live && status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft text-muted font-mono text-[13px] gap-2">
        <Spinner /> loading
      </div>
    );
  }

  const campaign = live
    ? (remote && { ...remote, links: remote.links || [] })
    : localCampaign;
  const channel = live ? (remote?.channel || {}) : state.meta.channel;
  const missing = live ? status === "missing" : !localCampaign;

  if (missing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft font-sans px-6">
        <div className="text-center max-w-sm">
          <div className="w-11 h-11 rounded-xl bg-ink flex items-center justify-center mx-auto mb-4">
            <ScanLine size={22} className="text-white" />
          </div>
          <p className="text-[17px] font-semibold text-ink">This page isn't here</p>
          <p className="mt-2 text-[13.5px] text-body leading-relaxed">
            {live
              ? "This code doesn't match a live page. It may have been removed or the link is wrong."
              : "The code may be from another device, or the page was removed. Connect Supabase so pages resolve everywhere."}
          </p>
          <a href="/" className="inline-block mt-5 text-[13px] text-accent font-medium">Go to Tapframe →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-soft font-sans py-10 px-4">
      <div className="w-full max-w-[420px]">
        <PublicPage
          campaign={campaign}
          channel={channel}
          showBadge={!live || state.meta.plan === "free"}
          width="100%"
          onClickLink={(l) => {
            store.record("click", campaign.id, l.id);
            if (l.url) window.open(l.url, "_blank", "noopener");
          }}
          onLead={({ email, name }) =>
            live
              ? store.captureLeadPublic(slug, email, name)
              : store.addLead({ email, name, campaignId: campaign.id })
          }
        />
        <p className="text-center mt-4 text-[11px] text-muted font-mono">{displayUrl(slug)}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [state, store] = useStore();
  const [screen, setScreen] = useState("landing");
  const [nav, setNav] = useState("campaigns");
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState("");
  const booted = useRef(false);

  // A scanned QR lands on /p/:slug. That path renders the public page for
  // anyone, signed in or not — it's the thing the viewer actually sees.
  const publicSlug = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    store.load().then((s) => { if (!publicSlug && s.meta.user) setScreen("app"); });
    const flush = () => store.flush();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [store, publicSlug]);

  const flash = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2400);
  }, []);

  const signIn = (email) => {
    const handle = email.split("@")[0];
    // On Supabase, verifyCode already loaded the creator row. Only set a
    // default channel the first time (empty slug), and don't clobber the user.
    if (!state.meta.channel.slug) {
      store.setMeta({
        channel: { ...state.meta.channel, name: handle, handle: "@" + handle, slug: slugify(handle) },
      });
    }
    if (store.backend !== "supabase") {
      store.setMeta({ user: { email, joined: Date.now() } });
    }
    setScreen("app");
  };

  if (!state.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-muted text-[13px] font-mono gap-2">
        <Spinner /> loading
      </div>
    );
  }

  // Public page route — this is what a scan resolves to.
  if (publicSlug) return <PublicRoute slug={publicSlug} state={state} store={store} />;

  if (screen === "landing") return <Landing onStart={() => setScreen("auth")} />;
  if (screen === "auth") return <Auth onDone={signIn} onBack={() => setScreen("landing")} store={store} />;

  const open = state.campaigns.find((c) => c.id === openId);

  return (
    <div className="min-h-screen flex bg-soft font-sans">
      <aside className="hidden md:flex flex-col shrink-0 w-[232px] bg-white border-r border-line">
        <div className="px-5 py-5 flex items-center gap-2">
          <div className="w-[25px] h-[25px] rounded-md bg-ink flex items-center justify-center">
            <ScanLine size={14} className="text-white" />
          </div>
          <span className="text-[15.5px] font-semibold tracking-[-0.02em] text-ink">Tapframe</span>
        </div>
        <nav className="px-3 flex-1">
          {NAV.map((n) => {
            const active = nav === n.id;
            return (
              <button key={n.id} onClick={() => { setNav(n.id); setOpenId(null); }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 mb-0.5 text-left text-[13.5px]
                  ${active ? "bg-soft text-ink font-semibold" : "text-body hover:bg-soft"}`}>
                <n.icon size={15.5} className={active ? "text-accent" : "text-muted"} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <div className="rounded-lg px-3 py-2.5 mb-2 bg-soft">
            <p className="truncate text-xs text-body font-mono">{state.meta.user?.email}</p>
            <div className="mt-1.5"><Pill tone={state.meta.plan === "free" ? "neutral" : "accent"}>{state.meta.plan}</Pill></div>
          </div>
          <button onClick={async () => { if (store.signOut) await store.signOut(); else store.setMeta({ user: null }); setScreen("landing"); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-muted hover:text-ink">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-white border-t border-line">
        {NAV.slice(0, 5).map((n) => (
          <button key={n.id} onClick={() => { setNav(n.id); setOpenId(null); }}
            className="flex-1 flex flex-col items-center py-2.5 gap-1">
            <n.icon size={17} className={nav === n.id ? "text-accent" : "text-muted"} />
            <span className={`text-[9.5px] ${nav === n.id ? "text-ink" : "text-muted"}`}>{n.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-7">
          {state.writeError && (
            <div className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3 bg-red-50">
              <AlertTriangle size={15} className="text-bad shrink-0" />
              <p className="text-[13px] text-bad">{state.writeError}</p>
            </div>
          )}
          {open ? (
            <CampaignDetail campaign={open} state={state} store={store} flash={flash} onBack={() => setOpenId(null)} onUpgrade={() => { setOpenId(null); setNav("pricing"); }} />
          ) : (
            <>
              {nav === "campaigns" && <Campaigns state={state} store={store} onOpen={setOpenId} flash={flash} />}
              {nav === "leads" && <Leads state={state} store={store} flash={flash} />}
              {nav === "analytics" && <Analytics state={state} store={store} onUpgrade={() => setNav("pricing")} flash={flash} />}
              {nav === "brand" && <BrandPresets state={state} store={store} flash={flash} />}
              {nav === "channel" && <ChannelPageView state={state} store={store} />}
              {nav === "pricing" && (
                <div className="-mx-5 md:-mx-8">
                  <PricingGrid current={state.meta.plan}
                    onPick={(id) => { store.setMeta({ plan: id }); flash(`Switched to ${id}`); }} />
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed z-40 rounded-lg px-4 py-2.5 bg-ink text-white text-[13px] animate-fade-up"
          style={{ bottom: 22, left: "50%", transform: "translateX(-50%)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({ title, sub, right }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-display text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[13.5px] text-body">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── campaigns ───────────────────────────────────────────────────────────── */

function newCampaign(state, title) {
  const t = title || "";
  let slug = slugify(t) || "page-" + uid().slice(0, 5);
  const taken = new Set(state.campaigns.map((c) => c.slug));
  if (taken.has(slug)) slug += "-" + uid().slice(0, 3);
  return {
    id: uid(), title: t, videoUrl: "", slug, headline: "", subhead: "",
    themeId: state.meta.presets[0]?.themeId || "paper",
    campaignTag: "",
    links: [{ id: uid(), label: "", url: "", kind: "link", note: "" }],
    emailCapture: { enabled: false, headline: "Get the free breakdown", sub: "", magnetName: "", buttonText: "Send it to me", askName: false },
    createdAt: Date.now(), archived: false,
  };
}

function Campaigns({ state, store, onOpen, flash }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const tags = useMemo(
    () => ["all", ...Array.from(new Set(state.campaigns.map((c) => c.campaignTag).filter(Boolean)))],
    [state.campaigns]
  );

  const list = useMemo(() => state.campaigns
    .filter((c) => (showArchived ? c.archived : !c.archived))
    .filter((c) => (tag === "all" ? true : c.campaignTag === tag))
    .filter((c) => (c.title + c.slug).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt),
    [state.campaigns, showArchived, tag, q]);

  const create = () => {
    const c = newCampaign(state);
    store.addCampaign(c);
    onOpen(c.id);
  };

  return (
    <>
      <Header title="Video pages" sub="One page per upload. The QR on screen points here."
        right={<Btn onClick={create}><Plus size={14} /> New page</Btn>} />

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px] bg-white border border-line">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages"
            className="w-full outline-none text-[13.2px] text-ink" />
        </div>
        {tags.length > 1 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)}
            className="rounded-lg px-3 py-2 outline-none bg-white border border-line text-[13px] text-body">
            {tags.map((t) => <option key={t} value={t}>{t === "all" ? "All campaigns" : t}</option>)}
          </select>
        )}
        <Btn size="sm" variant={showArchived ? "quiet" : "ghost"} onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Showing archived" : "Archived"}
        </Btn>
      </div>

      {list.length === 0 ? (
        <Empty icon={QrCode}
          title={showArchived ? "Nothing archived" : "No pages yet"}
          body={showArchived
            ? "Pages you archive land here. They stop accepting scans but keep their data."
            : "Make a page for your next upload, drop the code in the corner of the frame, and watch where the traffic goes."}
          action={!showArchived && <Btn onClick={create}><Plus size={14} /> Create your first page</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((c) => {
            const t = campaignTotals(state.stats, c.id);
            const th = themeById(c.themeId);
            return (
              <button key={c.id} onClick={() => onOpen(c.id)}
                className="text-left rounded-xl p-4 bg-white border border-line transition-transform hover:-translate-y-0.5">
                <div className="flex gap-3.5">
                  <div className="rounded-lg p-1.5 shrink-0 border border-line" style={{ background: th.bg }}>
                    <QR text={`https://${BASE_URL}/${c.slug}`} size={54} quiet={1} fg={th.text} bg={th.bg} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.2px] font-semibold text-ink tracking-[-0.015em]">{c.title}</p>
                    <p className="truncate mt-0.5 text-[11.5px] text-muted font-mono">/{c.slug}</p>
                    <div className="flex gap-3 mt-2.5">
                      <Metric n={t.scans} l="scans" />
                      <Metric n={t.clicks} l="clicks" />
                      <Metric n={t.leads} l="leads" />
                    </div>
                  </div>
                </div>
                {c.campaignTag && <div className="mt-3"><Pill>{c.campaignTag}</Pill></div>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n));

function Metric({ n, l }) {
  return (
    <div>
      <span className="font-mono nums text-[13.5px] font-semibold text-ink">{fmt(n)}</span>
      <span className="text-[10.5px] text-muted ml-1">{l}</span>
    </div>
  );
}

/* ── campaign detail ─────────────────────────────────────────────────────── */

function StepBar({ tab, setTab, tabs }) {
  const idx = tabs.findIndex((t) => t.id === tab);
  const prev = tabs[idx - 1];
  const next = tabs[idx + 1];
  const NEXT_LABEL = {
    design: "Next: design your page",
    qr: "Next: get your QR code",
    stats: "Next: see performance",
  };
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {prev ? (
        <Btn variant="ghost" onClick={() => setTab(prev.id)}>
          <ArrowLeft size={14} /> Back
        </Btn>
      ) : <span />}
      {next && (
        <Btn variant="accent" onClick={() => setTab(next.id)}>
          {NEXT_LABEL[next.id] || "Next"} <ArrowRight size={14} />
        </Btn>
      )}
    </div>
  );
}

function CampaignDetail({ campaign, state, store, flash, onBack, onUpgrade }) {
  const [tab, setTab] = useState("page");
  const update = (patch) => store.updateCampaign(campaign.id, patch);
  const url = publicUrl(campaign.slug); // real, resolvable — this is what the QR encodes

  const TABS = [
    { id: "page", label: "Page" }, { id: "design", label: "Design" },
    { id: "qr", label: "QR code" }, { id: "stats", label: "Performance" },
  ];

  return (
    <>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-4 text-[13px] text-muted hover:text-ink">
        <ArrowLeft size={14} /> All pages
      </button>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0 flex-1">
          <input value={campaign.title}
            aria-label="Page title"
            placeholder="Name this page (e.g. My pricing video)"
            onChange={(e) => {
              const t = e.target.value;
              const patch = { title: t };
              // Headline mirrors the title until the creator edits it directly.
              if (campaign.headline === campaign.title || !campaign.headline) patch.headline = t;
              // Slug tracks the title too, unless it's been hand-customized.
              if (!campaign.slugCustom) {
                let s = slugify(t) || "page-" + campaign.id.slice(0, 5);
                const clash = state.campaigns.some((c) => c.id !== campaign.id && c.slug === s);
                patch.slug = clash ? s + "-" + campaign.id.slice(0, 3) : s;
              }
              update(patch);
            }}
            className="outline-none bg-transparent w-full text-2xl font-semibold tracking-display text-ink placeholder:text-muted placeholder:font-normal" />
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] text-muted font-mono">{displayUrl(campaign.slug)}</span>
            <span className="text-[11px] text-muted">→ scans go to your live page</span>
          </div>
        </div>
        <div className="flex gap-2">
          <CopyBtn text={url} size="md" />
          <Btn variant="ghost" onClick={() => {
            store.addCampaign({ ...campaign, id: uid(), title: campaign.title + " (copy)",
              slug: campaign.slug + "-" + uid().slice(0, 3), createdAt: Date.now() });
            flash("Duplicated");
          }}><Copy size={13} /> Duplicate</Btn>
          <Btn variant="ghost" onClick={() => update({ archived: !campaign.archived })}>
            {campaign.archived ? "Restore" : "Archive"}
          </Btn>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-line">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-[13.5px] -mb-px border-b-2 ${
              tab === t.id ? "font-semibold text-ink border-accent" : "text-muted border-transparent hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_364px] gap-8 items-start">
        <div>
          {tab === "page" && <PageTab campaign={campaign} update={update} state={state} flash={flash} onUpgrade={onUpgrade} />}
          {tab === "design" && <DesignTab campaign={campaign} update={update} state={state} />}
          {tab === "qr" && <QRTab campaign={campaign} url={url} state={state} />}
          {tab === "stats" && <CampaignStats campaign={campaign} state={state} store={store} onUpgrade={onUpgrade} />}

          <StepBar tab={tab} setTab={setTab} tabs={TABS} />

          <div className="mt-8 pt-5 border-t border-line">
            <Btn variant="danger" size="sm" onClick={() => { store.removeCampaign(campaign.id); onBack(); flash("Page deleted"); }}>
              <Trash2 size={13} /> Delete this page
            </Btn>
          </div>
        </div>

        <div className="hidden lg:block sticky top-6">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
            <Eye size={13} /> Live preview
          </p>
          <PhoneFrame>
            <PublicPage campaign={campaign} channel={state.meta.channel}
              showBadge={state.meta.plan === "free"}
              onClickLink={(l) => store.record("click", campaign.id, l.id)}
              onLead={({ email, name }) => store.addLead({ email, name, campaignId: campaign.id })} />
          </PhoneFrame>
          <p className="mt-2.5 text-[11.5px] text-muted leading-snug">
            This preview is live. Clicking a link or submitting the form records real events you'll see under Performance.
          </p>
        </div>
      </div>
    </>
  );
}

function PageTab({ campaign, update, state, flash, onUpgrade }) {
  const limits = limitsFor(state.meta.plan);
  const atLinkLimit = campaign.links.length >= limits.linksPerPage;
  const setLink = (id, patch) => update({ links: campaign.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const move = (idx, dir) => {
    const arr = [...campaign.links];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    update({ links: arr });
  };
  const slugTaken = state.campaigns.some((c) => c.id !== campaign.id && c.slug === campaign.slug);
  const vid = youtubeId(campaign.videoUrl);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>What people see</SectionTitle>
        <div className="space-y-4 mt-4">
          <Field label="Headline" hint="Match the moment in the video">
            <Input value={campaign.headline} onChange={(v) => update({ headline: v })} placeholder="The spreadsheet from this video" />
          </Field>
          <Field label="Sub-line" hint="Optional">
            <Input value={campaign.subhead} onChange={(v) => update({ subhead: v })} placeholder="Free. No signup for the first two." />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>Links</SectionTitle>
          {atLinkLimit ? (
            <Btn size="sm" variant="accent" onClick={onUpgrade}>
              <Lock size={12} /> Add more links — Pro
            </Btn>
          ) : (
            <Btn size="sm" variant="ghost" onClick={() => update({ links: [...campaign.links, { id: uid(), label: "", url: "", kind: "link", note: "" }] })}>
              <Plus size={13} /> Add
            </Btn>
          )}
        </div>
        {atLinkLimit && (
          <div className="rounded-lg px-3.5 py-2.5 mt-3 flex items-center gap-2.5 bg-accent-soft">
            <Lock size={13} className="text-accent shrink-0" />
            <p className="text-[12.5px] text-accent">Free pages have one link. Pro unlocks unlimited links per page.</p>
          </div>
        )}
        <div className="space-y-3 mt-4">
          {campaign.links.map((l, i) => (
            <div key={l.id} className="rounded-lg p-3.5 bg-soft">
              <div className="flex gap-2 items-center mb-2.5">
                <select value={l.kind} onChange={(e) => setLink(l.id, { kind: e.target.value })}
                  aria-label="Link type"
                  className="rounded-md px-2 py-1.5 outline-none bg-white border border-line text-[12.5px] text-body">
                  {Object.entries(LINK_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div className="flex-1" />
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                  className={`px-1.5 text-[13px] ${i === 0 ? "text-line" : "text-muted hover:text-ink"}`}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === campaign.links.length - 1} aria-label="Move down"
                  className={`px-1.5 text-[13px] ${i === campaign.links.length - 1 ? "text-line" : "text-muted hover:text-ink"}`}>↓</button>
                <button onClick={() => update({ links: campaign.links.filter((x) => x.id !== l.id) })} aria-label="Remove link" className="px-1.5">
                  <Trash2 size={13} className="text-muted hover:text-bad" />
                </button>
              </div>
              <div className="space-y-2">
                <Input value={l.label} onChange={(v) => setLink(l.id, { label: v })} placeholder="Button text — e.g. Download the template" />
                <Input value={l.url} onChange={(v) => setLink(l.id, { url: v })} placeholder="https://" mono />
                <Input value={l.note} onChange={(v) => setLink(l.id, { note: v })} placeholder="Small note under the button (optional)" />
              </div>
            </div>
          ))}
          {campaign.links.length === 0 && <p className="text-[13px] text-muted">No links yet. Add one and it appears in the preview.</p>}
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionTitle>Email capture</SectionTitle>
            <p className="mt-1 text-[12.8px] text-muted leading-snug">
              Ask for an address before you hand over the file. Leads land in your list.
            </p>
          </div>
          <Toggle label="Enable email capture" on={campaign.emailCapture.enabled}
            onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, enabled: v } })} />
        </div>
        {campaign.emailCapture.enabled && (
          <div className="space-y-3.5 mt-5">
            <Field label="Offer headline">
              <Input value={campaign.emailCapture.headline}
                onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, headline: v } })} />
            </Field>
            <Field label="Supporting line" hint="Optional">
              <Input value={campaign.emailCapture.sub}
                onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, sub: v } })}
                placeholder="The exact sheet I used on screen." />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="What they get">
                <Input value={campaign.emailCapture.magnetName}
                  onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, magnetName: v } })}
                  placeholder="Pricing template" />
              </Field>
              <Field label="Button text">
                <Input value={campaign.emailCapture.buttonText}
                  onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, buttonText: v } })} />
              </Field>
            </div>
            <div className="flex items-center gap-2.5">
              <Toggle small label="Ask for first name" on={campaign.emailCapture.askName}
                onChange={(v) => update({ emailCapture: { ...campaign.emailCapture, askName: v } })} />
              <span className="text-[13px] text-body">Also ask for a first name</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Address and tagging</SectionTitle>
        <div className="space-y-4 mt-4">
          <Field label="Page URL" hint="This is where your QR sends people">
            <Input value={campaign.slug} invalid={slugTaken}
              onChange={(v) => update({ slug: slugify(v), slugCustom: true })}
              prefix={BASE_URL + "/"} mono />
          </Field>
          {slugTaken
            ? <p className="-mt-2 text-xs text-bad">Another page already uses this address.</p>
            : <p className="-mt-2 text-xs text-muted">Edit this any time. Your QR code updates to match.</p>}

          <Field label="YouTube video" hint="Optional — keeps the page tied to the upload">
            <Input value={campaign.videoUrl} onChange={(v) => update({ videoUrl: v })}
              placeholder="https://youtube.com/watch?v=..." mono />
          </Field>
          {vid && (
            <div className="flex items-center gap-2">
              <Pill tone="good"><Check size={11} /> linked</Pill>
              <span className="text-xs text-muted font-mono">{vid}</span>
            </div>
          )}

          <Field label="Campaign" hint="Group pages that belong to one push">
            <Input value={campaign.campaignTag} onChange={(v) => update({ campaignTag: v })} placeholder="Q3 launch" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

function DesignTab({ campaign, update, state }) {
  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Theme</SectionTitle>
        <p className="mt-1 mb-4 text-[12.8px] text-muted">Pick a look for this page. It changes the preview instantly.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => update({ themeId: t.id })}
              className={`rounded-lg p-3 text-left border-2 ${campaign.themeId === t.id ? "border-accent" : "border-line"}`}
              style={{ background: t.bg }}>
              <div className="flex gap-1 mb-2.5">
                <span className="w-3.5 h-3.5 rounded" style={{ background: t.btn }} />
                <span className="w-3.5 h-3.5 rounded border border-black/5" style={{ background: t.card }} />
              </div>
              <span className="text-xs font-semibold" style={{ color: t.text }}>{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {state.meta.presets.length > 0 && (
        <Card>
          <SectionTitle>Apply a brand preset</SectionTitle>
          <p className="mt-1 mb-4 text-[12.8px] text-muted">Saved looks from your brand kit.</p>
          <div className="flex flex-wrap gap-2">
            {state.meta.presets.map((p) => (
              <button key={p.id} onClick={() => update({ themeId: p.themeId })}
                className="rounded-lg px-3 py-2 flex items-center gap-2 bg-white border border-line hover:border-accent">
                <span className="w-3 h-3 rounded-sm" style={{ background: themeById(p.themeId).btn }} />
                <span className="text-[12.8px] text-body">{p.name}</span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function QRTab({ campaign, url, state }) {
  const [dark, setDark] = useState("#0E0E12");
  const [light, setLight] = useState("#FFFFFF");
  const [withBadge, setWithBadge] = useState(false);
  const [scanLabel, setScanLabel] = useState(true);
  const SWATCH = ["#0E0E12", "#4E2BE8", "#0A8A5F", "#B42318", "#1E3A5F", "#D9600B"];

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle>Your code</SectionTitle>
        <p className="mt-1 mb-5 text-[12.8px] text-muted leading-snug">
          Drop this in a corner of the frame. Keep it on screen at least eight seconds, which is roughly how long it takes
          someone to reach for a phone.
        </p>
        <div className="flex flex-wrap gap-6 items-start">
          <div className="rounded-xl p-4 border border-line flex flex-col items-center" style={{ background: light }}>
            {scanLabel && (
              <div className="flex items-center gap-1.5 mb-2.5" style={{ color: dark }}>
                <ScanLine size={15} />
                <span className="font-semibold tracking-[0.04em] text-[13px] uppercase">Scan here</span>
              </div>
            )}
            <QR text={url} size={188} fg={dark} bg={light} badge={withBadge ? (state.meta.channel.name || "T") : null} />
          </div>
          <div className="flex-1 min-w-[220px] space-y-4">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted mb-2">Code colour</p>
              <div className="flex gap-2">
                {SWATCH.map((c) => (
                  <button key={c} onClick={() => setDark(c)} aria-label={"Colour " + c}
                    className={`w-[26px] h-[26px] rounded-md border ${dark === c ? "border-2 border-accent" : "border-line"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted mb-2">Background</p>
              <div className="flex gap-2">
                {["#FFFFFF", "#F7F7F9", "#F0EBFF", "#FFF6EF"].map((c) => (
                  <button key={c} onClick={() => setLight(c)} aria-label={"Background " + c}
                    className={`w-[26px] h-[26px] rounded-md border ${light === c ? "border-2 border-accent" : "border-line"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Toggle small label="Show Scan Here label" on={scanLabel} onChange={setScanLabel} />
              <span className="text-[13px] text-body">Add a "Scan here" label</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Toggle small label="Add initial badge" on={withBadge} onChange={setWithBadge} />
              <span className="text-[13px] text-body">Put your initial in the middle</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn onClick={() => downloadQRPng(url, dark, light, campaign.slug, 16, { scanLabel, badge: withBadge ? (state.meta.channel.name || "T") : null })}>
                <Download size={13} /> Download PNG
              </Btn>
              <CopyBtn text={url} size="md" />
            </div>
            <p className="text-[11.8px] text-muted leading-snug">
              Downloads at 16x so it stays sharp when a 1080p export scales it up.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Where to put it</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {[
            { h: "Corner overlay", p: "Bottom-right, about 12% of frame height. Stays up while you talk through the offer." },
            { h: "End screen", p: "Full-size beside your subscribe button. Highest scan rate of any placement." },
            { h: "Pinned comment", p: "Also paste the plain URL. Phone viewers can't scan their own screen." },
          ].map((x) => (
            <div key={x.h} className="rounded-lg p-3.5 bg-soft">
              <p className="text-[13.2px] font-semibold text-ink">{x.h}</p>
              <p className="mt-1 text-[12.3px] text-body leading-snug">{x.p}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── analytics ───────────────────────────────────────────────────────────── */

function ChartSkeleton({ height }) {
  return <div className="rounded-lg skeleton animate-shimmer" style={{ height }} />;
}

function CampaignStats({ campaign, state, store, onUpgrade }) {
  const days = useMemo(() => lastNDays(14), []);
  const data = useMemo(() => series(state.stats, days, campaign.id), [state.stats, days, campaign.id]);
  const t = campaignTotals(state.stats, campaign.id);
  const conv = pct(t.leads, t.scans);

  const perLink = useMemo(() => campaign.links.filter((l) => l.label)
    .map((l) => ({ name: l.label.slice(0, 22), clicks: state.stats.byLink[l.id] || 0 }))
    .sort((a, b) => b.clicks - a.clicks), [campaign.links, state.stats.byLink]);
  const max = Math.max(...perLink.map((x) => x.clicks), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Scans" value={fmt(t.scans)} icon={ScanLine} />
        <Stat label="Clicks" value={fmt(t.clicks)} icon={MousePointerClick} />
        <Stat label="Leads" value={fmt(t.leads)} icon={Mail} />
        <Stat label="Scan → lead" value={conv === null ? "—" : conv + "%"} icon={TrendingUp} />
      </div>

      <Card>
        <SectionTitle>Last 14 days</SectionTitle>
        <div className="mt-4">
          <Suspense fallback={<ChartSkeleton height={190} />}>
            <Charts.Traffic data={data} height={190} interval={2} showClicks={false} gradientId="gCampaign" />
          </Suspense>
        </div>
      </Card>

      <Card>
        <SectionTitle>Clicks by link</SectionTitle>
        {perLink.length === 0 || perLink.every((p) => p.clicks === 0) ? (
          <p className="mt-3 text-[13px] text-muted">No clicks yet. Try the preview on the right, it records real events.</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {perLink.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12.8px] text-body">{p.name}</span>
                  <span className="text-[12.5px] font-mono nums text-ink">{p.clicks}</span>
                </div>
                <div className="rounded-full h-[5px] bg-soft">
                  <div className="rounded-full h-[5px] bg-accent" style={{ width: `${(p.clicks / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Analytics({ state, store, onUpgrade, flash }) {
  const [range, setRange] = useState(14);
  const days = useMemo(() => lastNDays(range), [range]);
  const data = useMemo(() => series(state.stats, days), [state.stats, days]);
  const win = useMemo(() => windowTotals(state.stats, days), [state.stats, days]);
  const isPro = limitsFor(state.meta.plan).advanced;
  const canSeeAnalytics = limitsFor(state.meta.plan).analytics;
  const hasTraffic = state.stats.totals.scans + state.stats.totals.clicks + state.stats.totals.leads > 0;

  const byCampaign = useMemo(() => state.campaigns.map((c) => {
    const t = campaignTotals(state.stats, c.id);
    return { id: c.id, name: c.title.slice(0, 20), ...t };
  }).sort((a, b) => b.scans - a.scans).slice(0, 12), [state.campaigns, state.stats]);

  const seed = async () => {
    let campaigns = state.campaigns;
    if (campaigns.length === 0) {
      const demos = [
        { t: "The Lagos fintech teardown", tag: "Q3 series", magnet: "Unit economics sheet" },
        { t: "How I priced my first deal", tag: "Q3 series", magnet: "Pricing calculator" },
        { t: "50 cold emails, line by line", tag: "Outreach", magnet: "Swipe file" },
      ];
      campaigns = demos.map((d) => {
        const c = newCampaign({ campaigns: [], meta: state.meta }, d.t);
        c.campaignTag = d.tag;
        c.emailCapture = { ...c.emailCapture, enabled: true, magnetName: d.magnet, headline: "Get the " + d.magnet.toLowerCase() };
        c.links = [
          { id: uid(), label: "Watch the follow-up", url: "https://youtube.com", kind: "link", note: "12 min" },
          { id: uid(), label: "Join the community", url: "https://discord.gg", kind: "community", note: "Free" },
        ];
        return c;
      });
      store.setCampaigns(campaigns);
    }

    const now = Date.now();
    const leads = [];
    const res = store.applyBulkStats((s) => {
      campaigns.forEach((c, ci) => {
        for (let d = 29; d >= 0; d--) {
          const ts = now - d * 864e5;
          const scans = Math.max(0, Math.round((14 - Math.abs(d - 8)) * (1.4 - ci * 0.3) + Math.random() * 5));
          if (!scans) continue;
          const clicks = Math.round(scans * 0.46);
          const lds = Math.round(scans * 0.19);
          applyEvent(s, { type: "scan", campaignId: c.id, ts, count: scans });
          if (clicks) {
            applyEvent(s, { type: "click", campaignId: c.id, linkId: c.links[0]?.id, ts, count: Math.ceil(clicks / 2) });
            applyEvent(s, { type: "click", campaignId: c.id, linkId: c.links[1]?.id, ts, count: Math.floor(clicks / 2) });
          }
          if (lds) {
            applyEvent(s, { type: "lead", campaignId: c.id, ts, count: lds });
            for (let i = 0; i < lds; i++) {
              leads.push({ id: uid(), email: `viewer${Math.floor(Math.random() * 899999 + 100000)}@gmail.com`,
                name: "", campaignId: c.id, ts: ts + i * 1000 });
            }
          }
        }
      });
    });

    if (!res.ok) { flash("Slow down a moment, then try again"); return; }
    const { added, skipped } = await store.bulkAddLeads(leads);
    flash(skipped
      ? `Added ${added} sample leads. ${skipped.toLocaleString()} skipped — free plan stores ${PLAN_LIMITS.free.leads}.`
      : `Added ${added.toLocaleString()} sample leads`);
  };

  if (!canSeeAnalytics) {
    return (
      <>
        <Header title="Analytics" sub="Which upload actually earns." />
        <div className="rounded-xl border border-line bg-white p-8 text-center max-w-lg mx-auto mt-6">
          <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center mx-auto">
            <BarChart3 size={22} className="text-accent" />
          </div>
          <p className="mt-4 text-[18px] font-semibold text-ink tracking-display">Analytics is a Pro feature</p>
          <p className="mt-2 text-[13.5px] text-body leading-relaxed max-w-sm mx-auto">
            See which video drives the most scans, how many turn into clicks and leads, and
            the conversion rate per upload. Your scans are already being counted — upgrade to see them.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Btn variant="accent" onClick={onUpgrade}>Upgrade to Pro — $9.99/mo</Btn>
          </div>
          <p className="mt-3 text-[11.5px] text-muted">Every page still shows its own scan, click and lead counts for free.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Analytics" sub="Which upload actually earns."
        right={<div className="flex gap-2">{[7, 14, 30].map((r) => (
          <Btn key={r} size="sm" variant={range === r ? "quiet" : "ghost"} onClick={() => setRange(r)}>{r}d</Btn>
        ))}</div>} />

      {!hasTraffic ? (
        store.backend === "supabase" ? (
          <Empty icon={BarChart3} title="No traffic yet"
            body="Put a QR code in a video. As people scan it, your scans, clicks and leads show up here in real time." />
        ) : (
          <Empty icon={BarChart3} title="No traffic yet"
            body="Once codes go out, scans and clicks show up here. Want to see the shape of it first? Load a month of sample traffic."
            action={<Btn onClick={seed}><Sparkles size={14} /> Load sample data</Btn>} />
        )
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={`Scans · ${range}d`} value={fmt(win.scans)} icon={ScanLine} />
            <Stat label={`Clicks · ${range}d`} value={fmt(win.clicks)} icon={MousePointerClick} />
            <Stat label={`Leads · ${range}d`} value={fmt(win.leads)} icon={Mail} />
            <Stat label="Scan → lead" value={pct(win.leads, win.scans) === null ? "—" : pct(win.leads, win.scans) + "%"} icon={TrendingUp} />
          </div>

          <Card>
            <SectionTitle>Traffic</SectionTitle>
            <div className="mt-4">
              <Suspense fallback={<ChartSkeleton height={220} />}>
                <Charts.Traffic data={data} height={220} interval={Math.max(1, Math.floor(range / 7))} gradientId="gAll" />
              </Suspense>
            </div>
            <div className="flex gap-4 mt-3">
              {[["Scans", "#4E2BE8"], ["Clicks", "#9CA3AF"], ["Leads", "#0A8A5F"]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <span className="w-2.5 h-[2.5px] rounded" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>By video</SectionTitle>
            {state.campaigns.length > 12 && (
              <p className="mt-1 text-xs text-muted">Showing your top 12 pages by scans.</p>
            )}
            <div className="mt-4">
              <Suspense fallback={<ChartSkeleton height={Math.max(140, byCampaign.length * 44)} />}>
                <Charts.Bars data={byCampaign} />
              </Suspense>
            </div>
          </Card>

          <div className="relative">
            <Card>
              <div className="flex items-center justify-between">
                <SectionTitle>Funnel and conversion by video</SectionTitle>
                {!isPro && <Pill tone="accent"><Lock size={10} /> Pro</Pill>}
              </div>
              <div className={`mt-4 ${isPro ? "" : "blur-[5px] select-none pointer-events-none"}`} aria-hidden={!isPro}>
                <div className="grid sm:grid-cols-3 gap-3 mb-5">
                  {[["Scan → click", pct(win.clicks, win.scans)],
                    ["Click → lead", pct(win.leads, win.clicks)],
                    ["Overall", pct(win.leads, win.scans)]].map(([l, v]) => (
                    <div key={l} className="rounded-lg p-4 bg-soft">
                      <p className="text-[11.5px] text-muted uppercase tracking-[0.04em] font-semibold">{l}</p>
                      <p className="mt-2 font-mono nums text-2xl font-semibold text-ink">{v === null ? "—" : v + "%"}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        {["Video", "Scans", "Clicks", "Leads", "Conv."].map((h) => (
                          <th key={h} className="text-left pb-2 text-[11px] text-muted font-semibold uppercase tracking-[0.04em]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byCampaign.map((c) => {
                        const conv = pct(c.leads, c.scans);
                        return (
                          <tr key={c.id} className="border-b border-soft">
                            <td className="py-2.5 text-[12.8px] text-ink">{c.name}</td>
                            <td className="text-[12.5px] font-mono nums text-body">{c.scans}</td>
                            <td className="text-[12.5px] font-mono nums text-body">{c.clicks}</td>
                            <td className="text-[12.5px] font-mono nums text-body">{c.leads}</td>
                            <td className={`text-[12.5px] font-mono nums ${conv !== null && conv > 15 ? "text-good" : "text-body"}`}>
                              {conv === null ? "—" : conv + "%"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
            {!isPro && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-xl px-5 py-4 text-center bg-white border border-line shadow-lg">
                  <Lock size={16} className="text-accent mx-auto" />
                  <p className="mt-2 text-[13.5px] font-semibold text-ink">Funnel view is on Pro</p>
                  <p className="mt-1 mb-3 text-[12.5px] text-muted max-w-[240px]">
                    See conversion per video, so you know which format to make more of.
                  </p>
                  <Btn size="sm" variant="accent" onClick={onUpgrade}>See Pro</Btn>
                </div>
              </div>
            )}
          </div>

          {store.backend !== "supabase" && (
            <div className="flex justify-end">
              <Btn size="sm" variant="ghost" onClick={seed}><Sparkles size={13} /> Add more sample traffic</Btn>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ── leads ───────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 50;

function Leads({ state, store, flash }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [camp, setCamp] = useState("all");
  const [searchInfo, setSearchInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const searching = q.trim() !== "" || camp !== "all";

  // Reset to the first page whenever the filter changes.
  useEffect(() => { setPage(0); }, [q, camp]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      if (searching) {
        const r = await store.searchLeads({ query: q, campaignId: camp, limit: 200 });
        if (cancelled) return;
        setRows(r.rows);
        setSearchInfo(r);
        setTotal(r.rows.length);
        setPages(1);
      } else {
        const r = await store.getLeadPage({ page, pageSize: PAGE_SIZE });
        if (cancelled) return;
        setRows(r.rows);
        setSearchInfo(null);
        setTotal(r.total);
        setPages(r.pages);
      }
      setLoading(false);
    };
    const t = setTimeout(run, searching ? 220 : 0); // debounce typing
    return () => { cancelled = true; clearTimeout(t); };
  }, [store, page, q, camp, searching, state.leadIndex.count]);

  const nameOf = useCallback(
    (id) => state.campaigns.find((c) => c.id === id)?.title || "—",
    [state.campaigns]
  );

  const exportCsv = async () => {
    setExporting(true);
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const parts = ["email,name,video_page,page_url,captured_at\n"];
    await store.streamLeads((chunk) => {
      for (const l of chunk) {
        const c = state.campaigns.find((x) => x.id === l.campaignId);
        parts.push([
          esc(l.email), esc(l.name || ""), esc(c?.title || ""),
          esc(c ? publicUrl(c.slug) : ""), esc(new Date(l.ts).toISOString()),
        ].join(",") + "\n");
      }
    });
    downloadBlob(parts.join(""), `tapframe-leads-${dayKey(Date.now())}.csv`);
    setExporting(false);
    flash(`Exported ${state.leadIndex.count.toLocaleString()} leads`);
  };

  if (state.leadIndex.count === 0) {
    return (
      <>
        <Header title="Leads" sub="Everyone who traded an email for something you made." />
        <Empty icon={Mail} title="No leads yet"
          body="Turn on email capture inside a video page. Anyone who fills it in shows up here, and the list stays exportable." />
      </>
    );
  }

  return (
    <>
      <Header title="Leads" sub="Everyone who traded an email for something you made."
        right={<Btn onClick={exportCsv} disabled={exporting}>
          {exporting ? <Spinner /> : <Download size={14} />}
          {exporting ? "Exporting" : "Export CSV"}
        </Btn>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px] bg-white border border-line">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails"
            className="w-full outline-none text-[13.2px] text-ink" />
          {loading && searching && <Spinner />}
        </div>
        <select value={camp} onChange={(e) => setCamp(e.target.value)} aria-label="Filter by page"
          className="rounded-lg px-3 py-2 outline-none bg-white border border-line text-[13px] text-body">
          <option value="all">All pages</option>
          {state.campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {searchInfo && !searchInfo.complete && (
        <p className="mb-3 text-xs text-muted">
          Searched the {searchInfo.scannedShards * 500} most recent of {state.leadIndex.count.toLocaleString()} leads.
          Narrow the filter or export the full list to search everything.
        </p>
      )}

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                {["Email", "Name", "From page", "When", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] text-muted font-semibold uppercase tracking-[0.04em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-soft">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 rounded skeleton animate-shimmer" />
                    </td>
                  </tr>
                ))
              )}
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-soft hover:bg-soft/60">
                  <td className="px-4 py-3 text-[13px] font-mono text-ink">{l.email}</td>
                  <td className="px-4 py-3 text-[13px] text-body">{l.name || "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-body">{nameOf(l.campaignId)}</td>
                  <td className="px-4 py-3 text-[12.5px] text-muted font-mono nums">{new Date(l.ts).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => store.deleteLead(l.id)} aria-label="Delete lead">
                      <Trash2 size={13} className="text-muted hover:text-bad" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted">Nothing matches that filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted font-mono nums">
            {searching
              ? `${rows.length} match${rows.length === 1 ? "" : "es"}`
              : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          {!searching && pages > 1 && (
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Btn>
              <span className="text-xs text-muted font-mono nums">{page + 1} / {pages.toLocaleString()}</span>
              <Btn size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Btn>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

/* ── brand presets ───────────────────────────────────────────────────────── */

function BrandPresets({ state, store, flash }) {
  const [name, setName] = useState("");
  const [themeId, setThemeId] = useState("paper");
  const presets = state.meta.presets;

  const add = () => {
    if (!name.trim()) { flash("Give the preset a name"); return; }
    store.setMeta({ presets: [...presets, { id: uid(), name: name.trim(), themeId }] });
    setName("");
    flash("Preset saved");
  };

  return (
    <>
      <Header title="Brand presets" sub="Save a look once, apply it to every page you make after." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <SectionTitle>New preset</SectionTitle>
          <div className="mt-4 space-y-4">
            <Field label="Name"><Input value={name} onChange={setName} placeholder="Main channel" /></Field>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted mb-2">Look</p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => setThemeId(t.id)}
                    className={`rounded-lg p-2.5 text-left border-2 ${themeId === t.id ? "border-accent" : "border-line"}`}
                    style={{ background: t.bg }}>
                    <span className="block w-3 h-3 rounded-sm mb-1.5" style={{ background: t.btn }} />
                    <span className="text-[11.5px] font-semibold" style={{ color: t.text }}>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Btn full onClick={add}><Plus size={14} /> Save preset</Btn>
          </div>
        </Card>

        <div>
          {presets.length === 0 ? (
            <Empty icon={Palette} title="No presets saved" body="Presets keep your pages looking like one channel instead of six." />
          ) : (
            <div className="space-y-3">
              {presets.map((p) => {
                const t = themeById(p.themeId);
                return (
                  <Card key={p.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-[38px] h-[38px] rounded-lg border border-line flex items-center justify-center" style={{ background: t.bg }}>
                          <span className="w-[15px] h-[15px] rounded" style={{ background: t.btn }} />
                        </div>
                        <div>
                          <p className="text-[13.8px] font-semibold text-ink">{p.name}</p>
                          <p className="text-[11.5px] text-muted font-mono">{t.name.toLowerCase()}</p>
                        </div>
                      </div>
                      <button aria-label="Delete preset"
                        onClick={() => store.setMeta({ presets: presets.filter((x) => x.id !== p.id) })}>
                        <Trash2 size={14} className="text-muted hover:text-bad" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── channel page ────────────────────────────────────────────────────────── */

function AvatarUpload({ value, onChange, name }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = () => inputRef.current?.click();

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    setErr(""); setBusy(true);
    try {
      // Downscale to 256px and re-encode. A raw phone photo is several MB;
      // this keeps the stored avatar well under the storage value limit.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const size = 256;
            const canvas = document.createElement("canvas");
            canvas.width = size; canvas.height = size;
            const ctx = canvas.getContext("2d");
            const scale = Math.max(size / img.width, size / img.height);
            const w = img.width * scale, h = img.height * scale;
            ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onChange(dataUrl);
    } catch {
      setErr("Couldn't read that image. Try another.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden border border-line bg-soft flex items-center justify-center shrink-0">
        {value
          ? <img src={value} alt="" className="w-full h-full object-cover" />
          : <span className="text-[22px] font-semibold text-muted">{(name || "C").slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="flex-1">
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={pick} disabled={busy}>
            {busy ? <Spinner /> : <User size={13} />} {value ? "Replace" : "Upload photo"}
          </Btn>
          {value && (
            <Btn size="sm" variant="ghost" onClick={() => onChange("")}>
              <Trash2 size={13} /> Remove
            </Btn>
          )}
        </div>
        {err
          ? <p className="mt-1.5 text-xs text-bad">{err}</p>
          : <p className="mt-1.5 text-[11.5px] text-muted">JPG or PNG. Resized to 256px automatically.</p>}
      </div>
    </div>
  );
}

function ChannelPageView({ state, store }) {
  const ch = state.meta.channel;
  const set = (patch) => store.setMeta({ channel: { ...ch, ...patch } });
  const url = `https://${BASE_URL}/${ch.slug || "yourchannel"}`;
  const live = state.campaigns.filter((c) => !c.archived);
  const th = themeById(ch.themeId);

  return (
    <>
      <Header title="Channel page" sub="One address that always points to everything you've got running."
        right={<CopyBtn text={url} size="md" />} />

      <div className="grid lg:grid-cols-[1fr_364px] gap-8 items-start">
        <div className="space-y-5">
          <Card>
            <SectionTitle>Details</SectionTitle>
            <div className="mt-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Channel name"><Input value={ch.name} onChange={(v) => set({ name: v })} placeholder="Busayo builds" /></Field>
                <Field label="Handle"><Input value={ch.handle} onChange={(v) => set({ handle: v })} placeholder="@busayobuilds" mono /></Field>
              </div>
              <Field label="Tagline" hint="One line">
                <Input value={ch.tagline} onChange={(v) => set({ tagline: v })} placeholder="Fintech, deals, and the spreadsheets behind them." />
              </Field>
              <Field label="Profile picture" hint="Shown on every page">
                <AvatarUpload value={ch.avatar} onChange={(v) => set({ avatar: v })} name={ch.name} />
              </Field>
              <Field label="Address">
                <Input value={ch.slug} onChange={(v) => set({ slug: slugify(v) })} prefix={BASE_URL + "/"} mono />
              </Field>
            </div>
          </Card>

          <Card>
            <SectionTitle>Look</SectionTitle>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => set({ themeId: t.id })}
                  className={`rounded-lg p-3 text-left border-2 ${ch.themeId === t.id ? "border-accent" : "border-line"}`}
                  style={{ background: t.bg }}>
                  <span className="block w-3 h-3 rounded-sm mb-1.5" style={{ background: t.btn }} />
                  <span className="text-xs font-semibold" style={{ color: t.text }}>{t.name}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Channel QR</SectionTitle>
            <p className="mt-1 mb-4 text-[12.8px] text-muted leading-snug">
              Use this one in your channel trailer, banner, or a talk. It never goes stale, it lists whatever's live.
            </p>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="rounded-xl p-3.5 bg-white border border-line"><QR text={url} size={132} /></div>
              <Btn onClick={() => downloadQRPng(url, "#0E0E12", "#FFFFFF", ch.slug || "channel")}>
                <Download size={13} /> Download PNG
              </Btn>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block sticky top-6">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
            <Globe size={13} /> Preview
          </p>
          <PhoneFrame>
            <div className="font-sans px-5 pt-7 pb-6" style={{ background: th.bg }}>
              <div className="flex flex-col items-center text-center">
                <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mb-3 overflow-hidden text-[23px] font-semibold"
                  style={{ background: th.btn, color: th.btnText }}>
                  {ch.avatar ? <img src={ch.avatar} alt="" className="w-full h-full object-cover" /> : (ch.name || "C").slice(0, 1).toUpperCase()}
                </div>
                <p className="text-[17.5px] font-semibold tracking-[-0.025em]" style={{ color: th.text }}>{ch.name || "Your channel"}</p>
                <p className="text-[12.5px] font-mono" style={{ color: th.sub }}>{ch.handle || "@handle"}</p>
                {ch.tagline && <p className="mt-2 text-[13px] leading-snug" style={{ color: th.sub }}>{ch.tagline}</p>}
              </div>
              <div className="mt-6 space-y-2.5">
                {live.length === 0 && <p className="text-center py-6 text-[12.5px]" style={{ color: th.sub }}>Your live pages will list here.</p>}
                {live.slice(0, 25).map((c) => (
                  <div key={c.id} className="rounded-xl px-4 py-3.5 flex items-center gap-3"
                    style={{ background: th.card, border: `1px solid ${th.bg === "#0E0E12" ? "#2A2A32" : "rgba(0,0,0,0.05)"}` }}>
                    <Play size={14} style={{ color: th.sub }} />
                    <span className="flex-1 truncate text-[13.5px] font-semibold" style={{ color: th.text }}>{c.title}</span>
                    <ChevronRight size={15} style={{ color: th.sub }} />
                  </div>
                ))}
                {live.length > 25 && (
                  <p className="text-center pt-2 text-[12px]" style={{ color: th.sub }}>+{live.length - 25} more</p>
                )}
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </>
  );
}
