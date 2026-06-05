import React from "react";
import { PlayerInfo } from "../types";
import { PlayerCard } from "./PlayerCard";

interface Props {
  players: PlayerInfo[];
  mySessionId: string;
  spectatorCount: number;
}

export const WaitingScreen: React.FC<Props> = ({ players, mySessionId, spectatorCount }) => {
  const active = players.filter(p => !p.isSpectator);
  return (
    <div className="screen waiting-screen">
      <div className="waiting-icon">⚓</div>
      <div className="waiting-title">Sink the Fleet</div>
      <div className="radar-ring" />
      <div className="waiting-sub">
        {active.length < 2 ? "Awaiting second commander..." : "Both players ready — deploying fleet..."}
      </div>
      {active.length > 0 && (
        <div className="players-list">
          {active.map(p => (
            <PlayerCard key={p.sessionId} player={p} isMe={p.sessionId === mySessionId} />
          ))}
          {active.length === 1 && (
            <div className="player-card" style={{ opacity:0.28, border:"1px dashed var(--border-faint)", justifyContent:"center", fontFamily:"var(--font-display)", fontSize:10, color:"var(--text-muted)", letterSpacing:"0.1em" }}>
              + PLAYER 2
            </div>
          )}
        </div>
      )}
      {spectatorCount > 0 && (
        <div className="spectator-badge">👁 {spectatorCount} spectator{spectatorCount !== 1 ? "s" : ""}</div>
      )}
    </div>
  );
};
