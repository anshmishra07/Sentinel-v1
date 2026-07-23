import { createContext, createElement, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const HISTORY_LENGTH = 30; // ~90s of history at a 3s poll interval
const SocketContext = createContext(null);

function useSocketConnection() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState([]);
  const [latest, setLatest] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState({ cpu: 80, memory: 85, disk: 90 });
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertEmail, setAlertEmail] = useState("");
  const [notificationStatus, setNotificationStatus] = useState(null);
  const [range, setRange] = useState("1h");
  const [devices, setDevices] = useState([]);

  function normalizeMetric(data) {
    return {
      time: new Date(data.timestamp).toLocaleTimeString(),
      cpu: data.cpu?.loadPercent ?? 0,
      memory: data.memory?.usedPercent ?? 0,
      disk: data.disk?.usedPercent ?? 0
    };
  }

  async function refreshDevices() {
    const res = await fetch(`${API_URL}/api/devices`);
    setDevices(await res.json());
  }

  async function refreshNotificationStatus() {
    const res = await fetch(`${API_URL}/api/notifications/status`);
    const data = await res.json();
    setNotificationStatus(data);
    return data;
  }

  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("metrics", (data) => {
      setLatest(data);
      setHistory((prev) => {
        const next = [...prev, normalizeMetric(data)];
        return next.length > HISTORY_LENGTH ? next.slice(-HISTORY_LENGTH) : next;
      });
    });

    socket.on("alert", (alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });
    socket.on("devices_updated", refreshDevices);
    socket.on("device", refreshDevices);

    socket.on("alert-history", (history) => setAlerts(history));
    socket.on("thresholds", (t) => setThresholds(t));
    socket.on("alerts-enabled", (enabled) => setAlertsEnabled(enabled));
    socket.on("alert-email", (email) => setAlertEmail(email));
    socket.on("notification-error", (error) => {
      setNotificationStatus((prev) => ({
        ...(prev || {}),
        emailValid: false,
        message: error.message || "Invalid notification settings."
      }));
    });

    refreshDevices().catch(console.error);
    refreshNotificationStatus().catch(console.error);
    fetch(`${API_URL}/api/alerts`).then((res) => res.json()).then(setAlerts).catch(console.error);

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/metrics?range=${range}`)
      .then((res) => res.json())
      .then((rows) => setHistory(rows.map(normalizeMetric)))
      .catch(console.error);
  }, [range]);

  function updateThresholds(next) {
    socketRef.current?.emit("update-thresholds", next);
  }

  function toggleAlerts(enabled) {
    socketRef.current?.emit("toggle-alerts", enabled);
  }

  function updateAlertEmail(email) {
    socketRef.current?.emit("update-email", email);
    setNotificationStatus((prev) => prev ? { ...prev, emailRecipient: email } : prev);
  }

  async function sendTestNotification(email) {
    const res = await fetch(`${API_URL}/api/notifications/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      const message = data.message || data.result?.email?.error || data.result?.email?.reason || "Test notification failed.";
      throw new Error(message);
    }
    await refreshNotificationStatus().catch(console.error);
    return data;
  }

  async function verifyNotifications() {
    const res = await fetch(`${API_URL}/api/notifications/verify`, { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Email setup check failed.");
    }
    await refreshNotificationStatus().catch(console.error);
    return data;
  }

  return {
    connected, history, latest, alerts, thresholds, updateThresholds,
    alertsEnabled, toggleAlerts, alertEmail, updateAlertEmail,
    range, setRange, devices, refreshDevices,
    notificationStatus, refreshNotificationStatus, sendTestNotification, verifyNotifications
  };
}

export function SocketProvider({ children }) {
  const value = useSocketConnection();
  return createElement(SocketContext.Provider, { value }, children);
}

export function useSocket() {
  const value = useContext(SocketContext);
  if (!value) {
    throw new Error("useSocket must be used inside SocketProvider");
  }
  return value;
}
