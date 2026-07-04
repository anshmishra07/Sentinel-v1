import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  deviceId: String,
  deviceName: String,
  type: { type: String, required: true },
  level: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  value: { type: Number, required: true },
  threshold: { type: Number, required: true },
  timestamp: { type: Number, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'active' } // active, resolved
});

export const Alert = mongoose.model('Alert', alertSchema);
