import React, { useState } from "react";
import { Cell, CellState } from "../types";

const COL_LABELS = ["A","B","C","D","E","F","G","H","I","J"];
const ROW_LABELS = ["1","2","3","4","5","6","7","8","9","10"];

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
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  const previewMap = new Map<string, boolean>();
  if (previewCells) {
    for (const c of previewCells) {
      previewMap.set(`${c.x},${c.y}`, c.valid);
    }
  }

  function getCellClass(cell: Cell): string {
    const key = `${cell.x},${cell.y}`;
    const classes: string[] = ["cell"];

    // Preview overlay (placement phase)
    if (previewMap.has(key)) {
      const valid = previewMap.get(key)!;
      classes.push(valid ? "preview-valid" : "preview-invalid");
      return classes.join(" ");
    }

    classes.push(cell.state);

    if (attackable && (cell.state === "empty" || cell.state === "ship")) {
      classes.push("attackable");
    }

    if (
      flashCell &&
      flashCell.x === cell.x &&
      flashCell.y === cell.y
    ) {
      classes.push("attack-flash");
    }

    return classes.join(" ");
  }

  function handleMouseEnter(x: number, y: number) {
    setHovered({ x, y });
    onHoverCell?.(x, y);
  }

  function handleMouseLeave() {
    setHovered(null);
    onLeaveGrid?.();
  }

  function handleClick(cell: Cell) {
    if (onClickCell) {
      onClickCell(cell.x, cell.y);
      return;
    }
    if (
      attackable &&
      onAttack &&
      (cell.state === "empty" || cell.state === "ship")
    ) {
      onAttack(cell.x, cell.y);
    }
  }

  return (
    <div className="grid-wrapper" onMouseLeave={handleMouseLeave}>
      {/* Column labels */}
      <div className="grid-col-labels">
        <div className="label-spacer" />
        {COL_LABELS.map((l) => (
          <div key={l} className="grid-col-label">{l}</div>
        ))}
      </div>

      {/* Rows */}
      <div className="grid-rows">
        {board.map((row, y) => (
          <div className="grid-row" key={y}>
            <div className="grid-row-label">{ROW_LABELS[y]}</div>
            {row.map((cell) => (
              <div
                key={`${cell.x},${cell.y}`}
                className={getCellClass(cell)}
                onMouseEnter={() => handleMouseEnter(cell.x, cell.y)}
                onClick={() => handleClick(cell)}
                title={`${COL_LABELS[cell.x]}${ROW_LABELS[cell.y]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
