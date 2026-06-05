import React, { useState } from "react";
import { Cell } from "../types";

const COL_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const ROW_LABELS = ["1","2","3","4","5","6","7","8","9","10"];

// ── SVG ship body segments rendered inside cells ─────────────────────
// Each ship is drawn as connected hull segments.
// We detect "which part" each ship cell is (start/mid/end, horizontal/vertical)
// from adjacent cells on the same ship.

interface ShipSegmentProps {
  part: "h-start" | "h-mid" | "h-end" | "v-start" | "v-mid" | "v-end" | "single";
  sunk?: boolean;
}

const ShipSegment: React.FC<ShipSegmentProps> = ({ part, sunk }) => {
  const fill = sunk ? "#7a3800" : "#1a5c7a";
  const stroke = sunk ? "#ff8c00" : "#4ab4d8";
  const shine = sunk ? "rgba(255,140,0,0.15)" : "rgba(100,200,255,0.18)";
  const id = `seg-${part}-${sunk ? "s" : "n"}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width="100%" height="100%"
      style={{ position:"absolute", inset:0, display:"block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shine} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {part === "single" && (
        <>
          <rect x="5" y="9" width="22" height="14" rx="6" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <rect x="12" y="5" width="8" height="7" rx="2" fill={fill} stroke={stroke} strokeWidth="1.2"/>
          <rect x="5" y="9" width="22" height="14" rx="6" fill={`url(#${id}-g)`}/>
          <line x1="9" y1="16" x2="23" y2="16" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.4"/>
        </>
      )}
      {(part === "h-start") && (
        <>
          <path d="M12 9 Q5 9 5 16 Q5 23 12 23 L32 23 L32 9 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
          <rect x="13" y="5" width="10" height="8" rx="2" fill={fill} stroke={stroke} strokeWidth="1.2"/>
          <path d="M12 9 Q5 9 5 16 Q5 23 12 23 L32 23 L32 9 Z" fill={`url(#${id}-g)`}/>
          <line x1="8" y1="16" x2="30" y2="16" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
      {(part === "h-mid") && (
        <>
          <rect x="0" y="9" width="32" height="14" fill={fill} stroke="none"/>
          <line x1="0" y1="9" x2="32" y2="9" stroke={stroke} strokeWidth="1.5"/>
          <line x1="0" y1="23" x2="32" y2="23" stroke={stroke} strokeWidth="1.5"/>
          <rect x="0" y="9" width="32" height="14" fill={`url(#${id}-g)`}/>
          <line x1="0" y1="16" x2="32" y2="16" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
      {(part === "h-end") && (
        <>
          <path d="M0 9 L20 9 Q27 9 27 16 Q27 23 20 23 L0 23 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M0 9 L20 9 Q27 9 27 16 Q27 23 20 23 L0 23 Z" fill={`url(#${id}-g)`}/>
          <line x1="2" y1="16" x2="24" y2="16" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
      {(part === "v-start") && (
        <>
          <path d="M9 12 Q9 5 16 5 Q23 5 23 12 L23 32 L9 32 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
          <rect x="13" y="6" width="6" height="9" rx="2" fill={fill} stroke={stroke} strokeWidth="1.1"/>
          <path d="M9 12 Q9 5 16 5 Q23 5 23 12 L23 32 L9 32 Z" fill={`url(#${id}-g)`}/>
          <line x1="16" y1="10" x2="16" y2="30" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
      {(part === "v-mid") && (
        <>
          <rect x="9" y="0" width="14" height="32" fill={fill} stroke="none"/>
          <line x1="9" y1="0" x2="9" y2="32" stroke={stroke} strokeWidth="1.5"/>
          <line x1="23" y1="0" x2="23" y2="32" stroke={stroke} strokeWidth="1.5"/>
          <rect x="9" y="0" width="14" height="32" fill={`url(#${id}-g)`}/>
          <line x1="16" y1="0" x2="16" y2="32" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
      {(part === "v-end") && (
        <>
          <path d="M9 0 L9 20 Q9 27 16 27 Q23 27 23 20 L23 0 Z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M9 0 L9 20 Q9 27 16 27 Q23 27 23 20 L23 0 Z" fill={`url(#${id}-g)`}/>
          <line x1="16" y1="2" x2="16" y2="24" stroke={stroke} strokeWidth="0.6" strokeDasharray="2 2" opacity="0.35"/>
        </>
      )}
    </svg>
  );
};

// ── Explosion / hit overlay ────────────────────────────────────────
const HitOverlay: React.FC<{ sunk?: boolean }> = ({ sunk }) => (
  <svg viewBox="0 0 32 32" width="100%" height="100%"
    style={{ position:"absolute", inset:0, display:"block", zIndex:2 }}>
    {sunk ? (
      // Sunk: orange X
      <>
        <line x1="6" y1="6" x2="26" y2="26" stroke="#ff8c00" strokeWidth="3" strokeLinecap="round"/>
        <line x1="26" y1="6" x2="6" y2="26" stroke="#ff8c00" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="16" cy="16" r="8" fill="rgba(255,80,0,0.18)" stroke="#ff8c00" strokeWidth="1"/>
      </>
    ) : (
      // Hit: red X
      <>
        <line x1="7" y1="7" x2="25" y2="25" stroke="#ff3333" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="25" y1="7" x2="7" y2="25" stroke="#ff3333" strokeWidth="2.5" strokeLinecap="round"/>
      </>
    )}
  </svg>
);

// ── Miss splash ────────────────────────────────────────────────────
const MissOverlay: React.FC = () => (
  <svg viewBox="0 0 32 32" width="100%" height="100%"
    style={{ position:"absolute", inset:0, display:"block" }}>
    <circle cx="16" cy="16" r="5" fill="none" stroke="#2a7090" strokeWidth="1.5"/>
    <circle cx="16" cy="16" r="2" fill="#2a7090"/>
    <line x1="16" y1="8" x2="16" y2="4" stroke="#2a7090" strokeWidth="1" opacity="0.6"/>
    <line x1="16" y1="28" x2="16" y2="24" stroke="#2a7090" strokeWidth="1" opacity="0.6"/>
    <line x1="8" y1="16" x2="4" y2="16" stroke="#2a7090" strokeWidth="1" opacity="0.6"/>
    <line x1="28" y1="16" x2="24" y2="16" stroke="#2a7090" strokeWidth="1" opacity="0.6"/>
  </svg>
);

// ── Determine ship segment shape from board ─────────────────────────
function getSegmentPart(
  board: Cell[][],
  x: number, y: number
): ShipSegmentProps["part"] {
  const shipId = board[y][x].shipId;
  if (!shipId) return "single";

  const left  = x > 0 && board[y][x-1].shipId === shipId;
  const right = x < 9 && board[y][x+1].shipId === shipId;
  const up    = y > 0 && board[y-1][x].shipId === shipId;
  const down  = y < 9 && board[y+1][x].shipId === shipId;

  if (left || right) {
    if (right && !left) return "h-start";
    if (left && !right) return "h-end";
    return "h-mid";
  }
  if (up || down) {
    if (down && !up) return "v-start";
    if (up && !down) return "v-end";
    return "v-mid";
  }
  return "single";
}

interface GridProps {
  board: Cell[][];
  attackable?: boolean;
  onAttack?: (x: number, y: number) => void;
  previewCells?: Array<{ x: number; y: number; valid: boolean }>;
  onHoverCell?: (x: number, y: number) => void;
  onLeaveGrid?: () => void;
  onClickCell?: (x: number, y: number) => void;
  flashCell?: { x: number; y: number } | null;
}

export const Grid: React.FC<GridProps> = ({
  board,
  attackable = false,
  onAttack,
  previewCells,
  onHoverCell,
  onLeaveGrid,
  onClickCell,
  flashCell,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const previewMap = new Map<string, boolean>();
  if (previewCells) {
    for (const c of previewCells) previewMap.set(`${c.x},${c.y}`, c.valid);
  }

  function handleMouseEnter(x: number, y: number) {
    setHovered(`${x},${y}`);
    onHoverCell?.(x, y);
  }

  function handleMouseLeave() {
    setHovered(null);
    onLeaveGrid?.();
  }

  function handleClick(cell: Cell) {
    if (onClickCell) { onClickCell(cell.x, cell.y); return; }
    if (attackable && onAttack && (cell.state === "empty" || cell.state === "ship")) {
      onAttack(cell.x, cell.y);
    }
  }

  return (
    <div className="grid-wrapper" onMouseLeave={handleMouseLeave}>
      {/* Column labels */}
      <div className="grid-col-labels">
        <div className="label-spacer" />
        {COL_LABELS.map(l => <div key={l} className="grid-col-label">{l}</div>)}
      </div>

      <div className="grid-rows">
        {board.map((row, y) => (
          <div className="grid-row" key={y}>
            <div className="grid-row-label">{ROW_LABELS[y]}</div>
            {row.map(cell => {
              const key = `${cell.x},${cell.y}`;
              const isPreview = previewMap.has(key);
              const previewValid = previewMap.get(key);
              const isHovered = hovered === key;
              const isFlash = flashCell?.x === cell.x && flashCell?.y === cell.y;
              const isShip = cell.state === "ship";
              const isHit = cell.state === "hit";
              const isMiss = cell.state === "miss";
              const isSunk = cell.state === "sunk";
              const canAttack = attackable && (cell.state === "empty" || cell.state === "ship");

              let cellClass = "cell";
              if (isPreview) cellClass += previewValid ? " preview-valid" : " preview-invalid";
              else if (isSunk) cellClass += " sunk";
              else if (isHit) cellClass += " hit";
              else if (isMiss) cellClass += " miss";
              else if (isShip) cellClass += " ship";
              if (canAttack) cellClass += " attackable";
              if (canAttack && isHovered) cellClass += " cell-hover";
              if (isFlash) cellClass += " attack-flash";

              const segPart = (isShip || isHit || isSunk) && cell.shipId
                ? getSegmentPart(board, cell.x, cell.y)
                : null;

              return (
                <div
                  key={key}
                  className={cellClass}
                  onMouseEnter={() => handleMouseEnter(cell.x, cell.y)}
                  onClick={() => handleClick(cell)}
                  title={`${COL_LABELS[cell.x]}${ROW_LABELS[cell.y]}`}
                >
                  {/* Ship hull */}
                  {segPart && !isMiss && (
                    <ShipSegment part={segPart} sunk={isSunk} />
                  )}
                  {/* Hit/sunk overlay */}
                  {(isHit || isSunk) && <HitOverlay sunk={isSunk} />}
                  {/* Miss splash */}
                  {isMiss && <MissOverlay />}
                  {/* Preview overlay */}
                  {isPreview && (
                    <div className={`preview-overlay ${previewValid ? "valid" : "invalid"}`} />
                  )}
                  {/* Attack hover crosshair */}
                  {canAttack && isHovered && (
                    <svg viewBox="0 0 32 32" width="100%" height="100%"
                      style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
                      <line x1="16" y1="2" x2="16" y2="30" stroke="#00ffe7" strokeWidth="1" opacity="0.7"/>
                      <line x1="2" y1="16" x2="30" y2="16" stroke="#00ffe7" strokeWidth="1" opacity="0.7"/>
                      <circle cx="16" cy="16" r="6" fill="none" stroke="#00ffe7" strokeWidth="1.2" opacity="0.8"/>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
