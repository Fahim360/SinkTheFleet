import { PlacedShip, SHIP_DEFINITIONS } from "../types";

export interface PreviewShip {
  shipId: string;
  x: number;
  y: number;
  horizontal: boolean;
  size: number;
  valid: boolean;
}

export function getShipCells(
  x: number,
  y: number,
  size: number,
  horizontal: boolean
): Array<{ x: number; y: number }> {
  const cells = [];
  for (let i = 0; i < size; i++) {
    cells.push({ x: horizontal ? x + i : x, y: horizontal ? y : y + i });
  }
  return cells;
}

export function isValidPlacement(
  x: number,
  y: number,
  size: number,
  horizontal: boolean,
  existingPlacements: PlacedShip[],
  skipShipId?: string
): boolean {
  // Bounds check
  if (horizontal) {
    if (x < 0 || x + size > 10 || y < 0 || y >= 10) return false;
  } else {
    if (x < 0 || x >= 10 || y < 0 || y + size > 10) return false;
  }

  // Overlap check
  const newCells = getShipCells(x, y, size, horizontal);
  for (const placed of existingPlacements) {
    if (placed.shipId === skipShipId) continue;
    const def = SHIP_DEFINITIONS.find((s) => s.id === placed.shipId);
    if (!def) continue;
    const placedCells = getShipCells(placed.x, placed.y, def.size, placed.horizontal);
    for (const nc of newCells) {
      for (const pc of placedCells) {
        if (nc.x === pc.x && nc.y === pc.y) return false;
      }
    }
  }
  return true;
}

export function buildOccupiedMap(placements: PlacedShip[]): Set<string> {
  const occupied = new Set<string>();
  for (const p of placements) {
    const def = SHIP_DEFINITIONS.find((s) => s.id === p.shipId);
    if (!def) continue;
    const cells = getShipCells(p.x, p.y, def.size, p.horizontal);
    for (const c of cells) {
      occupied.add(`${c.x},${c.y}`);
    }
  }
  return occupied;
}

export function randomizePlacementsClient(): PlacedShip[] {
  const placements: PlacedShip[] = [];
  const occupied = new Set<string>();

  for (const def of SHIP_DEFINITIONS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const x = horizontal
        ? Math.floor(Math.random() * (10 - def.size + 1))
        : Math.floor(Math.random() * 10);
      const y = horizontal
        ? Math.floor(Math.random() * 10)
        : Math.floor(Math.random() * (10 - def.size + 1));

      const cells = getShipCells(x, y, def.size, horizontal);
      const ok = cells.every((c) => !occupied.has(`${c.x},${c.y}`));
      if (ok) {
        cells.forEach((c) => occupied.add(`${c.x},${c.y}`));
        placements.push({ shipId: def.id, x, y, horizontal });
        placed = true;
      }
    }
    if (!placed) return randomizePlacementsClient(); // retry
  }
  return placements;
}
