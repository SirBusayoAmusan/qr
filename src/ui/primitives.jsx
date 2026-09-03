import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { qrMatrix } from "../lib/qr.js";

export const BASE_URL = "qr.clearpath.click";
export const BRAND = "ClearpathQR";

export const PUBLIC_ORIGIN =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://" + BASE_URL;
export const publicUrl = (slug) => `${PUBLIC_ORIGIN}/p/${slug}`;
export const displayUrl = (slug) => `${BASE_URL}/p/${slug}`;

// ── Brand colors (from landing mockup) ──────────────────────────────────────
export const C = {
  purple:     "#6B2FD9",
  purpleDark: "#5420B8",
  purpleLight:"#EDE8FF",
  ink:        "#0A0A14",
  body:       "#3D3D52",
  muted:      "#8A8A9C",
  line:       "#E8E8F0",
  soft:       "#F7F7FC",
  white:      "#FFFFFF",
  good:       "#0A8A5F",
  goodSoft:   "#E6F6F0",
  bad:        "#C0392B",
};

export const THEMES = [
  { id:"paper",  name:"Paper",  bg:"#FFFFFF", card:"#F7F7FC", text:"#0A0A14", sub:"#71717A", btn:"#6B2FD9", btnText:"#FFFFFF" },
  { id:"ink",    name:"Ink",    bg:"#0A0A14", card:"#1C1C2E", text:"#FFFFFF", sub:"#A1A1B5", btn:"#FFFFFF", btnText:"#0A0A14" },
  { id:"violet", name:"Violet", bg:"#F3F0FF", card:"#FFFFFF", text:"#1E1140", sub:"#6D5BA6", btn:"#6B2FD9", btnText:"#FFFFFF" },
  { id:"forest", name:"Forest", bg:"#F1F7F3", card:"#FFFFFF", text:"#10281C", sub:"#4E7A64", btn:"#0A8A5F", btnText:"#FFFFFF" },
  { id:"sunset", name:"Sunset", bg:"#FFF6EF", card:"#FFFFFF", text:"#3A1D07", sub:"#94694A", btn:"#D9600B", btnText:"#FFFFFF" },
  { id:"slate",  name:"Slate",  bg:"#F1F4F8", card:"#FFFFFF", text:"#0F1B2D", sub:"#5B6B84", btn:"#1E3A5F", btnText:"#FFFFFF" },
  { id:"rose",   name:"Rose",   bg:"#FFF0F3", card:"#FFFFFF", text:"#3A0A14", sub:"#9A5060", btn:"#D92B6B", btnText:"#FFFFFF" },
  { id:"ocean",  name:"Ocean",  bg:"#EFF6FF", card:"#FFFFFF", text:"#0A1A3A", sub:"#3D6080", btn:"#1A6BD9", btnText:"#FFFFFF" },
  { id:"custom", name:"Custom", bg:"#FFFFFF", card:"#F7F7FC", text:"#0A0A14", sub:"#71717A", btn:"#6B2FD9", btnText:"#FFFFFF" },
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

// ── Buttons ──────────────────────────────────────────────────────────────────
const BTN_V = {
  primary: `bg-[#6B2FD9] text-white border-[#6B2FD9] hover:bg-[#5420B8] hover:border-[#5420B8]`,
  ghost:   `bg-transparent text-[#3D3D52] border-[#E8E8F0] hover:bg-[#F7F7FC]`,
  quiet:   `bg-[#F7F7FC] text-[#3D3D52] border-transparent hover:opacity-80`,
  danger:  `bg-white text-[#C0392B] border-red-200 hover:bg-red-50`,
  dark:    `bg-[#0A0A14] text-white border-[#0A0A14] hover:opacity-85`,
};
const BTN_S = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-[13.5px]", lg:"px-6 py-3 text-[15px]" };

export function Btn({ children, onClick, variant="primary", size="md", disabled, full, className="" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold tracking-[-0.01em] transition-all
        ${BTN_V[variant]||BTN_V.primary} ${BTN_S[size]}
        ${full?"w-full":""} ${disabled?"opacity-40 cursor-not-allowed":""} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label htmlFor={htmlFor} className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#8A8A9C]">{label}</label>
        {hint && <span className="text-[11.5px] text-[#8A8A9C]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, mono, prefix, type="text", onKeyDown, autoFocus, id, disabled, invalid }) {
  return (
    <div className={`flex items-stretch rounded-lg overflow-hidden bg-white border ${invalid?"border-red-400":"border-[#E8E8F0]"}`}>
      {prefix && <span className="flex items-center px-2.5 shrink-0 bg-[#F7F7FC] text-[#8A8A9C] text-[12px] font-mono border-r border-[#E8E8F0]">{prefix}</span>}
      <input id={id} type={type} value={value} disabled={disabled} autoFocus={autoFocus}
        onKeyDown={onKeyDown} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full outline-none px-3 py-2.5 text-[13.5px] text-[#0A0A14] bg-transparent placeholder:text-[#8A8A9C] ${mono?"font-mono":""} ${disabled?"opacity-60":""}`} />
    </div>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full outline-none px-3 py-2.5 text-[13.5px] text-[#0A0A14] bg-white border border-[#E8E8F0] rounded-lg placeholder:text-[#8A8A9C] resize-none" />
  );
}

// Full hex color picker
export function ColorPicker({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E8E8F0] cursor-pointer shrink-0">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <div className="w-full h-full rounded-lg" style={{ background: value }} />
      </div>
      {label && <span className="text-[12.5px] text-[#3D3D52]">{label}</span>}
    </div>
  );
}

export function Card({ children, className="", pad=true }) {
  return <div className={`rounded-xl bg-white border border-[#E8E8F0] ${pad?"p-5":""} ${className}`}>{children}</div>;
}
export function SectionTitle({ children }) {
  return <h3 className="text-[15px] font-bold tracking-[-0.02em] text-[#0A0A14]">{children}</h3>;
}
export function Stat({ label, value, icon: Icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A8A9C]">{label}</span>
        {Icon && <Icon size={15} className="text-[#8A8A9C]" />}
      </div>
      <div className="mt-3">
        <span className="font-mono text-[28px] font-bold tracking-[-0.03em] leading-none text-[#0A0A14]">{value}</span>
      </div>
    </Card>
  );
}
const PILL_C = { neutral:"bg-[#F7F7FC] text-[#3D3D52]", accent:"bg-[#EDE8FF] text-[#6B2FD9]", good:"bg-[#E6F6F0] text-[#0A8A5F]", bad:"bg-red-50 text-red-600" };
export function Pill({ children, tone="neutral" }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold font-mono tracking-[0.02em] ${PILL_C[tone]}`}>{children}</span>;
}
export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-dashed border-[#E8E8F0] bg-[#F7F7FC]">
      <Icon size={22} className="text-[#8A8A9C]" />
      <p className="mt-3 text-[15px] font-bold text-[#0A0A14]">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#8A8A9C] leading-relaxed">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Toggle({ on, onChange, small, label }) {
  const w=small?34:42, h=small?20:24, k=small?14:18;
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      className={`rounded-full shrink-0 relative transition-colors ${on?"bg-[#6B2FD9]":"bg-gray-300"}`}
      style={{ width:w, height:h }}>
      <span className="absolute rounded-full bg-white transition-all" style={{ width:k, height:k, top:(h-k)/2, left:on?w-k-3:3 }} />
    </button>
  );
}
export function CopyBtn({ text, size="sm" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text); } catch {}
    setDone(true); setTimeout(() => setDone(false), 1400);
  };
  return <Btn size={size} variant="ghost" onClick={copy}>{done?<Check size={13}/>:<Copy size={13}/>}{done?"Copied":"Copy"}</Btn>;
}
export function Spinner({ className="" }) {
  return <span className={`inline-block rounded-full border-2 border-[#E8E8F0] border-t-[#6B2FD9] animate-spin ${className}`} style={{ width:14, height:14 }} />;
}
export function PaywallBadge({ onClick, label="Pro feature" }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-[#EDE8FF] text-[#6B2FD9] text-[12px] font-bold">
      🔒 {label}
    </button>
  );
}

// ── QR ───────────────────────────────────────────────────────────────────────
export function QR({ text, size=200, fg="#0A0A14", bg="#FFFFFF", quiet=3, badge }) {
  const result = useMemo(() => { try { return qrMatrix(text||" "); } catch { return null; } }, [text]);
  if (!result) return <div className="flex items-center justify-center rounded-lg bg-[#F7F7FC] text-[#8A8A9C] text-xs" style={{ width:size, height:size }}>Too long</div>;
  const { modules, size:n } = result;
  const total = n + quiet*2;
  let d = "";
  for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (modules[r][c]) d+=`M${c+quiet} ${r+quiet}h1v1h-1z`;
  const bs=Math.round(n*0.22), bOff=quiet+Math.round((n-bs)/2);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" role="img" aria-label="QR code" className="block rounded-[10px]">
      <rect width={total} height={total} fill={bg}/>
      <path d={d} fill={fg}/>
      {badge&&(<g><rect x={bOff} y={bOff} width={bs} height={bs} fill={bg} rx={1}/><rect x={bOff+1} y={bOff+1} width={bs-2} height={bs-2} fill={fg} rx={1}/><text x={bOff+bs/2} y={bOff+bs/2+bs*0.23} textAnchor="middle" fill={bg} fontWeight="700" fontSize={bs*0.62}>{badge.slice(0,1).toUpperCase()}</text></g>)}
    </svg>
  );
}

export function downloadQRPng(text, fg, bg, filename, scale=16, opts={}) {
  try {
    const { modules, size:n } = qrMatrix(text);
    const quiet=3, grid=(n+quiet*2)*scale, labelH=opts.scanLabel?Math.round(scale*6):0;
    const cv=document.createElement("canvas"); cv.width=grid; cv.height=grid+labelH;
    const ctx=cv.getContext("2d"); ctx.fillStyle=bg; ctx.fillRect(0,0,cv.width,cv.height);
    if (opts.scanLabel) { ctx.fillStyle=fg; ctx.font=`700 ${Math.round(scale*2.6)}px Inter,sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("SCAN HERE",grid/2,labelH/2); }
    ctx.fillStyle=fg;
    for (let r=0;r<n;r++) for (let c=0;c<n;c++) if (modules[r][c]) ctx.fillRect((c+quiet)*scale,labelH+(r+quiet)*scale,scale,scale);
    if (opts.badge) { const bs=Math.round(n*0.22)*scale,bx=(grid-bs)/2,by=labelH+(grid-bs)/2; ctx.fillStyle=bg; ctx.fillRect(bx,by,bs,bs); ctx.fillStyle=fg; ctx.fillRect(bx+scale,by+scale,bs-scale*2,bs-scale*2); ctx.fillStyle=bg; ctx.font=`700 ${Math.round(bs*0.6)}px Inter,sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(String(opts.badge).slice(0,1).toUpperCase(),grid/2,by+bs/2); }
    const a=document.createElement("a"); a.href=cv.toDataURL("image/png"); a.download=filename+".png"; a.click(); return true;
  } catch { return false; }
}

export function downloadBlob(content, filename, mime="text/csv") {
  const blob=new Blob([content],{type:mime+";charset=utf-8;"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
