import React from "react";
import { useSocket } from "../hooks/useSocket.js";

export default function Devices() {
  const { devices } = useSocket();
  const online = devices.filter((device) => device.status === "online").length;
  const offline = devices.length - online;

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Devices</h2>
          <p className="page-subtitle">Monitored laptops, desktops, VMs, and servers</p>
        </div>
      </div>

      <div className="fleet-strip">
        <div>{online} online</div>
        <div>{offline} offline</div>
        <div>{devices.length} registered</div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Type</th>
                <th>OS</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Health</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.deviceId}>
                  <td>{device.hostname}</td>
                  <td>{device.deviceType || "remote-server"}</td>
                  <td>{device.os}</td>
                  <td>{device.ip_address}</td>
                  <td>
                    <span className={`connection-pill ${device.status === "online" ? "online" : "offline"}`} style={{ display: "inline-flex", padding: "4px 8px" }}>
                      {device.status}
                    </span>
                  </td>
                  <td>{device.healthScore ?? 100}/100 {device.healthStatus ?? "healthy"}</td>
                  <td>{new Date(device.last_seen).toLocaleString()}</td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No devices registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
