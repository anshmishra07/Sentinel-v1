import React, { useState, useEffect } from "react";
import { Sliders, Check, Save, Bell, BellOff, Send, ShieldCheck } from "lucide-react";

const TRACKS = [
  { key: "cpu",    label: "CPU Alert",    color: "#7367f0" },
  { key: "memory", label: "RAM Alert",    color: "#28c76f" },
  { key: "disk",   label: "Disk Alert",   color: "#ff9f43" },
];

function validateRecipients(value) {
  const entries = String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (entries.length === 0) return { valid: false, message: "Enter at least one email address." };

  const invalid = entries.filter((item) => {
    if (item.length > 254 || item.includes("..")) return true;
    const parts = item.split("@");
    if (parts.length !== 2) return true;
    const [local, domain] = parts;
    if (!local || !domain || local.length > 64) return true;
    if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return true;
    return !/^[^\s@]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(item);
  });

  return invalid.length > 0
    ? { valid: false, message: `Invalid email${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}` }
    : { valid: true, message: "" };
}

export default function ThresholdSettings({
  thresholds,
  onUpdate,
  alertsEnabled,
  onToggleAlerts,
  alertEmail,
  onUpdateEmail,
  notificationStatus,
  onSendTest,
  onVerify
}) {
  const [vals, setVals] = useState({ ...thresholds });
  const [email, setEmail] = useState(alertEmail);
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState({ status: "idle", message: "" });
  const [verifyState, setVerifyState] = useState({ status: "idle", message: "" });

  useEffect(() => { setVals({ ...thresholds }); }, [thresholds]);
  useEffect(() => { setEmail(alertEmail); }, [alertEmail]);

  const hasChanges = TRACKS.some(({ key }) => vals[key] !== thresholds[key]) || email !== alertEmail;

  function handleSave(e) {
    e.preventDefault();
    if (!hasChanges) return;
    const validation = validateRecipients(email);
    if (!validation.valid) {
      setTestState({ status: "error", message: validation.message });
      return;
    }

    onUpdate(vals);
    if (email !== alertEmail) onUpdateEmail(email);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSendTest() {
    const validation = validateRecipients(email);
    if (!validation.valid) {
      setTestState({ status: "error", message: validation.message });
      return;
    }

    setTestState({ status: "sending", message: "Sending test email..." });
    try {
      if (email !== alertEmail) onUpdateEmail(email);
      await onSendTest(email);
      setTestState({ status: "sent", message: "Test notification sent." });
    } catch (err) {
      setTestState({ status: "error", message: err.message });
    }
  }

  async function handleVerify() {
    setVerifyState({ status: "sending", message: "Checking email configuration..." });
    try {
      const result = await onVerify();
      setVerifyState({ status: "sent", message: result.message || "Email configuration verified." });
    } catch (err) {
      setVerifyState({ status: "error", message: err.message });
    }
  }

  const emailReady = Boolean(notificationStatus?.emailConfigured && notificationStatus?.emailValid !== false);
  const productionReady = Boolean(notificationStatus?.productionReady);
  const provider = notificationStatus?.emailProvider === "resend"
    ? "Resend"
    : "Email";

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: "1rem" }}>
        <h3 className="card-title">
          <Sliders size={16} style={{ color: "var(--primary)" }} />
          Alerts &amp; Notifications
        </h3>
        <button 
          type="button"
          onClick={() => onToggleAlerts(!alertsEnabled)}
          style={{
            background: alertsEnabled ? "var(--success-light)" : "var(--danger-light)",
            color: alertsEnabled ? "var(--success)" : "var(--danger)",
            border: "none", padding: "0.4rem 0.8rem", borderRadius: "99px",
            fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.4rem"
          }}
        >
          {alertsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          {alertsEnabled ? "Alerts On" : "Alerts Off"}
        </button>
      </div>

      <form onSubmit={handleSave} className="threshold-form">
        <div className={`notification-status ${emailReady ? "ready" : "not-ready"}`}>
          <div>
            <strong>{productionReady ? "Production email ready" : "Email setup needed"}</strong>
            <span>
              {productionReady
                ? `${provider}: ${notificationStatus?.emailFrom || "configured"}`
                : notificationStatus?.message || "Set RESEND_API_KEY and use a verified sender domain."}
            </span>
          </div>
          <span>{alertsEnabled ? "Alerts on" : "Alerts off"}</span>
        </div>

        {TRACKS.map(({ key, label, color }) => (
          <div key={key} className="th-row">
            <div className="th-meta">
              <span className="th-name">{label}</span>
              <span className="th-val">{vals[key] ?? 0}%</span>
            </div>
            <input
              type="range" min="10" max="95" step="5"
              value={vals[key] ?? 0}
              onChange={(e) => setVals((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
              className="range-input"
              style={{
                background: `linear-gradient(90deg, ${color} ${vals[key]}%, #ebebeb ${vals[key]}%)`,
              }}
            />
          </div>
        ))}
        
        <div className="th-row" style={{ marginTop: "0.5rem" }}>
          <div className="th-meta">
            <span className="th-name">Alert Email</span>
          </div>
          <input
            type="text"
            placeholder="admin@example.com, ops@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              fontFamily: "var(--font)",
              fontSize: "0.85rem",
              outline: "none",
              color: "var(--text-primary)"
            }}
          />
        </div>

        <button
          type="submit"
          className={`apply-btn ${saved ? "saved" : ""}`}
          disabled={!hasChanges && !saved}
        >
          {saved
            ? <><Check size={15} /> Applied!</>
            : <><Save size={15} /> Apply Changes</>}
        </button>

        <button
          type="button"
          className="secondary-btn"
          disabled={verifyState.status === "sending"}
          onClick={handleVerify}
        >
          <ShieldCheck size={15} />
          {verifyState.status === "sending" ? "Checking..." : "Check Setup"}
        </button>

        {verifyState.message && (
          <div className={`inline-status ${verifyState.status}`}>
            {verifyState.message}
          </div>
        )}

        <button
          type="button"
          className="secondary-btn"
          disabled={!email || testState.status === "sending"}
          onClick={handleSendTest}
        >
          <Send size={15} />
          {testState.status === "sending" ? "Sending..." : "Send Test Email"}
        </button>

        {testState.message && (
          <div className={`inline-status ${testState.status}`}>
            {testState.message}
          </div>
        )}
      </form>
    </div>
  );
}
