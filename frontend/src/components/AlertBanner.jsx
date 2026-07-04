import React from "react";
import { Terminal, ShieldCheck, AlertTriangle, AlertOctagon } from "lucide-react";

export default function AlertBanner({ alerts }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <Terminal size={16} style={{ color: "var(--primary)" }} />
          Diagnostics &amp; Alerts
        </h3>
        <span style={{
          background: alerts.length > 0 ? "var(--danger-light)" : "var(--success-light)",
          color: alerts.length > 0 ? "var(--danger)" : "var(--success)",
          fontSize: ".72rem", fontWeight: 700,
          padding: ".25rem .7rem", borderRadius: 99,
        }}>
          {alerts.length > 0 ? `${alerts.length} active` : "All clear"}
        </span>
      </div>

      <div className="alert-feed">
        {alerts.length === 0 ? (
          <div className="no-alert-box">
            <ShieldCheck size={36} style={{ color: "var(--success)", opacity: .5 }} />
            All nodes within normal parameters.<br />No threshold breaches detected.
          </div>
        ) : (
          alerts.map((alert) => {
            const isDanger  = alert.value >= alert.threshold * 1.1;
            return (
              <div key={alert.id} className={`alert-row ${isDanger ? "danger" : "warning"}`}>
                <div className="alert-row-icon">
                  {isDanger
                    ? <AlertOctagon size={15} style={{ color: "var(--danger)" }} />
                    : <AlertTriangle size={15} style={{ color: "var(--warning)" }} />}
                </div>
                <div className="alert-row-body">
                  <div className="alert-row-msg">{alert.message}</div>
                  <div className="alert-row-time">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0,
                  fontSize: ".68rem", fontWeight: 700,
                  color: isDanger ? "var(--danger)" : "var(--warning)",
                  background: isDanger ? "var(--danger-light)" : "var(--warning-light)",
                  padding: ".15rem .45rem", borderRadius: 6,
                }}>
                  {alert.type.toUpperCase()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}