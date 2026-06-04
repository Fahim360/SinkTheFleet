import React, { useState, useEffect } from "react";
import { ClientGameState, AttackResult } from "../types";
import { Grid } from "./Grid";
import { ActivityLog } from "./ActivityLog";
import { ShipHealth } from "./ShipHealth";

interface PlayingScreenProps {
  gameState: ClientGameState;
  lastAttackResult: { result: AttackResult; attackerId: string } | null;
  onAttack: (x: number, y: number) => void;
}

export const PlayingScreen: React.FC<PlayingScreenProps> = ({
  gameState,
  lastAttackResult,
  onAttack,
}) => {
  const { mySessionId, currentTurnId, players, myBoard, opponentBoard, myShips, log } =
    gameState;

  const isMyTurn = currentTurnId === mySessionId;
  const me = players.find((p) => p.sessionId === mySessionId);
  const opponent = players.find((p) => p.sessionId !== mySessionId);

  const [flashCell, setFlashCell] = useState<{ x: number; y: number } | null>(null);

  // Flash the last attacked cell
  useEffect(() => {
    if (lastAttackResult) {
      const { x, y } = lastAttackResult.result;
      setFlashCell({ x, y });
      const timer = setTimeout(() => setFlashCell(null), 500);
      return () => clearTimeout(timer);
    }
  }, [lastAttackResult]);

  const handleAttack = (x: number, y: number) => {
    if (!isMyTurn) return;
    onAttack(x, y);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "hidden" }}>
      {/* Turn banner */}
      <div className={`turn-banner ${isMyTurn ? "my-turn" : "their-turn"}`}>
        {isMyTurn
          ? "⚡ YOUR TURN — SELECT TARGET"
          : `⏳ ${opponent?.username ?? "Opponent"}'s turn`}
      </div>

      {/* Main game layout */}
      <div className="game-layout">
        {/* My board */}
        <div className="board-section">
          <div className="board-label">
            {me?.username ?? "Your Fleet"}
          </div>
          <Grid board={myBoard} />
          <ShipHealth ships={myShips} label="My Fleet" />
        </div>

        {/* Activity log (center) */}
        <ActivityLog entries={log} />

        {/* Opponent board */}
        <div className="board-section">
          <div className="board-label enemy">
            {opponent?.username ?? "Enemy Waters"}
          </div>
          <Grid
            board={opponentBoard}
            attackable={isMyTurn}
            onAttack={handleAttack}
            flashCell={
              lastAttackResult?.attackerId === mySessionId ? flashCell : null
            }
          />
          {/* Sunk ships info from log */}
          <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 2 }}>
            {isMyTurn ? "Click to attack" : "Waiting..."}
          </div>
        </div>
      </div>
    </div>
  );
};
