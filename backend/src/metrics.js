import si from "systeminformation";

let prevNet = null;

export async function getSystemMetrics() {
  const [load, mem, disks, net, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.time()
  ]);

  const memUsedPercent = (mem.active / mem.total) * 100;
  const primaryDisk = pickPrimaryDisk(disks);
  const networkRates = computeNetworkRates(net);

  return {
    timestamp: Date.now(),
    cpu: {
      loadPercent: round(load.currentLoad),
      cores: load.cpus?.length ?? null
    },
    memory: {
      usedPercent: round(memUsedPercent),
      usedGB: round(mem.active / 1024 ** 3),
      totalGB: round(mem.total / 1024 ** 3)
    },
    disk: {
      usedPercent: round(primaryDisk?.use ?? 0),
      usedGB: round((primaryDisk?.used ?? 0) / 1024 ** 3),
      totalGB: round((primaryDisk?.size ?? 0) / 1024 ** 3),
      mount: primaryDisk?.mount ?? "n/a"
    },
    network: {
      rxKBs: round(networkRates.rx),
      txKBs: round(networkRates.tx),
      iface: networkRates.iface
    },
    uptimeSeconds: Math.round(time.uptime)
  };
}

function pickPrimaryDisk(disks) {
  if (!disks || disks.length === 0) return null;

  const root = disks.find((d) => d.mount === "/" || /^[A-Za-z]:\\?$/.test(d.mount));
  if (root) return root;

  const realDisks = disks.filter((d) => d.rw && !d.fs?.includes("fuse"));
  if (realDisks.length > 0) {
    return realDisks.reduce((biggest, d) => (d.size > (biggest?.size ?? 0) ? d : biggest), null);
  }

  return disks[0];
}

function computeNetworkRates(netStats) {
  if (!netStats || netStats.length === 0) return { rx: 0, tx: 0, iface: "n/a" };

  const iface = netStats[0];
  const now = Date.now();

  if (!prevNet || prevNet.iface !== iface.iface) {
    prevNet = { iface: iface.iface, rx: iface.rx_bytes, tx: iface.tx_bytes, time: now };
    return { rx: 0, tx: 0, iface: iface.iface };
  }

  const elapsedSec = Math.max((now - prevNet.time) / 1000, 1);
  const rxKBs = (iface.rx_bytes - prevNet.rx) / 1024 / elapsedSec;
  const txKBs = (iface.tx_bytes - prevNet.tx) / 1024 / elapsedSec;

  prevNet = { iface: iface.iface, rx: iface.rx_bytes, tx: iface.tx_bytes, time: now };

  return { rx: Math.max(rxKBs, 0), tx: Math.max(txKBs, 0), iface: iface.iface };
}

function round(n) {
  return Math.round(n * 10) / 10;
}
