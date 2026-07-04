/**
 * Stateful threshold checker. Keeps a cooldown per metric type so a CPU spike
 * that stays high for 5 minutes fires one alert, not 100.
 */
const COOLDOWN_MS = 60_000; // 1 minute between repeat alerts for the same metric

const lastAlertAt = {
  cpu: 0,
  memory: 0,
  disk: 0,
  availability: 0
};

/**
 * @param {object} metrics - output of getSystemMetrics()
 * @param {object} thresholds - { cpu: number, memory: number, disk: number } in percent
 * @returns {Array<object>} new alerts that should be emitted right now
 */
export function checkThresholds(metrics, thresholds) {
  const now = Date.now();
  const newAlerts = [];

  if (metrics.cpu.loadPercent >= thresholds.cpu && canFire("cpu", now)) {
    newAlerts.push(buildAlert("cpu", metrics.cpu.loadPercent, thresholds.cpu, now));
    lastAlertAt.cpu = now;
  }

  if (metrics.memory.usedPercent >= thresholds.memory && canFire("memory", now)) {
    newAlerts.push(buildAlert("memory", metrics.memory.usedPercent, thresholds.memory, now));
    lastAlertAt.memory = now;
  }

  if (metrics.disk.usedPercent >= thresholds.disk && canFire("disk", now)) {
    newAlerts.push(buildAlert("disk", metrics.disk.usedPercent, thresholds.disk, now));
    lastAlertAt.disk = now;
  }

  return newAlerts;
}

function canFire(type, now) {
  return now - lastAlertAt[type] > COOLDOWN_MS;
}

function buildAlert(type, value, threshold, timestamp) {
  const labels = { cpu: "CPU", memory: "Memory", disk: "Disk" };
  const level = value >= 95 ? "critical" : value >= threshold ? "warning" : "info";
  return {
    id: `${type}-${timestamp}`,
    type,
    level,
    value,
    threshold,
    timestamp,
    message: `${labels[type]} usage hit ${value}% (threshold ${threshold}%)`
  };
}

export function buildAvailabilityAlert(device, status, timestamp = Date.now()) {
  const isOnline = status === "online";
  return {
    id: `availability-${device.deviceId}-${timestamp}`,
    type: "availability",
    level: isOnline ? "info" : "critical",
    value: isOnline ? 1 : 0,
    threshold: 1,
    timestamp,
    message: `${device.hostname || device.deviceId} is ${isOnline ? "back online" : "offline"}`
  };
}

export function calculateHealthScore(metrics, availability = "online") {
  const cpuPenalty = Math.min(metrics.cpu?.loadPercent || 0, 100) * 0.25;
  const memoryPenalty = Math.min(metrics.memory?.usedPercent || 0, 100) * 0.25;
  const diskPenalty = Math.min(metrics.disk?.usedPercent || 0, 100) * 0.2;
  const availabilityPenalty = availability === "online" ? 0 : 30;
  const score = Math.max(0, Math.round(100 - cpuPenalty - memoryPenalty - diskPenalty - availabilityPenalty));

  return {
    score,
    status: score >= 85 ? "healthy" : score >= 60 ? "warning" : "critical"
  };
}
