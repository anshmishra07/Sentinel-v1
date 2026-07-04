import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { SocketProvider, useSocket } from "./hooks/useSocket.js";
import TopBar from "./components/TopBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Devices from "./pages/Devices.jsx";

function AppShell() {
  const { connected, alerts } = useSocket();

  return (
    <BrowserRouter>
      <div className="layout no-sidebar">
        <div className="main-area" style={{ marginLeft: 0 }}>
          <TopBar connected={connected} alertCount={alerts.length} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <AppShell />
    </SocketProvider>
  );
}
