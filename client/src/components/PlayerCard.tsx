import React from "react";
import { PlayerInfo } from "../types";

interface PlayerCardProps {
  player: PlayerInfo;
  isMe: boolean;
  showReady?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isMe, showReady }) => {
  const initials = player.username.slice(0, 2).toUpperCase();

  const classes = [
    "player-card",
    isMe ? "is-me" : "",
    showReady && player.ready ? "is-ready" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="player-avatar">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt={player.username} />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div>
        <div className="player-name">
          {player.username}
          {isMe && <span style={{ color: "var(--accent-radar)", marginLeft: 4 }}>(you)</span>}
        </div>
        {showReady && (
          <div className={`player-status ${player.ready ? "ready" : ""}`}>
            {player.ready ? "✓ READY" : player.shipsPlaced ? "placing..." : "waiting..."}
          </div>
        )}
      </div>
    </div>
  );
};
