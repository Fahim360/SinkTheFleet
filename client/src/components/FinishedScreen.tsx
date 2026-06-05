import React from "react";
import { ClientGameState } from "../types";
import { ActivityLog } from "./ActivityLog";

interface Props { gameState: ClientGameState; onPlayAgain: () => void; }

export const FinishedScreen: React.FC<Props> = ({ gameState, onPlayAgain }) => {
  const { mySessionId, winnerId, players, log } = gameState;
  const me      = players.find(p => p.sessionId === mySessionId);
  const winner  = players.find(p => p.sessionId === winnerId);
  const isSpec  = me?.isSpectator ?? false;
  const iWon    = winnerId === mySessionId;

  const badge = isSpec ? "GAME OVER" : iWon ? "VICTORY" : "DEFEATED";
  const cls   = isSpec ? "spectate"  : iWon ? "win"      : "lose";
  const sub   = isSpec
    ? (winner ? `${winner.username} wins the battle!` : "Match concluded")
    : iWon ? "All enemy ships destroyed!" : `${winner?.username ?? "Opponent"} sank your fleet`;

  return (
    <div className="screen finished-screen">
      <div className={`result-badge ${cls}`}>{badge}</div>
      <div className="result-sub">{sub}</div>
      {winner?.avatarUrl && (
        <img src={winner.avatarUrl} alt={winner.username}
          style={{ width:52, height:52, borderRadius:"50%", border:`2px solid ${iWon ? "#3ddc84" : "var(--hit-red)"}`,
            boxShadow:`0 0 16px ${iWon ? "rgba(61,220,132,0.4)" : "rgba(255,58,58,0.4)"}` }}
        />
      )}
      <div style={{ maxWidth:280, width:"100%", height:200 }}>
        <ActivityLog entries={log} />
      </div>
      {!isSpec && (
        <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
          ⟳ Play Again
        </button>
      )}
    </div>
  );
};
