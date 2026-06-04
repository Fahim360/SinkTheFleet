import React from "react";
import { ConnectionStatus } from "../hooks/useColyseus";

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting:    "Connecting",
  connected:     "Online",
  reconnecting:  "Reconnecting",
  disconnected:  "Offline",
};

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export const ConnectionBadge: React.FC<ConnectionBadgeProps> = ({ status }) => (
  <div className={`conn-badge ${status}`}>
    <div className="conn-dot" />
    <span>{STATUS_LABELS[status]}</span>
  </div>
);
