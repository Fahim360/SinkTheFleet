// Shared types for Sink the Fleet
// This file is duplicated in both client and server for simplicity

export type GamePhase = "waiting" | "placing" | "playing" | "finished";

export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

export interface Cell {
  x: number; // 0-9
  y: number; // 0-9
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

// Messages client -> server
export type ClientMessage =
  | { type: "place_ships"; ships: PlacedShip[] }
  | { type: "randomize_ships" }
  | { type: "set_ready" }
  | { type: "attack"; x: number; y: number }
  | { type: "play_again" }
  | { type: "identify"; discordUserId?: string; username: string; avatarUrl?: string };

export interface PlacedShip {
  shipId: string; // matches SHIP_DEFINITIONS id
  x: number;      // top-left origin
  y: number;
  horizontal: boolean;
}

// Messages server -> client
export type ServerMessage =
  | { type: "state_update"; state: ClientGameState }
  | { type: "attack_result"; result: AttackResult; attackerId: string }
  | { type: "error"; message: string };

export interface ClientGameState {
  phase: GamePhase;
  players: PlayerInfo[];
  mySessionId: string;
  currentTurnId: string | null;
  winnerId: string | null;
  myBoard: Cell[][];        // full info (own ships visible)
  opponentBoard: Cell[][];  // only hits/misses/sunk visible
  myShips: Ship[];
  log: LogEntry[];
  spectatorCount: number;
}
