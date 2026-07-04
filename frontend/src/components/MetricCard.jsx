import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const COLORS = {
  primary: { icon: "var(--primary)", bg: "var(--primary-light)", bar: "var(--primary)" },
  success: { icon: "var(--success)", bg: "var(--success-light)", bar: "var(--success)" },
  warning: { icon: "var(--warning)", bg: "var(--warning-light)", bar: "var(--warning)" },
  danger: { icon: "var(--danger)", bg: "var(--danger-light)", bar: "var(--danger)" },
};

export default function MetricCard({
  label,
  value,
  unit = "%",
  icon: Icon,
  color = "primary",
  threshold,
  prevValue,
  inverse = false
}) {
  const c = COLORS[color] || COLORS.primary;
  const isBreached = inverse ? value <= threshold : value >= threshold;
  const isWarning = inverse
    ? !isBreached && value <= threshold + 20
    : !isBreached && value >= threshold * 0.8;
  const activeColor = isBreached ? COLORS.danger : isWarning ? COLORS.warning : c;
  const trend = prevValue !== undefined && prevValue !== null ? value - prevValue : null;

  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div>
          <div className="stat-label">{label}</div>
          <div className="stat-value" style={{ color: activeColor.icon }}>
            {value}{unit}
          </div>
        </div>
        <div className="stat-icon-wrap" style={{ background: activeColor.bg }}>
          <Icon size={22} style={{ color: activeColor.icon }} />
        </div>
      </div>

      <div className="stat-bar">
        <div
          className="stat-bar-fill"
          style={{ width: `${Math.min(value, 100)}%`, background: activeColor.bar }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: ".75rem" }}>
        {trend !== null ? (
          <span className={`stat-trend ${trend >= 0 ? "up" : "down"}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend).toFixed(1)}% vs last
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>Live reading</span>
        )}
        <span style={{
          color: isBreached ? "var(--danger)" : isWarning ? "var(--warning)" : "var(--success)",
          fontWeight: 600,
        }}>
          {isBreached ? "ALERT" : isWarning ? "WARN" : "OK"}
        </span>
      </div>
    </div>
  );
}
