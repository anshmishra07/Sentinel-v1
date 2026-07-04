import React from "react";
import { Cpu, HardDrive, Database, ShieldCheck, Server } from "lucide-react";
import { useSocket } from "../hooks/useSocket.js";
import MetricCard from "../components/MetricCard.jsx";
import LiveChart from "../components/LiveChart.jsx";
import ThresholdSettings from "../components/ThresholdSettings.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import SystemInfo from "../components/Systeminfo.jsx";
import ProcessTable from "../components/ProcessTable.jsx";

export default function Dashboard() {
  const {
    history, latest, alerts, thresholds, updateThresholds,
    alertsEnabled, toggleAlerts, alertEmail, updateAlertEmail,
    range, setRange, devices, notificationStatus, sendTestNotification, verifyNotifications
  } = useSocket();
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const onlineDevices = devices.filter((device) => device.status === "online").length;
  const offlineDevices = devices.filter((device) => device.status !== "online").length;

  const STAT_CARDS = [
    { label: "CPU Usage", value: latest?.cpu.loadPercent ?? 0, icon: Cpu, color: "primary", threshold: thresholds.cpu, prevValue: prev?.cpu },
    { label: "Memory Usage", value: latest?.memory.usedPercent ?? 0, icon: HardDrive, color: "success", threshold: thresholds.memory, prevValue: prev?.memory },
    { label: "Disk Usage", value: latest?.disk.usedPercent ?? 0, icon: Database, color: "warning", threshold: thresholds.disk, prevValue: prev?.disk },
    { label: "Health Score", value: latest?.healthScore ?? 100, icon: ShieldCheck, color: "success", threshold: 60, prevValue: null, inverse: true },
  ];

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h2 className="page-title">System Dashboard</h2>
          <p className="page-subtitle">Real-time CPU, Memory &amp; Disk monitoring</p>
        </div>
        <span style={{ fontSize: ".72rem", color: "var(--text-muted)", background: "var(--surface)", border: "1px solid var(--border)", padding: ".35rem .875rem", borderRadius: 8, fontFamily: "var(--font-mono)" }}>
          Polling every 3s
        </span>
      </div>

      <div className="fleet-strip">
        <div><Server size={16} /> {onlineDevices} online</div>
        <div>{offlineDevices} offline</div>
        <div>{devices.length} total devices</div>
        <div>{latest?.healthStatus ?? "healthy"}</div>
      </div>

      <div className="stat-grid">
        {STAT_CARDS.map((card) => <MetricCard key={card.label} {...card} />)}
      </div>

      <div className="content-grid">
        <LiveChart history={history} range={range} onRangeChange={setRange} />
        <ThresholdSettings 
          thresholds={thresholds} onUpdate={updateThresholds} 
          alertsEnabled={alertsEnabled} onToggleAlerts={toggleAlerts}
          alertEmail={alertEmail} onUpdateEmail={updateAlertEmail}
          notificationStatus={notificationStatus}
          onSendTest={sendTestNotification}
          onVerify={verifyNotifications}
        />
      </div>

      <div className="bottom-grid">
        <AlertBanner alerts={alerts} />
        <SystemInfo network={latest?.network} uptimeSeconds={latest?.uptimeSeconds} />
      </div>

      <ProcessTable processes={latest?.processes} />
    </main>
  );
}
