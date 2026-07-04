import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";

import { Device } from "./models/Device.js";
import { Metrics } from "./models/Metrics.js";
import { Alert } from "./models/Alert.js";
import { buildAvailabilityAlert, calculateHealthScore, checkThresholds } from "./alertEngine.js";
import { getNotificationStatus, normalizeRecipients, notify, sendTestNotification, verifyEmailTransport } from "./notify.js";

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const DEVICE_TIMEOUT_MS = Number(process.env.DEVICE_TIMEOUT_MS || 15_000);

const thresholds = {
  cpu: Number(process.env.DEFAULT_CPU_THRESHOLD || 80),
  memory: Number(process.env.DEFAULT_MEMORY_THRESHOLD || 85),
  disk: Number(process.env.DEFAULT_DISK_THRESHOLD || 90)
};

let alertsEnabled = true;
let alertEmail = process.env.ALERT_EMAIL_TO || "";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: CLIENT_ORIGIN === "*" ? true : CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Sentinel Monitor backend" });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? "connected" : "not-connected",
    time: Date.now()
  });
});

app.get("/api/devices", async (_req, res, next) => {
  try {
    res.json(await Device.find().sort({ last_seen: -1 }).lean());
  } catch (err) {
    next(err);
  }
});

app.get("/api/metrics", async (req, res, next) => {
  try {
    const since = Date.now() - rangeToMs(req.query.range || "1h");
    const rows = await Metrics.find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .limit(1000)
      .lean();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/alerts", async (_req, res, next) => {
  try {
    const rows = await Alert.find().sort({ timestamp: -1 }).limit(50).lean();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.get("/api/notifications/status", (_req, res) => {
  res.json(getNotificationStatus(alertEmail));
});

app.post("/api/notifications/test", async (req, res) => {
  const email = req.body?.email || alertEmail;
  const validation = normalizeRecipients(email);
  if (validation.invalid.length > 0 || validation.recipients.length === 0) {
    return res.status(400).json({
      ok: false,
      message: validation.invalid.length > 0
        ? `Invalid recipient email${validation.invalid.length > 1 ? "s" : ""}: ${validation.invalid.join(", ")}`
        : "Enter at least one recipient email."
    });
  }

  const { alert, result } = await sendTestNotification(email);
  res.json({
    ok: Boolean(result.email.sent || result.slack.sent),
    alert,
    result,
    message: result.email.error || result.email.reason || "Test notification sent."
  });
});

app.post("/api/notifications/verify", async (_req, res) => {
  const result = await verifyEmailTransport();
  res.status(result.ok ? 200 : 400).json({ ok: result.ok, ...result });
});

io.on("connection", async (socket) => {
  console.log(`[socket] connected ${socket.id}`);

  socket.emit("thresholds", thresholds);
  socket.emit("alerts-enabled", alertsEnabled);
  socket.emit("alert-email", alertEmail);

  try {
    const history = await Alert.find().sort({ timestamp: -1 }).limit(50).lean();
    socket.emit("alert-history", history);
  } catch (err) {
    console.error("[socket] alert history failed:", err.message);
  }

  socket.on("register_device", async (device) => {
    try {
      await upsertDevice(device);
      io.emit("devices_updated");
      io.emit("device", { ...device, status: "online", last_seen: Date.now() });
    } catch (err) {
      console.error("[device] register failed:", err.message);
    }
  });

  socket.on("telemetry", async (payload) => {
    try {
      await handleTelemetry(payload);
    } catch (err) {
      console.error("[telemetry] failed:", err.message);
    }
  });

  socket.on("update-thresholds", (next) => {
    thresholds.cpu = Number(next.cpu ?? thresholds.cpu);
    thresholds.memory = Number(next.memory ?? thresholds.memory);
    thresholds.disk = Number(next.disk ?? thresholds.disk);
    io.emit("thresholds", thresholds);
  });

  socket.on("toggle-alerts", (enabled) => {
    alertsEnabled = Boolean(enabled);
    io.emit("alerts-enabled", alertsEnabled);
  });

  socket.on("update-email", (email) => {
    const validation = normalizeRecipients(email);
    if (validation.invalid.length > 0) {
      socket.emit("notification-error", {
        message: `Invalid recipient email${validation.invalid.length > 1 ? "s" : ""}: ${validation.invalid.join(", ")}`
      });
      return;
    }

    alertEmail = validation.recipients.join(",");
    io.emit("alert-email", alertEmail);
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Sentinel backend listening on :${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_ORIGIN}`);
});

connectMongo().catch((err) => {
  console.error("[mongo] initial connection failed:", err.message);
});

setInterval(markOfflineDevices, Math.max(DEVICE_TIMEOUT_MS, 5_000));

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[mongo] MONGODB_URI not set; API will run without database persistence.");
    return;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.log("[mongo] connected");
}

async function upsertDevice(device) {
  if (!device?.deviceId) return null;

  return Device.findOneAndUpdate(
    { deviceId: device.deviceId },
    {
      $set: {
        hostname: device.hostname || device.deviceId,
        deviceType: device.deviceType || "remote-server",
        os: device.os || "unknown",
        ip_address: device.ip_address || "",
        status: "online",
        last_seen: Date.now()
      }
    },
    { upsert: true, new: true }
  );
}

async function handleTelemetry(payload) {
  const metrics = payload?.metrics;
  const deviceId = payload?.deviceId;
  if (!metrics || !deviceId) return;

  const timestamp = Number(payload.timestamp || Date.now());
  const health = calculateHealthScore(metrics, "online");
  const data = {
    ...metrics,
    deviceId,
    timestamp,
    healthScore: health.score,
    healthStatus: health.status
  };

  const device = await Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        status: "online",
        last_seen: timestamp,
        healthScore: health.score,
        healthStatus: health.status
      },
      $setOnInsert: {
        hostname: deviceId,
        deviceType: "remote-server",
        os: "unknown",
        ip_address: ""
      }
    },
    { upsert: true, new: true }
  );

  await Metrics.create(data);
  io.emit("metrics", data);
  io.emit("devices_updated");

  if (!alertsEnabled) return;

  const newAlerts = checkThresholds(metrics, thresholds).map((alert) => ({
    ...alert,
    alertId: alert.id,
    deviceId,
    deviceName: device.hostname || deviceId
  }));

  for (const alert of newAlerts) {
    await persistAndSendAlert(alert);
  }
}

async function markOfflineDevices() {
  if (mongoose.connection.readyState !== 1) return;

  const cutoff = Date.now() - DEVICE_TIMEOUT_MS;
  const staleDevices = await Device.find({ status: "online", last_seen: { $lt: cutoff } });

  for (const device of staleDevices) {
    device.status = "offline";
    device.healthScore = Math.min(device.healthScore || 100, 40);
    device.healthStatus = "critical";
    await device.save();

    const alert = {
      ...buildAvailabilityAlert(device, "offline"),
      alertId: `availability-${device.deviceId}-${Date.now()}`,
      deviceId: device.deviceId,
      deviceName: device.hostname || device.deviceId
    };
    await persistAndSendAlert(alert);
  }

  if (staleDevices.length > 0) io.emit("devices_updated");
}

async function persistAndSendAlert(alert) {
  try {
    await Alert.updateOne(
      { alertId: alert.alertId || alert.id },
      { $setOnInsert: { ...alert, alertId: alert.alertId || alert.id } },
      { upsert: true }
    );
  } catch (err) {
    console.error("[alert] save failed:", err.message);
  }

  io.emit("alert", alert);
  await notify(alert, alertEmail);
}

function rangeToMs(range) {
  if (range === "24h") return 24 * 60 * 60 * 1000;
  if (range === "7d") return 7 * 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000;
}

app.use((err, _req, res, _next) => {
  console.error("[api]", err.message);
  res.status(500).json({ ok: false, message: err.message });
});
