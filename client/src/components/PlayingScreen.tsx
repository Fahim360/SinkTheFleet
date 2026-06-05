import React, { useState, useEffect } from "react";
import { ClientGameState, AttackResult } from "../types";
import { Grid } from "./Grid";
import { ActivityLog } from "./ActivityLog";
import { ShipHealth } from "./ShipHealth";

interface Props {
  gameState: ClientGameState;
  lastAttackResult: { result: AttackResult; attackerId: string } | null;
  onAttack: (x: number, y: number) => void;
}

export const PlayingScreen: React.FC<Props> = ({ gameState, lastAttackResult, onAttack }) => {
  const { mySessionId, currentTurnId, players, myBoard, opponentBoard, myShips, log } = gameState;

  const isMyTurn = currentTurnId === mySessionId;
  const me       = players.find(p => p.sessionId === mySessionId);
  const opponent = players.find(p => p.sessionId !== mySessionId);

  const [flashCell, setFlashCell] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!lastAttackResult) return;
    const { x, y } = lastAttackResult.result;
    setFlashCell({ x, y });
    const t = setTimeout(() => setFlashCell(null), 450);
    return () => clearTimeout(t);
  }, [lastAttackResult]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, flex:1, overflow:"hidden", minHeight:0 }}>

      {/* Turn banner */}
      <div className={`turn-banner ${isMyTurn ? "my-turn" : "their-turn"}`}>
        {isMyTurn
          ? "⚡ YOUR TURN — FIRE!"
          : `⌛ ${opponent?.username ?? "Opponent"}'s turn`}
      </div>

      {/* Boards + log */}
      <div className="game-layout" style={{ flex:1, minHeight:0 }}>

        {/* My fleet */}
        <div className="board-section">
          <div className="board-label">
            {me?.avatarUrl && (
              <img src={me.avatarUrl} alt="" style={{ width:14, height:14, borderRadius:"50%", verticalAlign:"middle", marginRight:4 }} />
            )}
            {me?.username ?? "Your Fleet"}
          </div>
          <Grid board={myBoard} />
          <ShipHealth ships={myShips} />
        </div>

        {/* Log */}
        <ActivityLog entries={log} />

        {/* Enemy waters */}
        <div className="board-section">
          <div className="board-label enemy">
            {opponent?.avatarUrl && (
              <img src={opponent.avatarUrl} alt="" style={{ width:14, height:14, borderRadius:"50%", verticalAlign:"middle", marginRight:4 }} />
            )}
            {opponent?.username ?? "Enemy Waters"}
          </div>
          <Grid
            board={opponentBoard}
            attackable={isMyTurn}
            onAttack={isMyTurn ? onAttack : undefined}
            flashCell={lastAttackResult?.attackerId === mySessionId ? flashCell : null}
          />
          <div style={{ fontSize:9, color:"var(--text-muted)", textAlign:"center", fontFamily:"var(--font-display)", letterSpacing:"0.1em" }}>
            {isMyTurn ? "◎ SELECT TARGET" : "STANDBY..."}
          </div>
        </div>
      </div>
    </div>
  );
};
