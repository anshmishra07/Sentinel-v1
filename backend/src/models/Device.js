import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  hostname: String,
  deviceType: { type: String, default: 'remote-server' },
  os: String,
  ip_address: String,
  status: { type: String, default: 'online' },
  healthScore: { type: Number, default: 100 },
  healthStatus: { type: String, default: 'healthy' },
  last_seen: { type: Number, default: Date.now }
}, { timestamps: true });

export const Device = mongoose.model('Device', deviceSchema);
