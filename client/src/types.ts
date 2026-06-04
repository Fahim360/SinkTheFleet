// Shared types — mirrored from server/src/types.ts

export type GamePhase = "waiting" | "placing" | "playing" | "finished";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

export interface Cell {
  x: number;
  y: number;
  state: CellState;
  shipId?: string;
}

export interface Ship {
  id: string;
  name: string;
  size: number;
  cells: Array<{ x: number; y: number }>;
  hits: number;
  sunk: boolean;
  horizontal: boolean;
}

export const SHIP_DEFINITIONS = [
  { id: "carrier",    name: "Carrier",    size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser",    name: "Cruiser",    size: 3 },
  { id: "submarine",  name: "Submarine",  size: 3 },
  { id: "destroyer",  name: "Destroyer",  size: 2 },
] as const;

export type ShipDefId = typeof SHIP_DEFINITIONS[number]["id"];

export interface PlayerInfo {
  sessionId: string;
  discordUserId?: string;
  username: string;
  avatarUrl?: string;
  isSpectator: boolean;
  ready: boolean;
  shipsPlaced: boolean;
}

export interface AttackResult {
  x: number;
  y: number;
  hit: boolean;
  sunkShipName?: string;
  gameOver?: boolean;
  winnerId?: string;
}

export interface LogEntry {
  timestamp: number;
  message: string;
  type: "hit" | "miss" | "sunk" | "system";
}

export interface PlacedShip {
  shipId: string;
  x: number;
  y: number;
  horizontal: boolean;
}

export interface ClientGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  mySessionId: string;
  currentTurnId: string | null;
  winnerId: string | null;
  myBoard: Cell[][];
  opponentBoard: Cell[][];
  myShips: Ship[];
  log: LogEntry[];
  spectatorCount: number;
}
