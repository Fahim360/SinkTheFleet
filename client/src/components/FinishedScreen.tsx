import React from "react";
import { ClientGameState } from "../types";
import { ActivityLog } from "./ActivityLog";

interface FinishedScreenProps {
  gameState: ClientGameState;
  onPlayAgain: () => void;
}

export const FinishedScreen: React.FC<FinishedScreenProps> = ({
  gameState,
  onPlayAgain,
}) => {
  const { mySessionId, winnerId, players, log } = gameState;
  const me = players.find((p) => p.sessionId === mySessionId);
  const winner = players.find((p) => p.sessionId === winnerId);

  const isSpectator = me?.isSpectator ?? false;
  const iWon = winnerId === mySessionId;

  let resultText = "";
  let resultClass = "";
  let subText = "";

  if (isSpectator) {
    resultText = "GAME OVER";
    resultClass = "spectate";
    subText = winner ? `${winner.username} wins!` : "Match ended";
  } else if (iWon) {
    resultText = "VICTORY";
    resultClass = "win";
    subText = "All enemy ships sunk!";
  } else {
    resultText = "DEFEATED";
    resultClass = "lose";
    subText = winner ? `${winner.username} sank your fleet` : "You lost";
  }

  return (
    <div className="screen finished-screen">
      <div className={`result-badge ${resultClass}`}>{resultText}</div>
      <div className="result-sub">{subText}</div>

      <div style={{ maxWidth: 320, width: "100%" }}>
        <ActivityLog entries={log} />
      </div>

      {!isSpectator && (
        <button className="btn btn-primary btn-lg" onClick={onPlayAgain}>
          ⟳ Play Again
        </button>
      )}
    </div>
  );
};
