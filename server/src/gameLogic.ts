import { Cell, Ship, PlacedShip, SHIP_DEFINITIONS } from "./types";

export function createEmptyBoard(): Cell[][] {
  const board: Cell[][] = [];
  for (let y = 0; y < 10; y++) {
    board[y] = [];
    for (let x = 0; x < 10; x++) {
      board[y][x] = { x, y, state: "empty" };
    }
  }
  return board;
}

export function validateAndPlaceShips(
  placements: PlacedShip[]
): { valid: boolean; error?: string; board: Cell[][]; ships: Ship[] } {
  // Validate we have exactly the right ships
  const expectedIds = SHIP_DEFINITIONS.map((s) => s.id);
  const placedIds = placements.map((p) => p.shipId);

  for (const id of expectedIds) {
    if (!placedIds.includes(id)) {
      return { valid: false, error: `Missing ship: ${id}`, board: [], ships: [] };
    }
  }

  if (placements.length !== SHIP_DEFINITIONS.length) {
    return { valid: false, error: "Wrong number of ships", board: [], ships: [] };
  }

  const board = createEmptyBoard();
  const ships: Ship[] = [];

  for (const placement of placements) {
    const def = SHIP_DEFINITIONS.find((s) => s.id === placement.shipId);
    if (!def) {
      return { valid: false, error: `Unknown ship: ${placement.shipId}`, board: [], ships: [] };
    }

    const { x, y, horizontal } = placement;
    const cells: Array<{ x: number; y: number }> = [];

    // Validate bounds
    if (horizontal) {
      if (x < 0 || x + def.size > 10 || y < 0 || y >= 10) {
        return { valid: false, error: `Ship ${def.name} out of bounds`, board: [], ships: [] };
      }
    } else {
      if (x < 0 || x >= 10 || y < 0 || y + def.size > 10) {
        return { valid: false, error: `Ship ${def.name} out of bounds`, board: [], ships: [] };
      }
    }

    // Place cells
    for (let i = 0; i < def.size; i++) {
      const cx = horizontal ? x + i : x;
      const cy = horizontal ? y : y + i;

      if (board[cy][cx].state !== "empty") {
        return { valid: false, error: `Ships overlap at ${cx},${cy}`, board: [], ships: [] };
      }

      board[cy][cx].state = "ship";
      board[cy][cx].shipId = def.id;
      cells.push({ x: cx, y: cy });
    }

    ships.push({
      id: def.id,
      name: def.name,
      size: def.size,
      cells,
      hits: 0,
      sunk: false,
      horizontal,
    });
  }

  return { valid: true, board, ships };
}

export function randomizePlacements(): PlacedShip[] {
  const board = createEmptyBoard();
  const placements: PlacedShip[] = [];

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

      // Check cells are free
      let ok = true;
      for (let i = 0; i < def.size; i++) {
        const cx = horizontal ? x + i : x;
        const cy = horizontal ? y : y + i;
        if (board[cy][cx].state !== "empty") {
          ok = false;
          break;
        }
      }

      if (ok) {
        for (let i = 0; i < def.size; i++) {
          const cx = horizontal ? x + i : x;
          const cy = horizontal ? y : y + i;
          board[cy][cx].state = "ship";
        }
        placements.push({ shipId: def.id, x, y, horizontal });
        placed = true;
      }
    }

    if (!placed) {
      // Should rarely happen; recurse
      return randomizePlacements();
    }
  }

  return placements;
}

export function processAttack(
  board: Cell[][],
  ships: Ship[],
  x: number,
  y: number
): {
  valid: boolean;
  hit: boolean;
  sunkShipName?: string;
  gameOver: boolean;
  error?: string;
} {
  if (x < 0 || x >= 10 || y < 0 || y >= 10) {
    return { valid: false, hit: false, gameOver: false, error: "Out of bounds" };
  }

  const cell = board[y][x];

  if (cell.state === "hit" || cell.state === "miss" || cell.state === "sunk") {
    return { valid: false, hit: false, gameOver: false, error: "Cell already attacked" };
  }

  const wasShip = cell.state === "ship";

  if (wasShip) {
    cell.state = "hit";
    const ship = ships.find((s) => s.cells.some((c) => c.x === x && c.y === y));
    if (ship) {
      ship.hits++;
      if (ship.hits >= ship.size) {
        ship.sunk = true;
        // Mark all cells as sunk
        for (const c of ship.cells) {
          board[c.y][c.x].state = "sunk";
        }
        const allSunk = ships.every((s) => s.sunk);
        return { valid: true, hit: true, sunkShipName: ship.name, gameOver: allSunk };
      }
    }
    return { valid: true, hit: true, gameOver: false };
  } else {
    cell.state = "miss";
    return { valid: true, hit: false, gameOver: false };
  }
}

export function buildOpponentBoardView(board: Cell[][]): Cell[][] {
  // Return a board where ship cells appear as empty (hidden)
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      state: cell.state === "ship" ? "empty" : cell.state,
      shipId: cell.state === "ship" ? undefined : cell.shipId,
    }))
  );
}
