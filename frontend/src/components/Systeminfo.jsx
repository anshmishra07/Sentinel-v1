import React from "react";
import { Wifi, Clock, ArrowDown, ArrowUp } from "lucide-react";

function formatUptime(seconds) {
  if (!seconds) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function SystemInfo({ network, uptimeSeconds }) {
  const rows = [
    { icon: ArrowDown, label: "Download", value: `${network?.rxKBs ?? 0} KB/s`, color: "var(--success)" },
    { icon: ArrowUp, label: "Upload", value: `${network?.txKBs ?? 0} KB/s`, color: "var(--primary)" },
    { icon: ArrowDown, label: "Total Down", value: `${network?.totalRxMB ?? 0} MB`, color: "var(--info)" },
    { icon: ArrowUp, label: "Total Up", value: `${network?.totalTxMB ?? 0} MB`, color: "var(--warning)" },
    { icon: Wifi, label: "Interface", value: network?.iface ?? "-", color: "var(--info)" },
    { icon: Clock, label: "OS Uptime", value: formatUptime(uptimeSeconds), color: "var(--warning)" },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Wifi size={16} style={{ color: "var(--primary)" }} />
          Network &amp; System
        </h3>
      </div>
      <div className="sysinfo-grid">
        {rows.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="sysinfo-item">
            <div style={{ display: "flex", alignItems: "center", gap: ".35rem", marginBottom: ".25rem" }}>
              <div style={{
                background: `${color}18`, borderRadius: 6,
                width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={13} style={{ color }} />
              </div>
              <span className="sysinfo-label">{label}</span>
            </div>
            <span className="sysinfo-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
