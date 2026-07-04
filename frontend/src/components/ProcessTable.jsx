import React from "react";
import { ListTree } from "lucide-react";

export default function ProcessTable({ processes = [] }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <ListTree size={16} style={{ color: "var(--primary)" }} />
          Top Processes
        </h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>PID</th>
              <th>CPU</th>
              <th>Memory</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process) => (
              <tr key={`${process.pid}-${process.name}`}>
                <td>{process.name}</td>
                <td>{process.pid}</td>
                <td>{process.cpuPercent}%</td>
                <td>{process.memoryPercent}%</td>
              </tr>
            ))}
            {processes.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  Waiting for process telemetry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
