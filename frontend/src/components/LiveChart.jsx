import React from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { Activity } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #ebebeb",
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 4px 20px rgba(93,89,108,.12)",
      fontSize: 12, fontFamily: "Inter, sans-serif",
    }}>
      <p style={{ color: "#a5a3ae", marginBottom: 6, fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
};

const RANGES = [
  { key: "1h", label: "1H" },
  { key: "24h", label: "24H" },
  { key: "7d", label: "7D" }
];

export default function LiveChart({ history, range, onRangeChange }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-header">
        <h3 className="card-title">
          <Activity size={16} style={{ color: "var(--primary)" }} />
          Live Telemetry Stream
        </h3>
        <div className="segmented-control">
          {RANGES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={range === item.key ? "active" : ""}
              onClick={() => onRangeChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-wrap">
        {history.length < 2 ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", gap: ".5rem",
          }}>
            <Activity size={28} style={{ opacity: .3 }} />
            <span style={{ fontSize: ".8rem" }}>Buffering telemetry…</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                {[
                  { id: "cpu",    color: "#7367f0" },
                  { id: "memory", color: "#28c76f" },
                  { id: "disk",   color: "#ff9f43" },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.0}  />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid stroke="#f0eef7" vertical={false} />
              <XAxis
                dataKey="time" stroke="#d4d2d9" fontSize={11}
                tickLine={false} axisLine={false}
                tick={{ fill: "#a5a3ae" }}
              />
              <YAxis
                stroke="#d4d2d9" fontSize={11}
                tickLine={false} axisLine={false}
                domain={[0, 100]} tick={{ fill: "#a5a3ae" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(v) => <span style={{ color: "var(--text-primary)" }}>{v}</span>}
              />
              <Area type="monotone" dataKey="cpu"    name="CPU %"    stroke="#7367f0" fill="url(#fill-cpu)"    strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="memory" name="Memory %"  stroke="#28c76f" fill="url(#fill-memory)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="disk"   name="Disk %"   stroke="#ff9f43" fill="url(#fill-disk)"   strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
