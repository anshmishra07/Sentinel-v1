import { Resend } from "resend";

const useResend = Boolean(process.env.RESEND_API_KEY);
const hasSlack = Boolean(process.env.SLACK_WEBHOOK_URL);
const defaultFrom = process.env.ALERT_EMAIL_FROM || "Ops Console <onboarding@resend.dev>";

let resend = null;
if (useResend) resend = new Resend(process.env.RESEND_API_KEY);

console.log(
  useResend
    ? "[notify] email: Resend API ready"
    : "[notify] email: not configured - set RESEND_API_KEY"
);
console.log(`[notify] default recipient: ${process.env.ALERT_EMAIL_TO || "none - set ALERT_EMAIL_TO"}`);
console.log(`[notify] slack: ${hasSlack ? "configured" : "not configured"}`);

function buildHtml(alert) {
  const metric = alert.type?.toUpperCase() ?? "SYSTEM";
  const value = alert.value ?? "-";
  const threshold = alert.threshold ?? "-";

  return `
    <div style="font-family:monospace;background:#0B0E0F;color:#D8E0DE;padding:24px;border-radius:8px;max-width:520px">
      <h2 style="color:#E0A638;margin:0 0 12px">Ops Console Alert</h2>
      <p style="font-size:16px;margin:0 0 16px">${escapeHtml(alert.message)}</p>
      <table style="width:100%;border-collapse:collapse">
        ${row("Metric", metric)}
        ${row("Value", `${value}${alert.value != null ? "%" : ""}`, "#E0544A")}
        ${row("Threshold", `${threshold}${alert.threshold != null ? "%" : ""}`)}
        ${row("Level", alert.level || "warning")}
        ${row("Device", alert.deviceName || alert.deviceId || "Unknown")}
        ${row("Time", new Date(alert.timestamp).toLocaleString())}
      </table>
    </div>`;
}

function row(label, value, color = "#D8E0DE") {
  return `
    <tr>
      <td style="color:#7C8886;padding:4px 12px 4px 0;width:90px">${escapeHtml(label)}</td>
      <td style="color:${color};padding:4px 0">${escapeHtml(String(value ?? ""))}</td>
    </tr>`;
}

export async function notify(alert, emailOverride) {
  const { recipients, invalid } = normalizeRecipients(emailOverride || process.env.ALERT_EMAIL_TO);
  const result = {
    email: { sent: false, skipped: false },
    slack: { sent: false, skipped: false }
  };

  console.log(`[ALERT] ${alert.message}`);

  if (invalid.length > 0) {
    console.warn(`[notify] Invalid recipient emails: ${invalid.join(", ")}`);
    result.email.skipped = true;
    result.email.reason = `Invalid recipient email${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`;
  } else if (recipients.length === 0) {
    console.warn("[notify] No recipient - set ALERT_EMAIL_TO");
    result.email.skipped = true;
    result.email.reason = "No alert email recipient configured.";
  } else if (useResend) {
    try {
      const { data, error } = await resend.emails.send({
        from: defaultFrom,
        to: recipients,
        subject: `${alert.type?.toUpperCase() ?? "SYSTEM"} alert - ${alert.message}`,
        html: buildHtml(alert)
      });
      if (error) throw new Error(JSON.stringify(error));
      result.email.sent = true;
      result.email.provider = "resend";
      result.email.messageId = data?.id;
      result.email.recipients = recipients;
      console.log(`[notify] Resend email sent to ${recipients.join(", ")}`);
    } catch (err) {
      result.email.error = err.message;
      console.error(`[notify] Resend failed: ${err.message}`);
    }
  } else {
    result.email.skipped = true;
    result.email.reason = "Email provider is not configured. Set RESEND_API_KEY.";
  }

  if (hasSlack) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `ALERT - ${alert.message}` })
      });
      result.slack.sent = true;
      console.log("[notify] Slack message sent");
    } catch (err) {
      result.slack.error = err.message;
      console.error(`[notify] Slack failed: ${err.message}`);
    }
  } else {
    result.slack.skipped = true;
    result.slack.reason = "Slack webhook is not configured.";
  }

  return result;
}

export function getNotificationStatus(emailOverride) {
  const provider = useResend ? "resend" : "none";
  const recipient = emailOverride || process.env.ALERT_EMAIL_TO || "";
  const { recipients, invalid } = normalizeRecipients(recipient);
  return {
    emailConfigured: useResend,
    emailProvider: provider,
    emailRecipient: recipient,
    emailRecipients: recipients,
    invalidEmailRecipients: invalid,
    emailValid: invalid.length === 0,
    emailFrom: defaultFrom,
    verifiedSenderRequired: isDefaultResendSender(defaultFrom),
    productionReady: useResend && invalid.length === 0 && !isDefaultResendSender(defaultFrom),
    resendConfigured: useResend,
    message: provider === "resend"
      ? isDefaultResendSender(defaultFrom)
        ? "Resend is configured, but you still need to verify your own sender domain for production delivery."
        : "Email notifications are configured for production delivery through Resend."
      : "No email transport configured. Set RESEND_API_KEY.",
    slackConfigured: hasSlack,
    email: {
      configured: useResend,
      channel: provider,
      recipient: recipient || null,
      recipients,
      invalid
    },
    slack: { configured: hasSlack }
  };
}

export async function sendTestNotification(emailOverride) {
  const now = Date.now();
  const alert = {
    alertId: `test-notification-${now}`,
    type: "cpu",
    level: "info",
    value: 99.9,
    threshold: 80,
    timestamp: now,
    message: "[TEST] CPU usage hit 99.9% - notification pipeline check",
    deviceName: "Notification Settings"
  };

  const result = await notify(alert, emailOverride);
  return { alert, result };
}

export async function verifyEmailTransport() {
  const { invalid } = normalizeRecipients(process.env.ALERT_EMAIL_TO || "");
  if (invalid.length > 0) {
    return {
      ok: false,
      provider: useResend ? "resend" : "none",
      channel: useResend ? "resend" : "none",
      message: `Invalid alert recipient email${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`
    };
  }
  if (useResend) {
    return {
      ok: true,
      provider: "resend",
      channel: "resend",
      message: "Resend is configured. Delivery to arbitrary recipients requires a verified Resend sender domain."
    };
  }
  return { ok: false, provider: "none", channel: "none", message: "No email transport configured. Set RESEND_API_KEY." };
}

export function normalizeRecipients(value) {
  const entries = String(value || "")
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const recipients = [];
  const invalid = [];

  for (const entry of entries) {
    if (isValidEmail(entry)) {
      const normalized = entry.toLowerCase();
      if (!recipients.includes(normalized)) recipients.push(normalized);
    } else {
      invalid.push(entry);
    }
  }

  return { recipients, invalid };
}

function isValidEmail(value) {
  if (!value || value.length > 254) return false;
  if (value.includes("..")) return false;

  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || !domain || local.length > 64) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  return /^[^\s@]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(value);
}

function isDefaultResendSender(fromValue) {
  return String(fromValue || "").includes("onboarding@resend.dev");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
