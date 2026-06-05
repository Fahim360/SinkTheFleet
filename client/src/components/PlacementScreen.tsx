import React, { useState, useEffect, useCallback } from "react";
import { SHIP_DEFINITIONS, Cell, CellState, PlayerInfo, PlacedShip } from "../types";
import { Grid } from "./Grid";
import { PlayerCard } from "./PlayerCard";
import { getShipCells, isValidPlacement, randomizePlacementsClient } from "../utils/placement";

function buildBoard(placements: PlacedShip[]): Cell[][] {
  const board: Cell[][] = Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => ({ x, y, state: "empty" as CellState }))
  );
  for (const p of placements) {
    const def = SHIP_DEFINITIONS.find(s => s.id === p.shipId);
    if (!def) continue;
    for (const c of getShipCells(p.x, p.y, def.size, p.horizontal)) {
      board[c.y][c.x] = { x: c.x, y: c.y, state: "ship", shipId: p.shipId };
    }
  }
  return board;
}

interface Props {
  onPlaceShips: (ships: PlacedShip[]) => void;
  onRandomize:  () => void;
  onReady:      () => void;
  myInfo:       PlayerInfo;
  opponent:     PlayerInfo | null;
  isReady:      boolean;
  isShipsPlaced:boolean;
}

export const PlacementScreen: React.FC<Props> = ({
  onPlaceShips, onRandomize, onReady, myInfo, opponent, isReady,
}) => {
  const [placements,    setPlacements   ] = useState<PlacedShip[]>([]);
  const [selectedId,    setSelectedId   ] = useState<string | null>(null);
  const [horizontal,    setHorizontal   ] = useState(true);
  const [hoverPreview,  setHoverPreview ] = useState<Array<{ x:number; y:number; valid:boolean }>>([]);

  // Server randomize response
  useEffect(() => {
    const h = (e: Event) => {
      const p = (e as CustomEvent<PlacedShip[]>).detail;
      setPlacements(p); setSelectedId(null);
    };
    window.addEventListener("randomized_ships", h);
    return () => window.removeEventListener("randomized_ships", h);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") setHorizontal(v => !v);
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const board     = buildBoard(placements);
  const placedIds = new Set(placements.map(p => p.shipId));
  const allPlaced = SHIP_DEFINITIONS.every(d => placedIds.has(d.id));

  const handleHover = useCallback((x: number, y: number) => {
    if (!selectedId) { setHoverPreview([]); return; }
    const def = SHIP_DEFINITIONS.find(d => d.id === selectedId);
    if (!def) return;
    const cells = getShipCells(x, y, def.size, horizontal);
    const valid = isValidPlacement(x, y, def.size, horizontal, placements);
    setHoverPreview(cells.map(c => ({ ...c, valid })));
  }, [selectedId, horizontal, placements]);

  const handleLeave  = useCallback(() => setHoverPreview([]), []);

  const handleClick = useCallback((x: number, y: number) => {
    if (isReady) return;

    if (selectedId) {
      const def = SHIP_DEFINITIONS.find(d => d.id === selectedId);
      if (!def) return;
      if (!isValidPlacement(x, y, def.size, horizontal, placements, selectedId)) return;
      const next = [...placements.filter(p => p.shipId !== selectedId), { shipId: selectedId, x, y, horizontal }];
      setPlacements(next);
      setSelectedId(null);
      setHoverPreview([]);
      if (SHIP_DEFINITIONS.every(d => next.some(p => p.shipId === d.id))) onPlaceShips(next);
    } else {
      const cell = board[y]?.[x];
      if (cell?.state === "ship" && cell.shipId) {
        setSelectedId(cell.shipId);
        setPlacements(prev => prev.filter(p => p.shipId !== cell.shipId));
      }
    }
  }, [isReady, selectedId, horizontal, placements, board, onPlaceShips]);

  const handleRandomize = () => {
    const p = randomizePlacementsClient();
    setPlacements(p); setSelectedId(null);
    onPlaceShips(p); onRandomize();
  };

  return (
    <div className="placement-screen">
      <div className="placement-left">
        {/* Players row */}
        <div className="players-list" style={{ justifyContent:"flex-start" }}>
          <PlayerCard player={myInfo} isMe showReady />
          {opponent
            ? <PlayerCard player={opponent} isMe={false} showReady />
            : <div className="opponent-status"><div className="blink-dot"/>Waiting for opponent...</div>}
        </div>

        <Grid
          board={board}
          previewCells={hoverPreview}
          onHoverCell={handleHover}
          onLeaveGrid={handleLeave}
          onClickCell={handleClick}
        />

        <div className="placement-hint">
          {selectedId
            ? `Placing ${SHIP_DEFINITIONS.find(d=>d.id===selectedId)?.name} · [R] rotate · [Esc] cancel`
            : allPlaced ? "All ships placed! Click a ship to move it." : "Select a ship below, then click the grid"}
        </div>
      </div>

      <div className="placement-right">
        <div className="placement-title">Your Fleet</div>

        <div className="ship-palette">
          {SHIP_DEFINITIONS.map(def => {
            const placed   = placedIds.has(def.id) && selectedId !== def.id;
            const selected = selectedId === def.id;
            return (
              <div
                key={def.id}
                className={`ship-item ${placed ? "placed" : ""} ${selected ? "selected" : ""}`}
                onClick={() => { if (isReady || placed) return; setSelectedId(selected ? null : def.id); }}
              >
                <div className="ship-mini-bar">
                  {Array.from({ length: def.size }).map((_, i) => <div key={i} className="ship-mini-cell" />)}
                </div>
                <div className="ship-item-info">
                  <div className="ship-item-name">{def.name}</div>
                  <div className="ship-item-size">{def.size} cells</div>
                </div>
                {placed && <span style={{ color:"var(--accent-pulse)", fontSize:10 }}>✓</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:4 }}>
          <button className="btn btn-ghost" onClick={() => setHorizontal(h => !h)} disabled={isReady}>
            ↻ {horizontal ? "Horizontal" : "Vertical"}
          </button>
          <button className="btn btn-primary" onClick={handleRandomize} disabled={isReady}>
            ⚄ Randomize
          </button>
          <button className="btn btn-ghost"
            onClick={() => { if (!isReady) { setPlacements([]); setSelectedId(null); } }}
            disabled={isReady || placements.length === 0}>
            ✕ Clear All
          </button>
          <button className="btn btn-ready" style={{ marginTop:6 }}
            onClick={onReady} disabled={!allPlaced || isReady}>
            {isReady ? "✓ Ready!" : "Ready →"}
          </button>
        </div>

        {isReady && (
          <div className="opponent-status" style={{ marginTop:5 }}>
            <div className="blink-dot"/>
            {opponent?.ready ? "Game starting..." : "Waiting for opponent..."}
          </div>
        )}
      </div>
    </div>
  );
};
