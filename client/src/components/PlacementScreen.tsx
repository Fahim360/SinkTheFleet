import React, { useState, useEffect, useCallback } from "react";
import { SHIP_DEFINITIONS, Cell, CellState } from "../types";
import { PlacedShip } from "../types";
import { Grid } from "./Grid";
import { PlayerCard } from "./PlayerCard";
import { PlayerInfo } from "../types";
import {
  getShipCells,
  isValidPlacement,
  buildOccupiedMap,
  randomizePlacementsClient,
} from "../utils/placement";

interface PlacementScreenProps {
  onPlaceShips: (ships: PlacedShip[]) => void;
  onRandomize: () => void;
  onReady: () => void;
  myInfo: PlayerInfo;
  opponent: PlayerInfo | null;
  isReady: boolean;
  isShipsPlaced: boolean;
}

function buildBoardFromPlacements(placements: PlacedShip[]): Cell[][] {
  const board: Cell[][] = [];
  for (let y = 0; y < 10; y++) {
    board[y] = [];
    for (let x = 0; x < 10; x++) {
      board[y][x] = { x, y, state: "empty" as CellState };
    }
  }
  for (const p of placements) {
    const def = SHIP_DEFINITIONS.find((s) => s.id === p.shipId);
    if (!def) continue;
    const cells = getShipCells(p.x, p.y, def.size, p.horizontal);
    for (const c of cells) {
      board[c.y][c.x].state = "ship";
      board[c.y][c.x].shipId = p.shipId;
    }
  }
  return board;
}

export const PlacementScreen: React.FC<PlacementScreenProps> = ({
  onPlaceShips,
  onRandomize,
  onReady,
  myInfo,
  opponent,
  isReady,
  isShipsPlaced,
}) => {
  const [placements, setPlacements] = useState<PlacedShip[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [horizontal, setHorizontal] = useState(true);
  const [hoverPreview, setHoverPreview] = useState<Array<{ x: number; y: number; valid: boolean }>>([]);

  // Listen for server-randomized ships
  useEffect(() => {
    const handler = (e: Event) => {
      const serverPlacements = (e as CustomEvent<PlacedShip[]>).detail;
      setPlacements(serverPlacements);
      setSelectedShipId(null);
    };
    window.addEventListener("randomized_ships", handler);
    return () => window.removeEventListener("randomized_ships", handler);
  }, []);

  // Keyboard: R to rotate, Escape to deselect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") setHorizontal((h) => !h);
      if (e.key === "Escape") setSelectedShipId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const board = buildBoardFromPlacements(placements);
  const placedIds = new Set(placements.map((p) => p.shipId));
  const allPlaced = SHIP_DEFINITIONS.every((d) => placedIds.has(d.id));

  const handleHoverCell = useCallback(
    (x: number, y: number) => {
      if (!selectedShipId) {
        setHoverPreview([]);
        return;
      }
      const def = SHIP_DEFINITIONS.find((d) => d.id === selectedShipId);
      if (!def) return;

      const cells = getShipCells(x, y, def.size, horizontal);
      const valid = isValidPlacement(x, y, def.size, horizontal, placements);
      setHoverPreview(cells.map((c) => ({ ...c, valid })));
    },
    [selectedShipId, horizontal, placements]
  );

  const handleLeaveGrid = useCallback(() => {
    setHoverPreview([]);
  }, []);

  const handleClickCell = useCallback(
    (x: number, y: number) => {
      if (isReady) return;

      if (selectedShipId) {
        // Place the selected ship
        const def = SHIP_DEFINITIONS.find((d) => d.id === selectedShipId);
        if (!def) return;

        const valid = isValidPlacement(x, y, def.size, horizontal, placements, selectedShipId);
        if (!valid) return;

        const next = placements.filter((p) => p.shipId !== selectedShipId);
        next.push({ shipId: selectedShipId, x, y, horizontal });
        setPlacements(next);
        setSelectedShipId(null);
        setHoverPreview([]);

        // Auto-send to server
        const allNew = [...next];
        if (SHIP_DEFINITIONS.every((d) => allNew.some((p) => p.shipId === d.id))) {
          onPlaceShips(allNew);
        }
      } else {
        // Click on existing ship to re-select it
        const cell = board[y]?.[x];
        if (cell?.state === "ship" && cell.shipId) {
          setSelectedShipId(cell.shipId);
          // Remove it from placements so it can be moved
          setPlacements((prev) => prev.filter((p) => p.shipId !== cell.shipId));
        }
      }
    },
    [isReady, selectedShipId, horizontal, placements, onPlaceShips, board]
  );

  const handleRandomize = () => {
    const newPlacements = randomizePlacementsClient();
    setPlacements(newPlacements);
    setSelectedShipId(null);
    onPlaceShips(newPlacements);
    // Also tell server to randomize (optional — client already has them)
    onRandomize();
  };

  const handleClearAll = () => {
    if (isReady) return;
    setPlacements([]);
    setSelectedShipId(null);
  };

  return (
    <div className="placement-screen">
      {/* Left: board + players */}
      <div className="placement-left">
        {/* Players row */}
        <div className="players-list" style={{ justifyContent: "flex-start" }}>
          <PlayerCard player={myInfo} isMe={true} showReady={true} />
          {opponent ? (
            <PlayerCard player={opponent} isMe={false} showReady={true} />
          ) : (
            <div className="opponent-status">
              <div className="blink-dot" />
              Waiting for opponent...
            </div>
          )}
        </div>

        <Grid
          board={board}
          previewCells={hoverPreview}
          onHoverCell={handleHoverCell}
          onLeaveGrid={handleLeaveGrid}
          onClickCell={handleClickCell}
        />

        <div className="placement-hint">
          {selectedShipId
            ? `Placing ${SHIP_DEFINITIONS.find((d) => d.id === selectedShipId)?.name} — click grid to place · [R] to rotate`
            : "Click a ship to select · Click placed ship to move"}
        </div>
      </div>

      {/* Right: ship palette + controls */}
      <div className="placement-right">
        <div className="placement-title">Fleet</div>

        <div className="ship-palette">
          {SHIP_DEFINITIONS.map((def) => {
            const placed = placedIds.has(def.id) && selectedShipId !== def.id;
            const selected = selectedShipId === def.id;
            return (
              <div
                key={def.id}
                className={`ship-item ${placed ? "placed" : ""} ${selected ? "selected" : ""}`}
                onClick={() => {
                  if (isReady) return;
                  if (placed) return;
                  setSelectedShipId(selected ? null : def.id);
                }}
              >
                <div>
                  <div className="ship-mini-bar">
                    {Array.from({ length: def.size }).map((_, i) => (
                      <div key={i} className="ship-mini-cell" />
                    ))}
                  </div>
                </div>
                <div className="ship-item-info">
                  <div className="ship-item-name">{def.name}</div>
                  <div className="ship-item-size">{def.size} cells</div>
                </div>
                {placed && <span style={{ color: "var(--accent-pulse)", fontSize: 11 }}>✓</span>}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setHorizontal((h) => !h)}
            disabled={isReady}
          >
            ↻ {horizontal ? "Horizontal" : "Vertical"}
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleRandomize}
            disabled={isReady}
          >
            ⚄ Randomize
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClearAll}
            disabled={isReady || placements.length === 0}
          >
            ✕ Clear
          </button>

          <button
            className="btn btn-ready"
            onClick={onReady}
            disabled={!allPlaced || isReady}
            style={{ marginTop: 6 }}
          >
            {isReady ? "✓ Ready!" : "Ready →"}
          </button>
        </div>

        {isReady && (
          <div className="opponent-status" style={{ marginTop: 6 }}>
            <div className="blink-dot" />
            {opponent?.ready ? "Game starting..." : "Waiting for opponent..."}
          </div>
        )}
      </div>
    </div>
  );
};
