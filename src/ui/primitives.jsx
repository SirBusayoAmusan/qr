import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { qrMatrix } from "../lib/qr.js";

export const BASE_URL = "qr.clearpath.click";

// The QR code has to point at a URL that actually resolves. In the browser
// that's wherever the app is deployed (the Netlify URL, a custom domain, or
// localhost). The pretty qr.clearpath.click is only shown as a label until the
// real domain is wired up. `publicUrl(slug)` is what the QR encodes.
export const PUBLIC_ORIGIN =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://" + BASE_URL;
export const publicUrl = (slug) => `${PUBLIC_ORIGIN}/p/${slug}`;
// Short, pretty version for display next to inputs.
export const displayUrl = (slug) => `${BASE_URL}/${slug}`;

export const THEMES = [
  { id: "paper", name: "Paper", bg: "#FFFFFF", card: "#F7F7F9", text: "#0E0E12", sub: "#71717A", btn: "#0E0E12", btnText: "#FFFFFF" },
  { id: "ink", name: "Ink", bg: "#0E0E12", card: "#1C1C22", text: "#FFFFFF", sub: "#A1A1AA", btn: "#FFFFFF", btnText: "#0E0E12" },
  { id: "violet", name: "Violet", bg: "#F3F0FF", card: "#FFFFFF", text: "#1E1140", sub: "#6D5BA6", btn: "#4E2BE8", btnText: "#FFFFFF" },
  { id: "forest", name: "Forest", bg: "#F1F7F3", card: "#FFFFFF", text: "#10281C", sub: "#4E7A64", btn: "#0A8A5F", btnText: "#FFFFFF" },
  { id: "sunset", name: "Sunset", bg: "#FFF6EF", card: "#FFFFFF", text: "#3A1D07", sub: "#94694A", btn: "#D9600B", btnText: "#FFFFFF" },
  { id: "slate", name: "Slate", bg: "#F1F4F8", card: "#FFFFFF", text: "#0F1B2D", sub: "#5B6B84", btn: "#1E3A5F", btnText: "#FFFFFF" },
];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 42);

export const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export function youtubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

/* ── buttons ─────────────────────────────────────────────────────────────── */

const BTN = {
  primary: "bg-ink text-white border-ink hover:opacity-85",
  accent: "bg-accent text-white border-accent hover:opacity-85",
  ghost: "bg-transparent text-body border-line hover:bg-soft",
  quiet: "bg-soft text-body border-transparent hover:opacity-80",
  danger: "bg-white text-bad border-red-200 hover:bg-red-50",
};
const SIZE = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-[13.5px]",
  lg: "px-5 py-3 text-[15px]",
};

export function Btn({ children, onClick, variant = "primary", size = "md", disabled, className = "", full, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-medium tracking-[-0.01em] transition
        ${BTN[variant]} ${SIZE[size]} ${full ? "w-full" : ""}
        ${disabled ? "opacity-40 cursor-not-allowed hover:opacity-40" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={htmlFor} className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">
          {label}
        </label>
        {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, mono, prefix, type = "text", onKeyDown, autoFocus, id, disabled, invalid }) {
  return (
    <div className={`flex items-stretch rounded-lg overflow-hidden bg-white border ${invalid ? "border-bad" : "border-line"}`}>
      {prefix && (
        <span className="flex items-center px-2.5 shrink-0 bg-soft text-muted text-[12.5px] font-mono border-r border-line">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full outline-none px-3 py-2.5 text-[13.5px] text-ink bg-transparent placeholder:text-muted
          ${mono ? "font-mono" : "font-sans"} ${disabled ? "opacity-60" : ""}`}
      />
    </div>
  );
}

export function Card({ children, className = "", pad = true }) {
  return (
    <div className={`rounded-xl bg-white border border-line ${pad ? "p-5" : ""} ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children }) {
  return <h3 className="text-[15px] font-semibold tracking-display text-ink">{children}</h3>;
}

export function Stat({ label, value, icon: Icon, tone }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted">{label}</span>
        {Icon && <Icon size={15} className="text-muted" />}
      </div>
      <div className="mt-3">
        <span className={`font-mono nums text-[28px] font-semibold tracking-[-0.03em] leading-none ${tone === "good" ? "text-good" : "text-ink"}`}>
          {value}
        </span>
      </div>
    </Card>
  );
}

const PILL = {
  neutral: "bg-soft text-body",
  accent: "bg-accent-soft text-accent",
  good: "bg-good-soft text-good",
  warn: "bg-orange-50 text-warn",
  bad: "bg-red-50 text-bad",
};
export function Pill({ children, tone = "neutral" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold font-mono tracking-[0.02em] ${PILL[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-dashed border-line bg-soft">
      <Icon size={22} className="text-muted" />
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-muted leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, small, label }) {
  const w = small ? 34 : 42, h = small ? 20 : 24, k = small ? 14 : 18;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`rounded-full shrink-0 relative transition-colors ${on ? "bg-accent" : "bg-gray-300"}`}
      style={{ width: w, height: h }}
    >
      <span
        className="absolute rounded-full bg-white transition-all"
        style={{ width: k, height: k, top: (h - k) / 2, left: on ? w - k - 3 : 3 }}
      />
    </button>
  );
}

export function CopyBtn({ text, size = "sm" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch { /* clipboard blocked */ }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <Btn size={size} variant="ghost" onClick={copy}>
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? "Copied" : "Copy"}
    </Btn>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span className={`inline-block rounded-full border-2 border-line border-t-accent animate-spin ${className}`}
      style={{ width: 14, height: 14 }} />
  );
}

/* ── QR ──────────────────────────────────────────────────────────────────── */

export function QR({ text, size = 200, fg = "#0E0E12", bg = "#FFFFFF", quiet = 3, badge }) {
  const result = useMemo(() => {
    try { return qrMatrix(text || " "); } catch { return null; }
  }, [text]);

  if (!result) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-soft text-muted text-xs"
        style={{ width: size, height: size }}>
        Too much content
      </div>
    );
  }

  const { modules, size: n } = result;
  const total = n + quiet * 2;
  // One path beats thousands of <rect> nodes: at version 10 that's 3,249
  // cells, and the DOM cost of drawing those individually is visible on a
  // page that renders a grid of codes.
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  const badgeSize = Math.round(n * 0.22);
  const badgeOff = quiet + Math.round((n - badgeSize) / 2);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges"
      role="img" aria-label="QR code" className="block rounded-[10px]">
      <rect width={total} height={total} fill={bg} />
      <path d={d} fill={fg} />
      {badge && (
        <g>
          <rect x={badgeOff} y={badgeOff} width={badgeSize} height={badgeSize} fill={bg} rx={1} />
          <rect x={badgeOff + 1} y={badgeOff + 1} width={badgeSize - 2} height={badgeSize - 2} fill={fg} rx={1} />
          <text x={badgeOff + badgeSize / 2} y={badgeOff + badgeSize / 2 + badgeSize * 0.23}
            textAnchor="middle" fill={bg} fontWeight="700" fontSize={badgeSize * 0.62}>
            {badge.slice(0, 1).toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );
}

export function downloadQRPng(text, fg, bg, filename, scale = 16, opts = {}) {
  try {
    const { modules, size: n } = qrMatrix(text);
    const quiet = 3;
    const grid = (n + quiet * 2) * scale;
    const labelH = opts.scanLabel ? Math.round(scale * 6) : 0;
    const total = grid;
    const cv = document.createElement("canvas");
    cv.width = total;
    cv.height = total + labelH;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cv.width, cv.height);

    if (opts.scanLabel) {
      ctx.fillStyle = fg;
      ctx.font = `700 ${Math.round(scale * 2.6)}px -apple-system, Segoe UI, Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const spaced = "SCAN HERE".split("").join("\u200a");
      ctx.fillText(spaced, total / 2, labelH / 2);
    }

    const yOff = labelH;
    ctx.fillStyle = fg;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (modules[r][c]) ctx.fillRect((c + quiet) * scale, yOff + (r + quiet) * scale, scale, scale);

    if (opts.badge) {
      const bs = Math.round(n * 0.22) * scale;
      const bx = (total - bs) / 2;
      const by = yOff + (grid - bs) / 2;
      ctx.fillStyle = bg;
      ctx.fillRect(bx, by, bs, bs);
      ctx.fillStyle = fg;
      ctx.fillRect(bx + scale, by + scale, bs - scale * 2, bs - scale * 2);
      ctx.fillStyle = bg;
      ctx.font = `700 ${Math.round(bs * 0.6)}px -apple-system, Segoe UI, Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(opts.badge).slice(0, 1).toUpperCase(), total / 2, by + bs / 2);
    }

    const a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = filename + ".png";
    a.click();
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(content, filename, mime = "text/csv") {
  const blob = new Blob([content], { type: mime + ";charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
