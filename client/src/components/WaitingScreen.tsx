import React from "react";
import { PlayerInfo } from "../types";
import { PlayerCard } from "./PlayerCard";

interface WaitingScreenProps {
  players: PlayerInfo[];
  mySessionId: string;
  spectatorCount: number;
}

export const WaitingScreen: React.FC<WaitingScreenProps> = ({
  players,
  mySessionId,
  spectatorCount,
}) => {
  const activePlayers = players.filter((p) => !p.isSpectator);

  return (
    <div className="screen waiting-screen">
      <div className="waiting-icon">⚓</div>
      <div className="waiting-title">Sink the Fleet</div>

      <div className="radar-ring" />

      <div className="waiting-sub">
        {activePlayers.length < 2
          ? "Waiting for a second player to join..."
          : "Both players connected — starting soon"}
      </div>

      {activePlayers.length > 0 && (
        <div className="players-list">
          {activePlayers.map((p) => (
            <PlayerCard key={p.sessionId} player={p} isMe={p.sessionId === mySessionId} />
          ))}
          {activePlayers.length === 1 && (
            <div
              className="player-card"
              style={{
                opacity: 0.3,
                border: "1px dashed var(--border-subtle)",
                justifyContent: "center",
                fontSize: 12,
                color: "var(--text-muted)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.1em",
              }}
            >
              + Player 2
            </div>
          )}
        </div>
      )}

      {spectatorCount > 0 && (
        <div className="spectator-badge">
          👁 {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
};
