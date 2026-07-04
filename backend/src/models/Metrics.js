import mongoose from 'mongoose';

const metricsSchema = new mongoose.Schema({
  deviceId: { type: String, index: true },
  timestamp: { type: Number, required: true },
  cpu: {
    loadPercent: Number,
    cores: Number,
    logicalCores: Number,
    perCorePercent: [Number]
  },
  memory: {
    usedPercent: Number,
    usedGB: Number,
    availableGB: Number,
    totalGB: Number
  },
  disk: {
    usedPercent: Number,
    usedGB: Number,
    freeGB: Number,
    totalGB: Number,
    mount: String
  },
  network: {
    rxKBs: Number,
    txKBs: Number,
    totalRxMB: Number,
    totalTxMB: Number,
    iface: String
  },
  processes: [{
    pid: Number,
    name: String,
    cpuPercent: Number,
    memoryPercent: Number
  }],
  healthScore: Number,
  healthStatus: String,
  uptimeSeconds: Number
});

export const Metrics = mongoose.model('Metrics', metricsSchema);
