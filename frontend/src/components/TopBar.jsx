import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function TopBar({ connected, alertCount }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "var(--primary)" : "var(--text-muted)";

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '24px', fontWeight: 'bold' }}>
        <Link to="/" style={{ color: isActive('/'), textDecoration: 'none' }}>Dashboard</Link>
        <Link to="/devices" style={{ color: isActive('/devices'), textDecoration: 'none' }}>Devices</Link>
      </div>

      <div className="topbar-right">
        {/* Connection badge */}
        <div className={`connection-pill ${connected ? "online" : "offline"}`}>
          <span className="status-dot" />
          {connected ? "Live" : "Disconnected"}
        </div>
      </div>
    </header>
  );
}
