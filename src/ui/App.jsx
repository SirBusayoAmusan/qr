import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef, lazy, Suspense } from "react";
import {
  QrCode, Plus, Link2, Mail, ArrowRight, ArrowLeft, Download, Check, BarChart3,
  Users, Palette, User, CreditCard, Trash2, Eye, Search, Lock, TrendingUp,
  MousePointerClick, ScanLine, ChevronRight, Play, Globe, Layers, LogOut,
  Star, AlertTriangle, Copy, Image as ImageIcon, Sparkles, ShoppingBag,
} from "lucide-react";

import { createStore } from "../lib/store.js";
import { createSupabaseStore, createSupabaseClient, hasSupabaseConfig } from "../lib/supabaseStore.js";
import { lastNDays, series, windowTotals, campaignTotals, applyEvent, pct, dayKey } from "../lib/stats.js";
import {
  BASE_URL, BRAND, PUBLIC_ORIGIN, publicUrl, displayUrl, THEMES, themeById,
  uid, slugify, isEmail, youtubeId, C,
  Btn, Field, Input, Textarea, ColorPicker, Card, SectionTitle, Stat, Pill, Empty,
  Toggle, CopyBtn, Spinner, PaywallBadge, QR, downloadQRPng, downloadBlob,
} from "./primitives.jsx";

const Charts = {
  Traffic: lazy(() => import("./Charts.jsx").then((m) => ({ default: m.TrafficChart }))),
  Bars: lazy(() => import("./Charts.jsx").then((m) => ({ default: m.CampaignBars }))),
};

// ── Store ────────────────────────────────────────────────────────────────────
let _store = null;
export function getStore() {
  if (!_store) _store = hasSupabaseConfig() ? createSupabaseStore(createSupabaseClient()) : createStore(window.storage);
  return _store;
}
function useStore() {
  const store = getStore();
  const state = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  return [state, store];
}

// ── Plan limits ──────────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free: { pages: 2, linksPerPage: 1, analytics: false, channelQRDownload: false, advanced: false },
  pro:  { pages: Infinity, linksPerPage: Infinity, analytics: true, channelQRDownload: true, advanced: true },
};
const limitsFor = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.free;

const LINK_KINDS = {
  link:    { label: "Link", icon: Link2 },
  product: { label: "Product / Buy", icon: ShoppingBag },
  community:{ label: "Community", icon: Users },
};

// ── Landing ──────────────────────────────────────────────────────────────────
function ClearpathLogo({ size = 28 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg flex items-center justify-center" style={{ width: size, height: size, background: C.purple }}>
        <ScanLine size={size * 0.55} color="#fff" />
      </div>
      <span style={{ fontSize: size * 0.72, fontWeight: 800, letterSpacing: "-0.03em", color: C.ink }}>
        ClearpathQR
      </span>
    </div>
  );
}

function Landing({ onStart, onSignIn }) {
  return (
    <div className="bg-white font-sans min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <ClearpathLogo size={32} />
        <div className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-[#3D3D52]">
          <a href="#features" className="hover:text-[#6B2FD9]">Features</a>
          <a href="#how" className="hover:text-[#6B2FD9]">Use Cases</a>
          <a href="#pricing" className="hover:text-[#6B2FD9]">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onSignIn || onStart} className="text-[13.5px] font-semibold text-[#3D3D52] hover:text-[#6B2FD9]">Log in</button>
          <Btn onClick={onStart}>Get Started Free — it's free <ArrowRight size={14} /></Btn>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0A0A14] text-white px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6 text-[12px] font-bold" style={{ background: "rgba(107,47,217,0.3)", color: "#C4A8FF" }}>
              <span className="w-2 h-2 rounded-full bg-[#C4A8FF]" /> NEW — Timestamp QR Codes are here →
            </div>
            <h1 className="text-hero" style={{ color: "white" }}>
              Turn your viewers<br />
              <span style={{ color: "#A78BFA" }}>into action.</span>
            </h1>
            <p className="text-body-lg mt-6 max-w-lg" style={{ color: "#A1A1B5" }}>
              Display a QR code on your video. Viewers on TVs, desktops, and projectors scan it instantly — without leaving what they're watching.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn size="lg" onClick={onStart}>Get Started Free <ArrowRight size={15} /></Btn>
            </div>
            <div className="mt-6 flex flex-wrap gap-5 text-[13px] text-[#A1A1B5]">
              {["Free to get started","No credit card required","Setup in 60 seconds"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><Check size={14} className="text-[#6B2FD9]" />{t}</span>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["A","B","C","D"].map((l) => (
                  <div key={l} className="w-8 h-8 rounded-full border-2 border-[#0A0A14] bg-[#6B2FD9] flex items-center justify-center text-white text-[10px] font-bold">{l}</div>
                ))}
              </div>
              <div>
                <div className="flex text-yellow-400 text-sm">{"★★★★★"}</div>
                <p className="text-[12px] text-[#A1A1B5]">Trusted by 700+ creators and businesses worldwide</p>
              </div>
            </div>
          </div>
          {/* Hero visual */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden relative aspect-video bg-[#1C1C2E]">
              <img src="/hero-youtube.png" alt="Creator using ClearpathQR on YouTube" className="w-full h-full object-cover" />

            </div>
            <div className="mt-3 flex justify-center gap-6 text-[12px] text-[#A1A1B5]">
              {["YouTube","TV Screens","Live Streams","Podcasts","Presentations"].map((p) => (
                <span key={p} className="flex items-center gap-1"><Play size={10} />{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-[#E8E8F0] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B2FD9] mb-8">WHY QR CODES IN VIDEO MATTER NOW MORE THAN EVER</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {[
              { n:"2.7 BILLION+", l:"people use YouTube every month", s:"Source: YouTube (2024)" },
              { n:"70%+", l:"of YouTube watch time happens on TV screens", s:"Source: Google (2023)" },
              { n:"61%", l:"of viewers switch to another video before taking action", s:"Source: Think with Google" },
              { n:"Only 10–20%", l:"of viewers ever click links in description or comments", s:"Source: Riverside.fm (2023)" },
              { n:"$", l:"That's thousands in lost revenue every single day.", s:"" },
            ].map((s) => (
              <div key={s.n}>
                <p className="text-[22px] font-extrabold text-[#6B2FD9] tracking-[-0.02em]">{s.n}</p>
                <p className="mt-1 text-[13px] text-[#0A0A14] font-medium leading-snug">{s.l}</p>
                {s.s && <p className="mt-1 text-[11px] text-[#8A8A9C]">{s.s}</p>}
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-xl p-4 bg-[#EDE8FF] flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-[14px] text-[#1E1140] font-medium">
              <strong>Your audience is ready to act. Make it effortless for them.</strong> ClearpathQR bridges the gap between watching and doing — right in the moment.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B2FD9] mb-4">HOW CLEARPATHQR WORKS</p>
            <h2 className="text-section text-[#0A0A14]">
              Three simple steps.<br />
              <span style={{ color: "#6B2FD9" }}>Powerful results.</span>
            </h2>
            <div className="mt-10 space-y-8">
              {[
                { n:1, h:"Create Your QR Code", p:"Choose your action, customize your mobile page and generate your QR code in seconds." },
                { n:2, h:"Share It Anywhere", p:"Add your QR code to videos, live streams, slides, podcasts, or any screen your audience sees." },
                { n:3, h:"Get More Actions", p:"Viewers scan, take action instantly, and you get real-time analytics and better engagement." },
              ].map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#6B2FD9] text-white font-bold text-[15px] flex items-center justify-center shrink-0">{s.n}</div>
                  <div>
                    <p className="font-bold text-[15px] text-[#0A0A14]">{s.h}</p>
                    <p className="mt-1 text-[13.5px] text-[#3D3D52] leading-relaxed">{s.p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden bg-[#0A0A14] relative aspect-video shadow-2xl">
            <img src="/hero-woman.jpeg" alt="Creator" className="w-full h-full object-cover" />
            <div className="absolute top-4 right-4 bg-white rounded-xl p-2 shadow-xl">
              <p className="text-[10px] font-bold text-[#0A0A14] text-center mb-1">SCAN TO SAVE<br/>THE RESOURCES</p>
              <QR text={publicUrl("resources")} size={70} quiet={1} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white text-[12px]">
              {[["18,742","Scans"],["24.6%","Scan Rate"],["6,231","Actions"],["$32,680","Revenue"]].map(([n,l]) => (
                <div key={l} className="text-center"><p className="font-bold">{n}</p><p className="text-[10px] text-[#A1A1B5]">{l}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 bg-[#F7F7FC]">
        <div className="max-w-7xl mx-auto text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B2FD9] mb-3">POWERFUL FEATURES</p>
          <h2 className="text-section text-[#0A0A14]">
            Everything you need to turn<br />attention into <span style={{ color: "#6B2FD9" }}>action.</span>
          </h2>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon:"📱", h:"Smart Landing Pages", p:"Mobile-first pages designed to convert. No coding needed." },
            { icon:"🔗", h:"Multiple Actions", p:"Add links, downloads, products, sign-ups, and more to one QR." },
            { icon:"⏱️", h:"Timestamp QR Codes", p:"Link to specific moments in your video for maximum relevance." },
            { icon:"🔄", h:"Dynamic QR Codes", p:"Update destinations anytime without changing your QR code." },
            { icon:"📊", h:"Advanced Analytics", p:"Track scans, devices, locations, conversions and revenue." },
            { icon:"🎨", h:"Custom Branding", p:"Add your logo, colors and style for a consistent brand experience." },
          ].map((f) => (
            <div key={f.h} className="bg-white rounded-xl p-6 border border-[#E8E8F0]">
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-bold text-[15px] text-[#0A0A14]">{f.h}</h3>
              <p className="mt-1 text-[13px] text-[#3D3D52] leading-relaxed">{f.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For everyone */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B2FD9] mb-3">ONE QR CODE. ENDLESS POSSIBILITIES.</p>
          <h2 className="text-section text-[#0A0A14]">
            Built for every <span style={{ color: "#6B2FD9" }}>creator</span> and <span style={{ color: "#6B2FD9" }}>every business.</span>
          </h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label:"YouTubers", desc:"Drive more subs, sales and engagement from every video.", emoji:"🎬" },
            { label:"Podcasters", desc:"Share show notes, resources and sponsor offers instantly.", emoji:"🎙️" },
            { label:"Businesses", desc:"Turn presentations and demos into real conversations.", emoji:"💼" },
            { label:"Educators", desc:"Give students quick access to materials and resources.", emoji:"📚" },
            { label:"Live Events", desc:"Engage audiences in real-time and capture more leads.", emoji:"🎤" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-[#F7F7FC] border border-[#E8E8F0] p-4 text-center">
              <span className="text-3xl">{c.emoji}</span>
              <p className="mt-2 font-bold text-[14px] text-[#0A0A14]">{c.label}</p>
              <p className="mt-1 text-[12px] text-[#3D3D52] leading-snug">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-6 bg-[#0A0A14] text-white">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-[32px] font-bold tracking-[-0.03em] leading-tight">Don't let your next viewer be your last.</h2>
            <p className="mt-3 text-body" style={{ color: "#A1A1B5" }}>Make it easy for your audience to take action while they're still watching.</p>
          </div>
          <Btn size="lg" onClick={onStart}>Get Started Free <ArrowRight size={15} /></Btn>
        </div>
        <div className="max-w-4xl mx-auto mt-6 flex gap-6 text-[12px] text-[#A1A1B5]">
          <span>Free to get started</span><span>—</span><span>No credit card required</span><span>—</span><span>Cancel anytime</span>
        </div>
      </section>
    </div>
  );
}

const PLANS = [
  { id:"free", name:"Free", price:"$0", per:"forever", tag:null, cta:"Start free",
    lines:["2 video pages","Unlimited scans","1 link per page","Email capture","Performance for your 2 pages"] },
  { id:"pro", name:"Pro", price:"$9.99", per:"per month", tag:"For serious creators", cta:"Upgrade to Pro",
    lines:["Unlimited video pages","Unlimited links per page","Full analytics dashboard","Funnel and conversion by video","Channel QR code download","$75/year — save 37%"] },
];

function LandingPricing({ onStart, current }) {
  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B2FD9] mb-3">PRICING</p>
      <h2 className="text-center text-[38px] font-extrabold tracking-[-0.03em] text-[#0A0A14] mb-10">Start free. Move up when the leads start landing.</h2>
      <div className="grid md:grid-cols-2 gap-5">
        {PLANS.map((p) => {
          const active = current === p.id;
          return (
            <div key={p.id} className={`rounded-xl p-6 bg-white border-2 flex flex-col ${p.tag ? "border-[#6B2FD9]" : "border-[#E8E8F0]"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-bold text-[#0A0A14]">{p.name}</span>
                {active ? <Pill tone="good">Current</Pill> : p.tag ? <Pill tone="accent">{p.tag}</Pill> : null}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-mono text-[32px] font-extrabold text-[#0A0A14] tracking-[-0.03em]">{p.price}</span>
                <span className="text-[13px] text-[#8A8A9C]">{p.per}</span>
              </div>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.lines.map((l) => (
                  <li key={l} className="flex gap-2 items-start">
                    <Check size={14} className="text-[#6B2FD9] mt-0.5 shrink-0" />
                    <span className="text-[13.5px] text-[#3D3D52] leading-snug">{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Btn full variant={p.tag ? "primary" : "ghost"} onClick={() => onStart?.(p.id)} disabled={active}>
                  {active ? "You're on this plan" : p.cta}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-[#8A8A9C]">Prices in USD. Billing connects via Stripe (coming soon).</p>
    </div>
  );
}

// ── Auth ─────────────────────────────────────────────────────────────────────
function Auth({ onDone, onBack, store }) {
  const live = store.backend === "supabase";
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!isEmail(email)) { setErr("That email doesn't look right."); return; }
    setErr(""); setBusy(true);
    if (live) {
      const r = await store.sendCode(email);
      setBusy(false);
      if (!r.ok) { setErr(r.error || "Couldn't send the code. Try again."); return; }
    } else {
      // Local mode: auto-sign in, no code needed
      setBusy(false);
      onDone(email);
      return;
    }
    setStep("code");
  };
  const verify = async () => {
    if (code.trim().length < 6) { setErr("Enter the 6-digit code from your email."); return; }
    setBusy(true);
    const r = await store.verifyCode(email, code.trim());
    setBusy(false);
    if (!r.ok) { setErr(r.error || "That code didn't work. Check your email and try again."); return; }
    onDone(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#F7F7FC]">
      <div className="w-full max-w-[400px]">
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6 text-[13px] text-[#8A8A9C] hover:text-[#0A0A14]">
          <ArrowLeft size={14} /> Back
        </button>
        <Card>
          <ClearpathLogo size={30} />
          <div className="mt-5">
            <h2 className="text-[22px] font-extrabold tracking-[-0.03em] text-[#0A0A14]">Sign in to ClearpathQR</h2>
            <p className="mt-1.5 mb-5 text-[13.5px] text-[#3D3D52] leading-relaxed">
              {step === "email" ? "We'll email you a magic code. No password needed." : `Check your inbox at ${email}.`}
            </p>
            {step === "email" ? (
              <>
                <Field label="Email" htmlFor="auth-email">
                  <Input id="auth-email" value={email} onChange={setEmail} placeholder="you@channel.com"
                    autoFocus invalid={!!err} onKeyDown={(e) => e.key === "Enter" && send()} />
                </Field>
                {err && <p className="mt-2 text-[12.5px] text-red-500">{err}</p>}
                <div className="mt-5"><Btn full onClick={send} disabled={busy}>{busy && <Spinner />} Continue <ArrowRight size={14} /></Btn></div>
              </>
            ) : (
              <>
                <Field label="6-digit code" htmlFor="auth-code">
                  <Input id="auth-code" value={code} onChange={setCode} placeholder="000000" mono
                    autoFocus invalid={!!err} onKeyDown={(e) => e.key === "Enter" && verify()} />
                </Field>
                {err && <p className="mt-2 text-[12.5px] text-red-500">{err}</p>}
                <div className="mt-5"><Btn full onClick={verify} disabled={busy}>{busy && <Spinner />} Sign in <ArrowRight size={14} /></Btn></div>
                <button onClick={() => { setStep("email"); setErr(""); }} className="w-full mt-3 text-[12.5px] text-[#8A8A9C] hover:text-[#0A0A14]">Use a different email</button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Public page ───────────────────────────────────────────────────────────────
function PublicPage({ campaign, channel, onClickLink, onLead, width="100%" }) {
  const th = themeById(campaign.themeId || "paper");
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [done, setDone] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const gate = campaign.emailCapture;
  const submit = async () => {
    if (!isEmail(email)) { setError("Enter a valid email."); return; }
    setError(""); setBusy(true);
    const res = await onLead?.({ email, name });
    setBusy(false);
    if (res?.ok === false) { setError("Something went wrong. Try again."); return; }
    setDone(true);
  };
  return (
    <div style={{ width, background: th.bg, fontFamily: "system-ui,sans-serif", borderRadius: 16, overflow: "hidden", border: "1px solid #E8E8F0" }}>
      <div className="px-5 pt-6 pb-6">
        {/* Page image - renders at 16:9 with object-cover so it always looks good */}
        {campaign.picture && (
          <div className="mb-4 rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
            <img src={campaign.picture} alt="" className="w-full h-full object-cover" loading="eager" />
          </div>
        )}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2 overflow-hidden text-xl font-bold" style={{ background: th.btn, color: th.btnText }}>
            {channel.avatar ? <img src={channel.avatar} alt="" className="w-full h-full object-cover" /> : (channel.name || "C").slice(0,1).toUpperCase()}
          </div>
          <p className="text-[12px] font-mono" style={{ color: th.sub }}>{channel.handle || "@yourchannel"}</p>
          <h2 className="mt-2 text-[18px] font-bold leading-tight" style={{ color: th.text }}>{campaign.headline || campaign.title || "Untitled"}</h2>
          {campaign.subhead && <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: th.sub }}>{campaign.subhead}</p>}
        </div>
        {/* Links */}
        <div className="space-y-2.5 mb-4">
          {campaign.links?.filter((l) => l.label).map((l) => {
            const Icon = LINK_KINDS[l.kind]?.icon || Link2;
            return (
              <button key={l.id} onClick={() => onClickLink?.(l)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: th.card, border: `1px solid rgba(0,0,0,0.06)` }}>
                <Icon size={16} style={{ color: th.sub }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold leading-snug" style={{ color: th.text, wordBreak: "break-word", overflowWrap: "anywhere" }}>{l.label}</p>
                  {l.note && <p className="truncate text-[11.5px]" style={{ color: th.sub }}>{l.note}</p>}
                </div>
                <ChevronRight size={15} style={{ color: th.sub }} />
              </button>
            );
          })}
        </div>
        {/* Email capture */}
        {gate?.enabled && (
          <div className="rounded-xl p-4" style={{ background: th.card }}>
            {done ? (
              <div className="text-center py-2">
                <Check size={20} style={{ color: th.btn, margin: "0 auto" }} />
                <p className="mt-2 text-sm font-bold" style={{ color: th.text }}>Check your inbox</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold" style={{ color: th.text }}>{gate.headline || "Get the free download"}</p>
                {gate.sub && <p className="mt-1 text-[12.5px]" style={{ color: th.sub }}>{gate.sub}</p>}
                <div className="mt-3 space-y-2">
                  {gate.askName && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className="w-full outline-none rounded-lg px-3 py-2.5 text-[13.5px] border border-[#E8E8F0] bg-white text-[#0A0A14]" />}
                  <input value={email} onChange={(e) => setEmail(e.target.value.slice(0, 254))} placeholder="your@email.com" type="email" inputMode="email" autoComplete="email" className="w-full outline-none rounded-lg px-3 py-2.5 text-[13.5px] border border-[#E8E8F0] bg-white text-[#0A0A14] min-w-0" style={{ maxWidth: "100%", boxSizing: "border-box" }} />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button onClick={submit} disabled={busy} className="w-full rounded-lg py-2.5 font-bold text-[13.5px] flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: th.btn, color: th.btnText }}>
                    {busy && <Spinner />}{gate.buttonText || "Send it to me"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public route ──────────────────────────────────────────────────────────────
function PublicRoute({ slug, state, store }) {
  const live = store.backend === "supabase";
  const [status, setStatus] = useState(live ? "loading" : "ready");
  const [remote, setRemote] = useState(null);
  const recorded = useRef(false);
  const localCampaign = state.campaigns.find((c) => c.slug === slug && !c.archived);
  useEffect(() => {
    let cancelled = false;
    if (live) {
      store.getPublicPage(slug).then((page) => {
        if (cancelled) return;
        if (!page) { setStatus("missing"); return; }
        setRemote(page); setStatus("ready");
        if (!recorded.current) { recorded.current = true; store.record("scan", page.id); }
      });
    } else if (localCampaign && !recorded.current) {
      recorded.current = true; store.record("scan", localCampaign.id);
    }
    return () => { cancelled = true; };
  }, [live, slug, store, localCampaign]);
  if (live && status === "loading") return <div className="min-h-screen flex items-center justify-center gap-2 text-[#8A8A9C] font-mono text-[13px]"><Spinner /> loading</div>;
  const campaign = live ? (remote && { ...remote, links: remote.links||[] }) : localCampaign;
  const channel = live ? (remote?.channel||{}) : state.meta.channel;
  if (!campaign) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7FC] px-6">
      <div className="text-center max-w-sm">
        <ClearpathLogo size={36} />
        <p className="mt-6 text-[17px] font-bold text-[#0A0A14]">This page isn't here</p>
        <p className="mt-2 text-[13.5px] text-[#3D3D52] leading-relaxed">{live ? "This code doesn't match a live page." : "Connect Supabase so pages resolve everywhere."}</p>
        <a href="/" className="inline-block mt-5 text-[13px] text-[#6B2FD9] font-semibold">Go to ClearpathQR →</a>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen flex items-start justify-center bg-[#F7F7FC] py-10 px-4">
      <div className="w-full max-w-[420px]">
        <PublicPage campaign={campaign} channel={channel} width="100%"
          onClickLink={(l) => { store.record("click", campaign.id, l.id); if (l.url) window.open(l.url, "_blank", "noopener"); }}
          onLead={({ email, name }) => live ? store.captureLeadPublic(slug, email, name) : store.addLead({ email, name, campaignId: campaign.id })} />
        <p className="text-center mt-4 text-[11px] text-[#8A8A9C] font-mono">{displayUrl(slug)}</p>
      </div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return <div className="rounded-3xl p-2.5 bg-[#0A0A14] w-[340px]"><div className="rounded-2xl overflow-hidden bg-white">{children}</div></div>;
}

// ── App shell ─────────────────────────────────────────────────────────────────
const NAV = [
  { id:"campaigns", label:"Video pages", icon:Layers },
  { id:"leads",     label:"Leads",       icon:Users },
  { id:"analytics", label:"Analytics",   icon:BarChart3 },
  { id:"brand",     label:"Brand",       icon:Palette },
  { id:"channel",   label:"Channel",     icon:Globe },
  { id:"pricing",   label:"Plan",        icon:CreditCard },
];

export default function App() {
  const [state, store] = useStore();
  const [screen, setScreen] = useState("landing");
  const [nav, setNav] = useState("campaigns");
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState("");
  const [pendingPage, setPendingPage] = useState(null);   // page built before signup
  const [authTrigger, setAuthTrigger] = useState("save"); // why signup was triggered
  const booted = useRef(false);

  // Ask user to sign up at the right moment (when they try to do something valuable).
  const requireAuth = useCallback((reason, page) => {
    if (state.meta?.user) return false; // already signed in
    setPendingPage(page || null);
    setAuthTrigger(reason || "save");
    setScreen("auth");
    return true; // caller should stop
  }, [state.meta?.user]);

  const publicSlug = useMemo(() => {
    if (typeof window === "undefined") return null;
    const m = window.location.pathname.match(/^\/p\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, []);

  const isAuthCallback = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/auth/callback" ||
      window.location.hash.includes("access_token") ||
      window.location.hash.includes("type=magiclink");
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const boot = async () => {
      // Handle OAuth/magic-link redirect back into the app.
      if (isAuthCallback && store.handleAuthCallback) {
        const r = await store.handleAuthCallback();
        if (r.ok) {
          // Migrate any page the user built before signing up.
          const pending = sessionStorage.getItem("cpqr:pending_page");
          if (pending) {
            try {
              const campaign = JSON.parse(pending);
              if (store.migratePage) await store.migratePage(campaign);
              sessionStorage.removeItem("cpqr:pending_page");
            } catch {}
          }
          // Clean up the URL and go to app.
          window.history.replaceState({}, "", "/");
          setScreen("app");
          return;
        }
      }
      const s = await store.load();
      if (!publicSlug && s.meta?.user) setScreen("app");
    };

    boot();
    const flush = () => store.flush();
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", flush);
    return () => { window.removeEventListener("beforeunload", flush); document.removeEventListener("visibilitychange", flush); };
  }, [store, publicSlug, isAuthCallback]);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);

  const signIn = async (email, pendingPage) => {
    const handle = email.split("@")[0];
    if (!state.meta.channel?.slug) {
      store.setMeta({ channel: { ...state.meta.channel, name: handle, handle: "@" + handle, slug: slugify(handle) } });
    }
    if (store.backend !== "supabase") store.setMeta({ user: { email, joined: Date.now() } });
    // Migrate a page that was built before signing up.
    if (pendingPage && store.migratePage) await store.migratePage(pendingPage);
    setScreen("app");
  };

  if (!state.ready) return <div className="min-h-screen flex items-center justify-center bg-white gap-2 text-[#8A8A9C] font-mono text-[13px]"><Spinner /> loading</div>;
  if (publicSlug) return <PublicRoute slug={publicSlug} state={state} store={store} />;
  if (screen === "landing") return <Landing
    onStart={() => setScreen("app")}
    onSignIn={() => { setAuthTrigger("signin"); setScreen("auth"); }}
  />;
  if (screen === "auth") return <Auth onDone={signIn} onBack={() => { setScreen(pendingPage ? "app" : "landing"); }} store={store} pendingPage={pendingPage} triggerReason={authTrigger} />;

  const open = state.campaigns.find((c) => c.id === openId);

  return (
    <div className="min-h-screen flex bg-[#F7F7FC] font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col shrink-0 w-[220px] bg-white border-r border-[#E8E8F0]">
        <div className="px-5 py-5 cursor-pointer" onClick={() => { setScreen("landing"); setOpenId(null); }}><ClearpathLogo size={28} /></div>
        <nav className="px-3 flex-1">
          {NAV.map((n) => {
            const active = nav === n.id;
            return (
              <button key={n.id} onClick={() => { setNav(n.id); setOpenId(null); }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 mb-0.5 text-left text-[13.5px] font-medium transition-colors
                  ${active ? "bg-[#EDE8FF] text-[#6B2FD9] font-semibold" : "text-[#3D3D52] hover:bg-[#F7F7FC]"}`}>
                <n.icon size={15} className={active ? "text-[#6B2FD9]" : "text-[#8A8A9C]"} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#E8E8F0]">
          <div className="rounded-lg px-3 py-2.5 mb-2 bg-[#F7F7FC]">
            <p className="truncate text-xs text-[#3D3D52] font-mono">{state.meta?.user?.email}</p>
            <div className="mt-1.5"><Pill tone={state.meta?.plan === "pro" ? "accent" : "neutral"}>{state.meta?.plan || "free"}</Pill></div>
          </div>
          <button onClick={async () => { if (store.signOut) await store.signOut(); else store.setMeta({ user: null }); setScreen("landing"); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-[#8A8A9C] hover:text-[#0A0A14]">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-white border-t border-[#E8E8F0]">
        {NAV.slice(0,5).map((n) => (
          <button key={n.id} onClick={() => { setNav(n.id); setOpenId(null); }} className="flex-1 flex flex-col items-center py-2.5 gap-0.5">
            <n.icon size={17} className={nav === n.id ? "text-[#6B2FD9]" : "text-[#8A8A9C]"} />
            <span className={`text-[9px] ${nav === n.id ? "text-[#0A0A14] font-semibold" : "text-[#8A8A9C]"}`}>{n.label}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-7">
          {state.writeError && (
            <div className="rounded-lg px-4 py-3 mb-5 flex items-center gap-3 bg-red-50">
              <AlertTriangle size={15} className="text-red-500 shrink-0" />
              <p className="text-[13px] text-red-600">{state.writeError}</p>
            </div>
          )}
          {open ? (
            <CampaignDetail campaign={open} state={state} store={store} flash={flash}
              onBack={() => setOpenId(null)}
              onUpgrade={() => { setOpenId(null); setNav("pricing"); }}
              requireAuth={requireAuth} />
          ) : (
            <>
              {nav === "campaigns" && <Campaigns state={state} store={store} onOpen={setOpenId} flash={flash} onUpgrade={() => setNav("pricing")} requireAuth={requireAuth} />}
              {nav === "leads"     && <Leads state={state} store={store} flash={flash} />}
              {nav === "analytics" && <Analytics state={state} store={store} onUpgrade={() => setNav("pricing")} flash={flash} />}
              {nav === "brand"     && <BrandPresets state={state} store={store} flash={flash} />}
              {nav === "channel"   && <ChannelPageView state={state} store={store} onUpgrade={() => setNav("pricing")} />}
              {nav === "pricing"   && <div className="-mx-5 md:-mx-8"><LandingPricing current={state.meta?.plan}
                onStart={(id) => { store.setMeta({ plan: id }); flash(`Switched to ${id}`); }} /></div>}
            </>
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed z-40 rounded-lg px-4 py-2.5 bg-[#0A0A14] text-white text-[13px] font-medium animate-fade-up"
          style={{ bottom: 22, left: "50%", transform: "translateX(-50%)" }}>{toast}</div>
      )}
    </div>
  );
}

function Header({ title, sub, right, onBack }) {
  return (
    <div className="mb-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-4 text-[13px] text-[#8A8A9C] hover:text-[#0A0A14]">
          <ArrowLeft size={14} /> Back
        </button>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-[#0A0A14]">{title}</h1>
          {sub && <p className="mt-1 text-[13.5px] text-[#3D3D52]">{sub}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
function newCampaign(state, title="") {
  let slug = slugify(title) || "page-" + uid().slice(0,5);
  const taken = new Set(state.campaigns.map((c) => c.slug));
  if (taken.has(slug)) slug += "-" + uid().slice(0,3);
  return {
    id:uid(), title, videoUrl:"", slug, headline:"", subhead:"", themeId:"paper",
    campaignTag:"", picture:"",
    links:[{ id:uid(), label:"", url:"", kind:"link", note:"" }],
    emailCapture:{ enabled:false, headline:"Get the free download", sub:"", magnetName:"", buttonText:"Send it to me", askName:false },
    createdAt:Date.now(), archived:false,
  };
}

function Campaigns({ state, store, onOpen, flash, onUpgrade, requireAuth }) {
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const limits = limitsFor(state.meta?.plan);
  const liveCount = state.campaigns.filter((c) => !c.archived).length;
  const atLimit = liveCount >= limits.pages;

  const list = useMemo(() => state.campaigns
    .filter((c) => showArchived ? c.archived : !c.archived)
    .filter((c) => (c.title + c.slug).toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => b.createdAt - a.createdAt), [state.campaigns, showArchived, q]);

  const create = () => {
    if (atLimit) { onUpgrade(); return; }
    const c = newCampaign(state);
    store.addCampaign(c);
    onOpen(c.id);
  };

  // Show a gentle "save your work" nudge if they've built a page but haven't signed up
  const unsavedCount = !state.meta?.user ? state.campaigns.length : 0;

  return (
    <>
      <Header title="Video pages" sub="One page per upload. The QR on screen points here."
        right={<Btn onClick={create}><Plus size={14} /> New page</Btn>} />

      {atLimit && limits.pages === 2 && (
        <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-3 bg-[#EDE8FF]">
          <Lock size={15} className="text-[#6B2FD9] shrink-0" />
          <p className="text-[13px] text-[#6B2FD9]">Free plan is limited to 2 pages. <button onClick={onUpgrade} className="font-bold underline">Upgrade to Pro</button> for unlimited.</p>
        </div>
      )}

      {unsavedCount > 0 && (
        <div className="rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3 bg-[#0A0A14] text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">💾</span>
            <p className="text-[13px]">
              <span className="font-bold">Your page isn't saved yet.</span> Create a free account to keep it and download your QR code.
            </p>
          </div>
          <Btn size="sm" onClick={() => requireAuth && requireAuth("save", state.campaigns[0])} className="shrink-0">
            Save free
          </Btn>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px] bg-white border border-[#E8E8F0]">
          <Search size={14} className="text-[#8A8A9C]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" className="w-full outline-none text-[13.2px] text-[#0A0A14]" />
        </div>
        <Btn size="sm" variant={showArchived ? "quiet" : "ghost"} onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "Showing archived" : "Archived"}
        </Btn>
      </div>

      {list.length === 0 ? (
        <Empty icon={QrCode} title={showArchived ? "Nothing archived" : "No pages yet"}
          body="Create a page for your next upload, add the QR to your video, and watch traffic come in."
          action={!showArchived && <Btn onClick={create}><Plus size={14} /> Create first page</Btn>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((c) => {
            const t = campaignTotals(state.stats, c.id);
            const th = themeById(c.themeId);
            return (
              <button key={c.id} onClick={() => onOpen(c.id)}
                className="text-left rounded-xl p-4 bg-white border border-[#E8E8F0] transition-transform hover:-translate-y-0.5">
                <div className="flex gap-3.5">
                  <div className="rounded-lg p-1.5 shrink-0 border border-[#E8E8F0]" style={{ background: th.bg }}>
                    <QR text={publicUrl(c.slug)} size={54} quiet={1} fg={th.text} bg={th.bg} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-[#0A0A14]">{c.title || "Untitled"}</p>
                    <p className="truncate mt-0.5 text-[11.5px] text-[#8A8A9C] font-mono">/{c.slug}</p>
                    <div className="flex gap-3 mt-2">
                      {[["scans",t.scans],["clicks",t.clicks],["leads",t.leads]].map(([l,n]) => (
                        <span key={l}><span className="font-mono font-bold text-[13px] text-[#0A0A14]">{n}</span><span className="text-[10.5px] text-[#8A8A9C] ml-1">{l}</span></span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ── Campaign detail ───────────────────────────────────────────────────────────
const TABS = [
  { id:"page",   label:"Page" },
  { id:"design", label:"Design" },
  { id:"qr",     label:"QR Code" },
  { id:"stats",  label:"Performance" },
];

function StepBar({ tab, setTab, isSignedIn, onSavePrompt }) {
  const idx = TABS.findIndex((t) => t.id === tab);
  const prev = TABS[idx-1]; const next = TABS[idx+1];
  const LABELS = { design:"Next: Design", qr:"Next: Get QR Code", stats:"Next: Performance" };
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {prev ? <Btn variant="ghost" onClick={() => setTab(prev.id)}><ArrowLeft size={14} /> Back</Btn> : <span />}
      {next && (
        <Btn onClick={() => {
          // When moving to the QR tab, prompt sign-up if not authenticated
          if (next.id === "qr" && !isSignedIn && onSavePrompt) {
            onSavePrompt();
            return;
          }
          setTab(next.id);
        }}>
          {LABELS[next.id]||"Next"} <ArrowRight size={14} />
        </Btn>
      )}
    </div>
  );
}

function CampaignDetail({ campaign, state, store, flash, onBack, onUpgrade, requireAuth }) {
  const [tab, setTab] = useState("page");
  const update = (patch) => store.updateCampaign(campaign.id, patch);
  const url = publicUrl(campaign.slug);

  return (
    <>
      <Header title={campaign.title || "Untitled"} onBack={onBack}
        right={
          <div className="flex gap-2">
            <CopyBtn text={url} size="md" />
            <Btn variant="ghost" onClick={() => { store.addCampaign({ ...campaign, id:uid(), title:campaign.title+" (copy)", slug:campaign.slug+"-"+uid().slice(0,3), createdAt:Date.now() }); flash("Duplicated"); }}>
              <Copy size={13} /> Duplicate
            </Btn>
          </div>
        } />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-[#E8E8F0]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-[13.5px] -mb-px border-b-2 font-medium transition-colors
              ${tab===t.id ? "font-bold text-[#0A0A14] border-[#6B2FD9]" : "text-[#8A8A9C] border-transparent hover:text-[#0A0A14]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div>
          {tab==="page"   && <PageTab campaign={campaign} update={update} state={state} flash={flash} onUpgrade={onUpgrade} requireAuth={requireAuth} />}
          {tab==="design" && <DesignTab campaign={campaign} update={update} />}
          {tab==="qr"     && <QRTab campaign={campaign} url={url} state={state} requireAuth={requireAuth} />}
          {tab==="stats"  && <StatsTab campaign={campaign} state={state} onUpgrade={onUpgrade} />}
          <StepBar tab={tab} setTab={setTab} isSignedIn={!!state.meta?.user}
            onSavePrompt={() => requireAuth && requireAuth("save", campaign)} />
          <div className="mt-8 pt-5 border-t border-[#E8E8F0]">
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => update({ archived: !campaign.archived })}>{campaign.archived ? "Restore" : "Archive"}</Btn>
              <Btn variant="danger" size="sm" onClick={() => { store.removeCampaign(campaign.id); onBack(); flash("Page deleted"); }}>
                <Trash2 size={13} /> Delete
              </Btn>
            </div>
          </div>
        </div>
        <div className="hidden lg:block sticky top-6">
          <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A8A9C]"><Eye size={13}/> Preview</p>
          <PhoneFrame>
            <PublicPage campaign={campaign} channel={state.meta?.channel||{}}
              onClickLink={(l) => store.record("click", campaign.id, l.id)}
              onLead={({ email, name }) => store.addLead({ email, name, campaignId: campaign.id })} />
          </PhoneFrame>
        </div>
      </div>
    </>
  );
}

// ── Page tab ──────────────────────────────────────────────────────────────────

// Better image upload: proper aspect ratio, good rendering, 10MB limit
function PageImageUpload({ value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please choose a JPG, PNG, or WebP image."); return; }
    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) { setErr(`Image is too large. Max ${maxMB}MB.`); return; }
    setErr(""); setBusy(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            // Resize to max 1200px wide, keep aspect ratio, high quality
            const maxW = 1200;
            const scale = img.width > maxW ? maxW / img.width : 1;
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            const ctx = cv.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);
            res(cv.toDataURL("image/jpeg", 0.88));
          };
          img.onerror = () => rej(new Error("Could not read image"));
          img.src = reader.result;
        };
        reader.onerror = () => rej(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      onChange(dataUrl);
    } catch (e) {
      setErr("Could not process that image. Try another.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[#E8E8F0] bg-[#F7F7FC]" style={{ aspectRatio: "16/9" }}>
          <img src={value} alt="Page image" className="w-full h-full object-cover" />
          <button onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
            <Trash2 size={13} />
          </button>
          <button onClick={() => ref.current?.click()}
            className="absolute bottom-2 right-2 rounded-lg px-3 py-1.5 bg-black/60 text-white text-[12px] font-semibold hover:bg-black/80">
            Replace
          </button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-[#E8E8F0] bg-[#F7F7FC] hover:border-[#6B2FD9] hover:bg-[#EDE8FF] transition-colors flex flex-col items-center justify-center gap-2 py-10">
          <ImageIcon size={28} className="text-[#8A8A9C]" />
          <p className="text-[14px] font-semibold text-[#3D3D52]">Click to upload an image</p>
          <p className="text-[12px] text-[#8A8A9C]">JPG, PNG or WebP — max 10MB</p>
        </button>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])} />
      {busy && <div className="flex items-center gap-2 mt-2 text-[12.5px] text-[#8A8A9C]"><Spinner /> Processing image…</div>}
      {err && <p className="mt-2 text-[12.5px] text-red-500">{err}</p>}
    </div>
  );
}

function AvatarUpload({ value, onChange, name }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    const dataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => { const img = new Image(); img.onload = () => { const s=256, cv=document.createElement("canvas"); cv.width=s; cv.height=s; const ctx=cv.getContext("2d"); const sc=Math.max(s/img.width,s/img.height); ctx.drawImage(img,(s-img.width*sc)/2,(s-img.height*sc)/2,img.width*sc,img.height*sc); res(cv.toDataURL("image/jpeg",0.82)); }; img.src=reader.result; }; reader.onerror=rej; reader.readAsDataURL(file);
    });
    onChange(dataUrl); setBusy(false);
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E8E8F0] bg-[#F7F7FC] flex items-center justify-center shrink-0">
        {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-[#8A8A9C]" />}
      </div>
      <div className="flex-1">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => ref.current?.click()} disabled={busy}>{busy?<Spinner/>:<ImageIcon size={13}/>} {value?"Replace":"Upload"}</Btn>
          {value && <Btn size="sm" variant="ghost" onClick={() => onChange("")}><Trash2 size={13}/></Btn>}
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#8A8A9C]">JPG or PNG — shown at the top of your page</p>
      </div>
    </div>
  );
}

function PageTab({ campaign, update, state, flash, onUpgrade }) {
  const limits = limitsFor(state.meta?.plan);
  const atLinkLimit = campaign.links.length >= limits.linksPerPage;
  const setLink = (id, patch) => update({ links: campaign.links.map((l) => l.id===id ? {...l,...patch} : l) });
  const move = (idx, dir) => { const arr=[...campaign.links]; const j=idx+dir; if (j<0||j>=arr.length) return; [arr[idx],arr[j]]=[arr[j],arr[idx]]; update({ links:arr }); };
  const vid = youtubeId(campaign.videoUrl);

  return (
    <div className="space-y-5">
      {/* Picture */}
      <Card>
        <SectionTitle>Picture</SectionTitle>
        <p className="mt-1 mb-4 text-[12.5px] text-[#8A8A9C]">Shown at the top of your page. Max 10MB. Square or landscape works best.</p>
        <PageImageUpload value={campaign.picture||""} onChange={(v) => update({ picture:v })} />
      </Card>

      {/* Headline + subline */}
      <Card>
        <SectionTitle>What people see</SectionTitle>
        <div className="space-y-4 mt-4">
          <Field label="Headline" hint="Max 100 characters">
            <Input value={campaign.headline} onChange={(v) => {
              const capped = v.slice(0, 100);
              const patch = { headline:capped };
              if (!campaign.title || campaign.title===campaign.headline) patch.title=capped;
              if (!campaign.slugCustom) { let s=slugify(capped)||"page-"+campaign.id.slice(0,5); patch.slug=s; }
              update(patch);
            }} placeholder="The spreadsheet from this video" />
          </Field>
          {campaign.headline?.length >= 80 && (
            <p className="text-[11.5px] text-[#8A8A9C]">{100 - (campaign.headline?.length||0)} characters remaining</p>
          )}
          <Field label="Sub-line" hint="Optional, max 100 characters">
            <Input value={campaign.subhead} onChange={(v) => update({ subhead:v.slice(0,100) })} placeholder="Free download — no signup needed." />
          </Field>
        </div>
      </Card>

      {/* Links */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Links</SectionTitle>
          {atLinkLimit
            ? <PaywallBadge onClick={onUpgrade} label="Add more links — Pro" />
            : <Btn size="sm" variant="ghost" onClick={() => update({ links:[...campaign.links,{id:uid(),label:"",url:"",kind:"link",note:""}] })}><Plus size={13}/> Add link</Btn>
          }
        </div>
        {atLinkLimit && (
          <div className="rounded-lg px-3.5 py-2.5 mb-4 flex items-center gap-2.5 bg-[#EDE8FF]">
            <Lock size={13} className="text-[#6B2FD9] shrink-0" />
            <p className="text-[12.5px] text-[#6B2FD9]">Free plan: 1 link per page. Pro unlocks unlimited.</p>
          </div>
        )}
        <div className="space-y-3">
          {campaign.links.map((l, i) => (
            <div key={l.id} className="rounded-lg p-3.5 bg-[#F7F7FC]">
              <div className="flex gap-2 items-center mb-2.5">
                <select value={l.kind} onChange={(e) => setLink(l.id,{kind:e.target.value})}
                  className="rounded-md px-2 py-1.5 outline-none bg-white border border-[#E8E8F0] text-[12.5px] text-[#3D3D52]">
                  {Object.entries(LINK_KINDS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <div className="flex-1" />
                <button onClick={() => move(i,-1)} disabled={i===0} className={`px-1.5 text-[13px] ${i===0?"text-[#E8E8F0]":"text-[#8A8A9C] hover:text-[#0A0A14]"}`}>↑</button>
                <button onClick={() => move(i,1)} disabled={i===campaign.links.length-1} className={`px-1.5 text-[13px] ${i===campaign.links.length-1?"text-[#E8E8F0]":"text-[#8A8A9C] hover:text-[#0A0A14]"}`}>↓</button>
                <button onClick={() => update({ links:campaign.links.filter((x) => x.id!==l.id) })}><Trash2 size={13} className="text-[#8A8A9C] hover:text-red-500" /></button>
              </div>
              <div className="space-y-2">
                <Input value={l.label} onChange={(v) => setLink(l.id,{label:v})} placeholder="Button label — e.g. Download the template" />
                <Input value={l.url} onChange={(v) => setLink(l.id,{url:v})} placeholder="https://..." mono />
                <Input value={l.note} onChange={(v) => setLink(l.id,{note:v})} placeholder="Short note (optional)" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Email capture */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <SectionTitle>Email capture</SectionTitle>
            <p className="mt-1 text-[12.8px] text-[#8A8A9C] leading-snug">Collect an email before handing over the link.</p>
          </div>
          <Toggle label="Email capture" on={campaign.emailCapture.enabled} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,enabled:v} })} />
        </div>
        {campaign.emailCapture.enabled && (
          <div className="space-y-3.5 mt-5">
            <Field label="Offer headline"><Input value={campaign.emailCapture.headline} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,headline:v} })} /></Field>
            <Field label="Supporting line" hint="Optional"><Input value={campaign.emailCapture.sub} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,sub:v} })} placeholder="The exact sheet I used on screen." /></Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="What they get"><Input value={campaign.emailCapture.magnetName} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,magnetName:v} })} placeholder="Pricing template" /></Field>
              <Field label="Button text"><Input value={campaign.emailCapture.buttonText} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,buttonText:v} })} /></Field>
            </div>
            <div className="flex items-center gap-2.5">
              <Toggle small label="Ask first name" on={campaign.emailCapture.askName} onChange={(v) => update({ emailCapture:{...campaign.emailCapture,askName:v} })} />
              <span className="text-[13px] text-[#3D3D52]">Also ask for a first name</span>
            </div>
          </div>
        )}
      </Card>

      {/* Optional extras */}
      <Card>
        <SectionTitle>Optional</SectionTitle>
        <div className="space-y-4 mt-4">
          <Field label="YouTube video" hint="Links this page to a specific upload">
            <Input value={campaign.videoUrl} onChange={(v) => update({ videoUrl:v })} placeholder="https://youtube.com/watch?v=..." mono />
          </Field>
          {vid && <div className="flex items-center gap-2"><Pill tone="good"><Check size={11}/> linked</Pill><span className="text-xs text-[#8A8A9C] font-mono">{vid}</span></div>}
          <Field label="Campaign" hint="Group related pages">
            <Input value={campaign.campaignTag} onChange={(v) => update({ campaignTag:v })} placeholder="Q3 launch" />
          </Field>
        </div>
      </Card>
    </div>
  );
}

// ── Design tab ────────────────────────────────────────────────────────────────
function DesignTab({ campaign, update }) {
  const isCustom = campaign.themeId === "custom";
  const th = themeById(campaign.themeId);
  const [custom, setCustom] = useState({ bg: th.bg, card: th.card, text: th.text, sub: th.sub, btn: th.btn, btnText: th.btnText });

  const applyCustom = (patch) => {
    const next = { ...custom, ...patch };
    setCustom(next);
    update({ themeId:"custom", customTheme:next });
  };

  const resolvedTheme = isCustom && campaign.customTheme ? campaign.customTheme : th;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Theme</SectionTitle>
        <p className="mt-1 mb-4 text-[12.8px] text-[#8A8A9C]">Pick a starting point, then tweak any color below.</p>
        <div className="grid grid-cols-4 gap-2.5">
          {THEMES.filter((t) => t.id !== "custom").map((t) => (
            <button key={t.id} onClick={() => { update({ themeId:t.id, customTheme:null }); setCustom({ bg:t.bg, card:t.card, text:t.text, sub:t.sub, btn:t.btn, btnText:t.btnText }); }}
              className={`rounded-lg p-2.5 text-left border-2 ${campaign.themeId===t.id?"border-[#6B2FD9]":"border-[#E8E8F0]"}`}
              style={{ background:t.bg }}>
              <span className="block w-4 h-4 rounded" style={{ background:t.btn }} />
              <span className="block mt-1.5 text-[11px] font-semibold" style={{ color:t.text }}>{t.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Custom colors</SectionTitle>
        <p className="mt-1 mb-4 text-[12.8px] text-[#8A8A9C]">Click any swatch to open the full color picker — any hex color you want, like Canva.</p>
        <div className="grid grid-cols-2 gap-4">
          <ColorPicker value={resolvedTheme.bg} onChange={(v) => applyCustom({bg:v})} label="Background" />
          <ColorPicker value={resolvedTheme.card} onChange={(v) => applyCustom({card:v})} label="Card fill" />
          <ColorPicker value={resolvedTheme.text} onChange={(v) => applyCustom({text:v})} label="Heading text" />
          <ColorPicker value={resolvedTheme.sub} onChange={(v) => applyCustom({sub:v})} label="Subtext" />
          <ColorPicker value={resolvedTheme.btn} onChange={(v) => applyCustom({btn:v})} label="Button color" />
          <ColorPicker value={resolvedTheme.btnText} onChange={(v) => applyCustom({btnText:v})} label="Button text" />
        </div>
      </Card>
    </div>
  );
}

// ── QR tab ────────────────────────────────────────────────────────────────────
function QRTab({ campaign, url, state, requireAuth }) {
  const [fg, setFg] = useState("#0A0A14");
  const [bg, setBg] = useState("#FFFFFF");
  const [scanLabel, setScanLabel] = useState(true);
  const [withBadge, setWithBadge] = useState(false);

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle>Your QR code</SectionTitle>
        <p className="mt-1 mb-5 text-[12.8px] text-[#8A8A9C] leading-snug">
          Drop this in a corner of the frame. Keep it on screen at least 8 seconds — that's how long it takes someone to reach for their phone.
        </p>
        <div className="flex flex-wrap gap-6 items-start">
          <div className="rounded-xl p-4 border border-[#E8E8F0] flex flex-col items-center" style={{ background:bg }}>
            {scanLabel && (
              <div className="flex items-center gap-1.5 mb-2.5" style={{ color:fg }}>
                <ScanLine size={14} />
                <span className="font-bold tracking-[0.06em] text-[12px] uppercase">Scan here</span>
              </div>
            )}
            <QR text={url} size={180} fg={fg} bg={bg} badge={withBadge?(state.meta?.channel?.name||"C"):null} />
          </div>
          <div className="flex-1 min-w-[200px] space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A8A9C] mb-3">QR code color</p>
              <div className="flex items-center gap-3">
                <ColorPicker value={fg} onChange={setFg} label="Code color" />
                <ColorPicker value={bg} onChange={setBg} label="Background" />
              </div>
              <p className="mt-2 text-[11.5px] text-[#8A8A9C]">Click either swatch — any color you want.</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Toggle small label="Scan here label" on={scanLabel} onChange={setScanLabel} />
                <span className="text-[13px] text-[#3D3D52]">Show "Scan here" label</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Toggle small label="Initial badge" on={withBadge} onChange={setWithBadge} />
                <span className="text-[13px] text-[#3D3D52]">Put your initial in the centre</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn onClick={() => {
                // Trigger sign-up if not authenticated yet
                if (requireAuth && requireAuth("download", campaign)) return;
                downloadQRPng(url, fg, bg, campaign.slug, 16, { scanLabel, badge:withBadge?(state.meta?.channel?.name||"C"):null });
              }}>
                <Download size={13} /> {state.meta?.user ? "Download PNG" : "Save & Download"}
              </Btn>
              <CopyBtn text={url} size="md" />
            </div>
            <div className="rounded-lg p-3 bg-[#EDE8FF] space-y-2">
              <p className="text-[12px] font-bold text-[#6B2FD9]">How it works:</p>
              <div className="flex items-start gap-2">
                <span className="text-[#6B2FD9] font-bold text-[11px] mt-0.5 shrink-0">1.</span>
                <p className="text-[12px] text-[#3D3D52]">Someone scans this QR → lands on YOUR page (with your headline, image, and links)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#6B2FD9] font-bold text-[11px] mt-0.5 shrink-0">2.</span>
                <p className="text-[12px] text-[#3D3D52]">They tap a link on your page → goes to the URL you entered (e.g. vuemagnet.com)</p>
              </div>
              <p className="text-[11px] text-[#8A8A9C] pt-1 border-t border-[#D4C8FF]">QR destination: <span className="font-mono break-all">{url}</span></p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Where to put it</SectionTitle>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          {[
            { h:"Corner overlay", p:"Bottom-right, ~12% of frame height. Leave it up while you talk through the offer." },
            { h:"End screen", p:"Full-size beside your subscribe button. Highest scan rate of any placement." },
            { h:"Pinned comment", p:"Paste the plain URL too — phone viewers can't scan their own screen." },
          ].map((x) => (
            <div key={x.h} className="rounded-lg p-3.5 bg-[#F7F7FC]">
              <p className="text-[13px] font-bold text-[#0A0A14]">{x.h}</p>
              <p className="mt-1 text-[12px] text-[#3D3D52] leading-snug">{x.p}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────────────
function StatsTab({ campaign, state, onUpgrade }) {
  const limits = limitsFor(state.meta?.plan);
  // Free users can see stats for their 2 free pages
  const t = campaignTotals(state.stats, campaign.id);
  const conv = pct(t.leads, t.scans);
  const days = useMemo(() => lastNDays(14), []);
  const data = useMemo(() => series(state.stats, days, campaign.id), [state.stats, days, campaign.id]);
  const perLink = useMemo(() => campaign.links.filter((l)=>l.label).map((l)=>({ name:l.label.slice(0,22), clicks:state.stats.byLink[l.id]||0 })).sort((a,b)=>b.clicks-a.clicks), [campaign.links, state.stats.byLink]);
  const max = Math.max(...perLink.map((x)=>x.clicks),1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Scans" value={t.scans} icon={ScanLine} />
        <Stat label="Clicks" value={t.clicks} icon={MousePointerClick} />
        <Stat label="Leads" value={t.leads} icon={Mail} />
        <Stat label="Scan→lead" value={conv===null?"—":conv+"%"} icon={TrendingUp} />
      </div>
      <Card>
        <SectionTitle>Last 14 days</SectionTitle>
        <div className="mt-4 h-[190px]">
          <Suspense fallback={<div className="h-[190px] rounded-lg bg-[#F7F7FC] animate-pulse" />}>
            <Charts.Traffic data={data} height={190} interval={2} showClicks={false} gradientId="gCamp" />
          </Suspense>
        </div>
      </Card>
      {perLink.length > 0 && (
        <Card>
          <SectionTitle>Clicks by link</SectionTitle>
          <div className="mt-4 space-y-2.5">
            {perLink.map((p) => (
              <div key={p.name}>
                <div className="flex justify-between mb-1">
                  <span className="text-[12.8px] text-[#3D3D52]">{p.name}</span>
                  <span className="text-[12.5px] font-mono text-[#0A0A14]">{p.clicks}</span>
                </div>
                <div className="rounded-full h-[5px] bg-[#F7F7FC]">
                  <div className="rounded-full h-[5px] bg-[#6B2FD9]" style={{ width:`${(p.clicks/max)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function Analytics({ state, store, onUpgrade, flash }) {
  const limits = limitsFor(state.meta?.plan);
  const [range, setRange] = useState(14);
  const days = useMemo(() => lastNDays(range), [range]);
  const data = useMemo(() => series(state.stats, days), [state.stats, days]);
  const win = useMemo(() => windowTotals(state.stats, days), [state.stats, days]);

  if (!limits.analytics) {
    return (
      <>
        <Header title="Analytics" sub="Which upload actually earns." />
        <div className="rounded-xl border border-[#E8E8F0] bg-white p-8 text-center max-w-lg mx-auto mt-6">
          <div className="w-12 h-12 rounded-xl bg-[#EDE8FF] flex items-center justify-center mx-auto"><BarChart3 size={22} className="text-[#6B2FD9]" /></div>
          <p className="mt-4 text-[18px] font-bold text-[#0A0A14]">Analytics is on Pro</p>
          <p className="mt-2 text-[13.5px] text-[#3D3D52] leading-relaxed max-w-sm mx-auto">
            See which video drives the most scans, clicks, and leads. Your data is already being counted — upgrade to see it.
          </p>
          <p className="mt-2 text-[12px] text-[#8A8A9C]">Each page still shows its own scan, click and lead counts for free.</p>
          <div className="mt-5"><Btn onClick={onUpgrade}>Upgrade to Pro — $9.99/mo</Btn></div>
        </div>
      </>
    );
  }

  const byCampaign = state.campaigns.map((c) => ({ id:c.id, name:c.title.slice(0,20), ...campaignTotals(state.stats,c.id) })).sort((a,b)=>b.scans-a.scans).slice(0,12);
  const hasTraffic = state.stats.totals.scans + state.stats.totals.clicks + state.stats.totals.leads > 0;

  return (
    <>
      <Header title="Analytics" sub="Which upload actually earns."
        right={<div className="flex gap-2">{[7,14,30].map((r) => <Btn key={r} size="sm" variant={range===r?"quiet":"ghost"} onClick={() => setRange(r)}>{r}d</Btn>)}</div>} />
      {!hasTraffic ? (
        <Empty icon={BarChart3} title="No traffic yet" body="Put a QR in a video. Scans and clicks show up here in real time." />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={`Scans·${range}d`} value={win.scans} icon={ScanLine} />
            <Stat label={`Clicks·${range}d`} value={win.clicks} icon={MousePointerClick} />
            <Stat label={`Leads·${range}d`} value={win.leads} icon={Mail} />
            <Stat label="Scan→lead" value={pct(win.leads,win.scans)===null?"—":pct(win.leads,win.scans)+"%"} icon={TrendingUp} />
          </div>
          <Card>
            <SectionTitle>Traffic — {range} days</SectionTitle>
            <div className="mt-4 h-[220px]">
              <Suspense fallback={<div className="h-[220px] rounded-lg bg-[#F7F7FC] animate-pulse" />}>
                <Charts.Traffic data={data} height={220} interval={Math.max(1,Math.floor(range/7))} gradientId="gAll" />
              </Suspense>
            </div>
          </Card>
          <Card>
            <SectionTitle>By video</SectionTitle>
            <div className="mt-4">
              <Suspense fallback={<div className="rounded-lg bg-[#F7F7FC] animate-pulse" style={{ height:Math.max(140,byCampaign.length*44) }} />}>
                <Charts.Bars data={byCampaign} />
              </Suspense>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

// ── Leads ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;
function Leads({ state, store, flash }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [camp, setCamp] = useState("all");
  const [exporting, setExporting] = useState(false);
  const searching = q.trim() !== "" || camp !== "all";

  useEffect(() => { setPage(0); }, [q, camp]);
  useEffect(() => {
    let cancelled = false; setLoading(true);
    const run = async () => {
      if (searching) {
        const r = await store.searchLeads({ query:q, campaignId:camp, limit:200 });
        if (cancelled) return; setRows(r.rows); setTotal(r.rows.length); setPages(1);
      } else {
        const r = await store.getLeadPage({ page, pageSize:PAGE_SIZE });
        if (cancelled) return; setRows(r.rows); setTotal(r.total); setPages(r.pages);
      }
      setLoading(false);
    };
    const t = setTimeout(run, searching?220:0); return () => { cancelled=true; clearTimeout(t); };
  }, [store, page, q, camp, searching, state.leadIndex.count]);

  const nameOf = useCallback((id) => state.campaigns.find((c) => c.id===id)?.title||"—", [state.campaigns]);

  const exportCsv = async () => {
    setExporting(true);
    const esc=(v)=>{ const s=String(v??""); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:`${s}`; };
    const parts=["email,name,video_page,captured_at\n"];
    await store.streamLeads((chunk) => { for (const l of chunk) { const c=state.campaigns.find((x)=>x.id===l.campaignId); parts.push([esc(l.email),esc(l.name||""),esc(c?.title||""),esc(new Date(l.ts).toISOString())].join(",")+"\n"); } });
    downloadBlob(parts.join(""),`clearpathqr-leads-${dayKey(Date.now())}.csv`);
    setExporting(false); flash(`Exported ${state.leadIndex.count.toLocaleString()} leads`);
  };

  if (state.leadIndex.count === 0) return (
    <>
      <Header title="Leads" sub="Everyone who traded an email for something you made." />
      <Empty icon={Mail} title="No leads yet" body="Turn on email capture inside a video page. Fills show up here instantly." />
    </>
  );

  return (
    <>
      <Header title="Leads" sub="Everyone who traded an email for something you made."
        right={<Btn onClick={exportCsv} disabled={exporting}>{exporting?<Spinner/>:<Download size={14}/>}{exporting?"Exporting":"Export CSV"}</Btn>} />
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 flex-1 min-w-[200px] bg-white border border-[#E8E8F0]">
          <Search size={14} className="text-[#8A8A9C]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search emails" className="w-full outline-none text-[13.2px] text-[#0A0A14]" />
          {loading&&searching&&<Spinner/>}
        </div>
        <select value={camp} onChange={(e) => setCamp(e.target.value)} className="rounded-lg px-3 py-2 outline-none bg-white border border-[#E8E8F0] text-[13px] text-[#3D3D52]">
          <option value="all">All pages</option>
          {state.campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E8F0]">
                {["Email","Name","From page","When",""].map((h) => <th key={h} className="text-left px-4 py-3 text-[11px] text-[#8A8A9C] font-bold uppercase tracking-[0.05em]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading&&rows.length===0&&Array.from({length:5}).map((_,i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 rounded bg-[#F7F7FC] animate-pulse"/></td></tr>)}
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-[#F7F7FC] hover:bg-[#F7F7FC]">
                  <td className="px-4 py-3 text-[13px] font-mono text-[#0A0A14]">{l.email}</td>
                  <td className="px-4 py-3 text-[13px] text-[#3D3D52]">{l.name||"—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#3D3D52]">{nameOf(l.campaignId)}</td>
                  <td className="px-4 py-3 text-[12.5px] text-[#8A8A9C] font-mono">{new Date(l.ts).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><button onClick={() => store.deleteLead(l.id)}><Trash2 size={13} className="text-[#8A8A9C] hover:text-red-500"/></button></td>
                </tr>
              ))}
              {!loading&&rows.length===0&&<tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-[#8A8A9C]">Nothing matches.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[#E8E8F0] flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-[#8A8A9C] font-mono">{searching?`${rows.length} match${rows.length===1?"":"es"}`:`${(page*PAGE_SIZE+1).toLocaleString()}–${Math.min((page+1)*PAGE_SIZE,total).toLocaleString()} of ${total.toLocaleString()}`}</span>
          {!searching&&pages>1&&(
            <div className="flex items-center gap-2">
              <Btn size="sm" variant="ghost" disabled={page===0} onClick={() => setPage(page-1)}>Previous</Btn>
              <span className="text-xs text-[#8A8A9C] font-mono">{page+1}/{pages}</span>
              <Btn size="sm" variant="ghost" disabled={page>=pages-1} onClick={() => setPage(page+1)}>Next</Btn>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

// ── Brand presets ─────────────────────────────────────────────────────────────
function BrandPresets({ state, store, flash }) {
  const [name, setName] = useState(""); const [themeId, setThemeId] = useState("paper");
  const presets = state.meta?.presets||[];
  const add = () => { if (!name.trim()) { flash("Give the preset a name"); return; } store.setMeta({ presets:[...presets,{id:uid(),name:name.trim(),themeId}] }); setName(""); flash("Preset saved"); };
  return (
    <>
      <Header title="Brand presets" sub="Save a look once, apply it to every page after." />
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <SectionTitle>New preset</SectionTitle>
          <div className="mt-4 space-y-4">
            <Field label="Name"><Input value={name} onChange={setName} placeholder="Main channel" /></Field>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.filter((t) => t.id!=="custom").map((t) => (
                <button key={t.id} onClick={() => setThemeId(t.id)} className={`rounded-lg p-2.5 border-2 ${themeId===t.id?"border-[#6B2FD9]":"border-[#E8E8F0]"}`} style={{ background:t.bg }}>
                  <span className="block w-4 h-4 rounded" style={{ background:t.btn }} />
                  <span className="block mt-1 text-[10px] font-semibold" style={{ color:t.text }}>{t.name}</span>
                </button>
              ))}
            </div>
            <Btn full onClick={add}><Plus size={14}/> Save preset</Btn>
          </div>
        </Card>
        <div>
          {presets.length===0 ? <Empty icon={Palette} title="No presets" body="Presets keep every page looking like one brand." /> : (
            <div className="space-y-3">
              {presets.map((p) => { const t=themeById(p.themeId); return (
                <Card key={p.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg border border-[#E8E8F0] flex items-center justify-center" style={{ background:t.bg }}><span className="w-4 h-4 rounded" style={{ background:t.btn }} /></div>
                      <div><p className="text-[13.8px] font-bold text-[#0A0A14]">{p.name}</p><p className="text-[11.5px] text-[#8A8A9C] font-mono">{t.name.toLowerCase()}</p></div>
                    </div>
                    <button onClick={() => store.setMeta({ presets:presets.filter((x)=>x.id!==p.id) })}><Trash2 size={14} className="text-[#8A8A9C] hover:text-red-500"/></button>
                  </div>
                </Card>
              ); })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Channel page ──────────────────────────────────────────────────────────────
function AvatarUploadChannel({ value, onChange, name }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const onFile = async (file) => {
    if (!file||!file.type.startsWith("image/")) return; setBusy(true);
    const dataUrl = await new Promise((res,rej)=>{ const reader=new FileReader(); reader.onload=()=>{ const img=new Image(); img.onload=()=>{ const s=256,cv=document.createElement("canvas"); cv.width=s; cv.height=s; const ctx=cv.getContext("2d"); const sc=Math.max(s/img.width,s/img.height); ctx.drawImage(img,(s-img.width*sc)/2,(s-img.height*sc)/2,img.width*sc,img.height*sc); res(cv.toDataURL("image/jpeg",0.82)); }; img.src=reader.result; }; reader.onerror=rej; reader.readAsDataURL(file); });
    onChange(dataUrl); setBusy(false);
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full overflow-hidden border border-[#E8E8F0] bg-[#F7F7FC] flex items-center justify-center shrink-0">
        {value?<img src={value} alt="" className="w-full h-full object-cover"/>:<span className="text-[22px] font-bold text-[#8A8A9C]">{(name||"C").slice(0,1).toUpperCase()}</span>}
      </div>
      <div className="flex-1">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2">
          <Btn size="sm" variant="ghost" onClick={() => ref.current?.click()} disabled={busy}>{busy?<Spinner/>:<User size={13}/>} {value?"Replace":"Upload photo"}</Btn>
          {value&&<Btn size="sm" variant="ghost" onClick={() => onChange("")}><Trash2 size={13}/></Btn>}
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#8A8A9C]">Shown on every page and your channel QR.</p>
      </div>
    </div>
  );
}

function ChannelPageView({ state, store, onUpgrade }) {
  const ch = state.meta?.channel||{};
  const limits = limitsFor(state.meta?.plan);
  const set = (patch) => store.setMeta({ channel:{ ...ch, ...patch } });
  const url = publicUrl(ch.slug||"yourchannel");
  const live = state.campaigns.filter((c) => !c.archived);

  return (
    <>
      <Header title="Channel page" sub="One master QR — every link you have, in one place." right={<CopyBtn text={url} size="md"/>} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="space-y-5">
          <Card>
            <SectionTitle>Profile</SectionTitle>
            <div className="mt-4 space-y-4">
              <AvatarUploadChannel value={ch.avatar||""} onChange={(v) => set({avatar:v})} name={ch.name} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Channel name"><Input value={ch.name||""} onChange={(v) => set({name:v})} placeholder="Busayo builds" /></Field>
                <Field label="Handle"><Input value={ch.handle||""} onChange={(v) => set({handle:v})} placeholder="@busayobuilds" mono /></Field>
              </div>
              <Field label="Tagline" hint="One line"><Input value={ch.tagline||""} onChange={(v) => set({tagline:v})} placeholder="Fintech, deals, and the spreadsheets behind them." /></Field>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionTitle>Channel QR code</SectionTitle>
                <p className="mt-1 text-[12.8px] text-[#8A8A9C] leading-snug max-w-sm">
                  Share this one code everywhere — YouTube, Twitter, email signature, your business card. It lists every live page you have, so you never update your QR again.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-5 flex-wrap">
              <div className="rounded-xl p-3.5 bg-white border border-[#E8E8F0]"><QR text={url} size={130}/></div>
              <div>
                <p className="text-[12px] font-mono text-[#8A8A9C] mb-3 break-all">{url}</p>
                {limits.channelQRDownload
                  ? <Btn onClick={() => downloadQRPng(url,"#0A0A14","#FFFFFF",ch.slug||"channel")}><Download size={13}/> Download PNG</Btn>
                  : (
                    <div>
                      <PaywallBadge onClick={onUpgrade} label="Download — Pro feature" />
                      <p className="mt-2 text-[12px] text-[#8A8A9C]">Upgrade to Pro to download the high-res PNG.</p>
                    </div>
                  )
                }
              </div>
            </div>
          </Card>
        </div>

        <div className="hidden lg:block sticky top-6">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A8A9C] flex items-center gap-1.5"><Globe size={13}/> Preview</p>
          <PhoneFrame>
            <div className="font-sans px-5 pt-7 pb-6 bg-white">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center mb-3 text-[23px] font-bold bg-[#6B2FD9] text-white">
                  {ch.avatar?<img src={ch.avatar} alt="" className="w-full h-full object-cover"/>:(ch.name||"C").slice(0,1).toUpperCase()}
                </div>
                <p className="text-[17px] font-bold text-[#0A0A14]">{ch.name||"Your channel"}</p>
                <p className="text-[12.5px] font-mono text-[#8A8A9C]">{ch.handle||"@handle"}</p>
                {ch.tagline&&<p className="mt-2 text-[13px] text-[#3D3D52] leading-snug">{ch.tagline}</p>}
              </div>
              <div className="mt-5 space-y-2">
                {live.length===0&&<p className="text-center py-4 text-[12.5px] text-[#8A8A9C]">Your live pages list here.</p>}
                {live.slice(0,8).map((c) => (
                  <div key={c.id} className="rounded-xl px-4 py-3 flex items-center gap-3 bg-[#F7F7FC] border border-[#E8E8F0]">
                    <Play size={13} className="text-[#8A8A9C]"/>
                    <span className="flex-1 truncate text-[13px] font-semibold text-[#0A0A14]">{c.title}</span>
                    <ChevronRight size={14} className="text-[#8A8A9C]"/>
                  </div>
                ))}
                {live.length>8&&<p className="text-center text-[12px] text-[#8A8A9C]">+{live.length-8} more</p>}
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </>
  );
}
