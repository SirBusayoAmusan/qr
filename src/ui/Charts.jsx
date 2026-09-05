import React from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";

const TIP = { fontSize: 12, borderRadius: 8, border: "1px solid #E8E8ED" };
const AXIS = { fontSize: 10.5, fill: "#8A8A94" };

export function TrafficChart({ data, height = 220, interval = 2, showClicks = true, gradientId = "gTraffic" }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4E2BE8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#4E2BE8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#E8E8ED" vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={interval} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TIP} />
          <Area type="monotone" dataKey="scans" stroke="#4E2BE8" strokeWidth={2} fill={`url(#${gradientId})`} />
          {showClicks && <Area type="monotone" dataKey="clicks" stroke="#9CA3AF" strokeWidth={1.5} fill="transparent" />}
          <Area type="monotone" dataKey="leads" stroke="#0A8A5F" strokeWidth={2} fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CampaignBars({ data }) {
  return (
    <div style={{ height: Math.max(140, data.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11.5, fill: "#3F3F46" }}
            axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TIP} cursor={{ fill: "#F7F7F9" }} />
          <Bar dataKey="scans" radius={[0, 5, 5, 0]}>
            {data.map((_, i) => <Cell key={i} fill={i === 0 ? "#4E2BE8" : "#C7BDF5"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
