import { Room, Client } from "colyseus";
import {
  GamePhase,
  Cell,
  Ship,
  PlayerInfo,
  LogEntry,
  ClientMessage,
  ClientGameState,
  AttackResult,
  PlacedShip,
} from "./types";
import {
  validateAndPlaceShips,
  randomizePlacements,
  processAttack,
  buildOpponentBoardView,
  createEmptyBoard,
} from "./gameLogic";

interface PlayerState {
  info: PlayerInfo;
  board: Cell[][];
  ships: Ship[];
}

interface RoomState {
  phase: GamePhase;
  players: Map<string, PlayerState>;
  spectators: Set<string>;
  currentTurnId: string | null;
  winnerId: string | null;
  log: LogEntry[];
}

export class BattleshipRoom extends Room {
  private state: RoomState = {
    phase: "waiting",
    players: new Map(),
    spectators: new Set(),
    currentTurnId: null,
    winnerId: null,
    log: [],
  };

  maxClients = 20; // allow spectators

  onCreate(options: { roomId?: string }) {
    console.log(`[Room] Created: ${this.roomId}`);
    // Allow room ID override from Discord channel context
    if (options?.roomId) {
      this.roomId = options.roomId;
    }
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, { type, ...message } as ClientMessage);
    });
  }

  onJoin(client: Client, options: { username?: string; discordUserId?: string; avatarUrl?: string }) {
    const username = options?.username || `Player-${client.sessionId.slice(0, 4)}`;
    const isSpectator = this.state.players.size >= 2;

    if (isSpectator) {
      this.state.spectators.add(client.sessionId);
      const info: PlayerInfo = {
        sessionId: client.sessionId,
        discordUserId: options?.discordUserId,
        username,
        avatarUrl: options?.avatarUrl,
        isSpectator: true,
        ready: false,
        shipsPlaced: false,
      };
      this.state.players.set(client.sessionId, {
        info,
        board: createEmptyBoard(),
        ships: [],
      });
      console.log(`[Room] Spectator joined: ${username}`);
    } else {
      const info: PlayerInfo = {
        sessionId: client.sessionId,
        discordUserId: options?.discordUserId,
        username,
        avatarUrl: options?.avatarUrl,
        isSpectator: false,
        ready: false,
        shipsPlaced: false,
      };
      this.state.players.set(client.sessionId, {
        info,
        board: createEmptyBoard(),
        ships: [],
      });
      console.log(`[Room] Player joined: ${username} (${this.state.players.size}/2 players)`);

      if (this.state.players.size >= 2 && this.state.phase === "waiting") {
        this.transitionTo("placing");
      }
    }

    this.addLog(`${username} joined`, "system");
    this.broadcastState();
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const { username, isSpectator } = player.info;
    console.log(`[Room] ${username} left (consented: ${consented})`);

    this.state.players.delete(client.sessionId);
    this.state.spectators.delete(client.sessionId);

    if (!isSpectator && this.state.phase !== "finished" && this.state.phase !== "waiting") {
      // A real player left mid-game; end the game
      this.addLog(`${username} disconnected — game ended`, "system");
      this.state.phase = "waiting";
      this.state.currentTurnId = null;
      this.state.winnerId = null;
      // Clear remaining player states
      for (const [id, p] of this.state.players) {
        if (!p.info.isSpectator) {
          p.board = createEmptyBoard();
          p.ships = [];
          p.info.ready = false;
          p.info.shipsPlaced = false;
        }
      }
    } else if (!isSpectator && this.state.phase === "waiting") {
      // Nothing to do
    }

    this.addLog(`${username} left`, "system");
    this.broadcastState();
  }

  onDispose() {
    console.log(`[Room] Disposed: ${this.roomId}`);
  }

  // ─── Message Handling ───────────────────────────────────────────────────────

  private handleMessage(client: Client, msg: ClientMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    switch (msg.type) {
      case "identify":
        player.info.discordUserId = msg.discordUserId;
        player.info.username = msg.username || player.info.username;
        player.info.avatarUrl = msg.avatarUrl;
        this.broadcastState();
        break;

      case "place_ships":
        this.handlePlaceShips(client, player, msg.ships);
        break;

      case "randomize_ships":
        this.handleRandomizeShips(client, player);
        break;

      case "set_ready":
        this.handleSetReady(client, player);
        break;

      case "attack":
        this.handleAttack(client, player, msg.x, msg.y);
        break;

      case "play_again":
        this.handlePlayAgain(client, player);
        break;
    }
  }

  private handlePlaceShips(client: Client, player: PlayerState, ships: PlacedShip[]) {
    if (player.info.isSpectator) return;
    if (this.state.phase !== "placing") {
      this.sendError(client, "Cannot place ships in current phase");
      return;
    }

    const result = validateAndPlaceShips(ships);
    if (!result.valid) {
      this.sendError(client, result.error || "Invalid placement");
      return;
    }

    player.board = result.board;
    player.ships = result.ships;
    player.info.shipsPlaced = true;
    this.broadcastState();
  }

  private handleRandomizeShips(client: Client, player: PlayerState) {
    if (player.info.isSpectator) return;
    if (this.state.phase !== "placing") {
      this.sendError(client, "Cannot randomize ships in current phase");
      return;
    }

    const placements = randomizePlacements();
    const result = validateAndPlaceShips(placements);
    if (!result.valid) {
      this.sendError(client, "Randomization failed");
      return;
    }

    player.board = result.board;
    player.ships = result.ships;
    player.info.shipsPlaced = true;

    // Send the placements back so client can render them
    client.send("randomized_ships", { placements });
    this.broadcastState();
  }

  private handleSetReady(client: Client, player: PlayerState) {
    if (player.info.isSpectator) return;
    if (this.state.phase !== "placing") {
      this.sendError(client, "Cannot ready in current phase");
      return;
    }
    if (!player.info.shipsPlaced) {
      this.sendError(client, "Place ships before readying");
      return;
    }

    player.info.ready = true;
    this.addLog(`${player.info.username} is ready!`, "system");

    // Check if all active players are ready
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length === 2 && activePlayers.every((p) => p.info.ready)) {
      this.startGame();
    } else {
      this.broadcastState();
    }
  }

  private handleAttack(client: Client, player: PlayerState, x: number, y: number) {
    if (player.info.isSpectator) {
      this.sendError(client, "Spectators cannot attack");
      return;
    }
    if (this.state.phase !== "playing") {
      this.sendError(client, "Game is not in playing phase");
      return;
    }
    if (this.state.currentTurnId !== client.sessionId) {
      this.sendError(client, "Not your turn");
      return;
    }

    // Find opponent
    const opponent = this.getActivePlayers().find(
      (p) => p.info.sessionId !== client.sessionId
    );
    if (!opponent) {
      this.sendError(client, "No opponent found");
      return;
    }

    const result = processAttack(opponent.board, opponent.ships, x, y);
    if (!result.valid) {
      this.sendError(client, result.error || "Invalid attack");
      return;
    }

    const coordStr = `${String.fromCharCode(65 + x)}${y + 1}`;

    if (result.hit) {
      if (result.sunkShipName) {
        this.addLog(
          `${player.info.username} sunk ${opponent.info.username}'s ${result.sunkShipName} at ${coordStr}!`,
          "sunk"
        );
      } else {
        this.addLog(`${player.info.username} hit ${coordStr}!`, "hit");
      }
    } else {
      this.addLog(`${player.info.username} missed ${coordStr}`, "miss");
    }

    const attackResult: AttackResult = {
      x,
      y,
      hit: result.hit,
      sunkShipName: result.sunkShipName,
      gameOver: result.gameOver,
      winnerId: result.gameOver ? client.sessionId : undefined,
    };

    if (result.gameOver) {
      this.state.phase = "finished";
      this.state.winnerId = client.sessionId;
      this.addLog(`🏆 ${player.info.username} wins!`, "system");
    } else {
      // Switch turns
      const activePlayers = this.getActivePlayers();
      this.state.currentTurnId =
        activePlayers.find((p) => p.info.sessionId !== client.sessionId)?.info.sessionId || null;
    }

    // Broadcast attack result to all
    this.broadcast("attack_result", {
      result: attackResult,
      attackerId: client.sessionId,
    });

    this.broadcastState();
  }

  private handlePlayAgain(client: Client, player: PlayerState) {
    if (player.info.isSpectator) return;
    if (this.state.phase !== "finished") return;

    // Reset all player states
    for (const [, p] of this.state.players) {
      if (!p.info.isSpectator) {
        p.board = createEmptyBoard();
        p.ships = [];
        p.info.ready = false;
        p.info.shipsPlaced = false;
      }
    }

    this.state.currentTurnId = null;
    this.state.winnerId = null;
    this.state.log = [];

    const activePlayers = this.getActivePlayers();
    if (activePlayers.length >= 2) {
      this.transitionTo("placing");
    } else {
      this.transitionTo("waiting");
    }

    this.addLog("New game started!", "system");
    this.broadcastState();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getActivePlayers(): PlayerState[] {
    return Array.from(this.state.players.values()).filter((p) => !p.info.isSpectator);
  }

  private transitionTo(phase: GamePhase) {
    console.log(`[Room] Phase: ${this.state.phase} → ${phase}`);
    this.state.phase = phase;
  }

  private startGame() {
    this.transitionTo("playing");
    const activePlayers = this.getActivePlayers();
    // Random first turn
    const firstPlayer = activePlayers[Math.floor(Math.random() * 2)];
    this.state.currentTurnId = firstPlayer.info.sessionId;
    this.addLog(`Game started! ${firstPlayer.info.username} goes first.`, "system");
    this.broadcastState();
  }

  private addLog(message: string, type: LogEntry["type"]) {
    this.state.log.push({ timestamp: Date.now(), message, type });
    // Keep last 50 entries
    if (this.state.log.length > 50) {
      this.state.log = this.state.log.slice(-50);
    }
  }

  private sendError(client: Client, message: string) {
    client.send("error", { message });
  }

  private buildClientState(forSessionId: string): ClientGameState {
    const activePlayers = this.getActivePlayers();
    const me = this.state.players.get(forSessionId);

    const playerInfos = Array.from(this.state.players.values())
      .filter((p) => !p.info.isSpectator)
      .map((p) => p.info);

    const opponent = activePlayers.find((p) => p.info.sessionId !== forSessionId);

    let myBoard: Cell[][] = createEmptyBoard();
    let opponentBoard: Cell[][] = createEmptyBoard();
    let myShips: Ship[] = [];

    if (me && !me.info.isSpectator) {
      myBoard = me.board;
      myShips = me.ships;
      if (opponent) {
        opponentBoard = buildOpponentBoardView(opponent.board);
      }
    } else if (me && me.info.isSpectator) {
      // Spectators see no ships; only attack results on both boards
      if (activePlayers[0]) {
        myBoard = buildOpponentBoardView(activePlayers[0].board);
      }
      if (activePlayers[1]) {
        opponentBoard = buildOpponentBoardView(activePlayers[1].board);
      }
    }

    return {
      phase: this.state.phase,
      players: playerInfos,
      mySessionId: forSessionId,
      currentTurnId: this.state.currentTurnId,
      winnerId: this.state.winnerId,
      myBoard,
      opponentBoard,
      myShips,
      log: this.state.log,
      spectatorCount: this.state.spectators.size,
    };
  }

  private broadcastState() {
    for (const client of this.clients) {
      try {
        const state = this.buildClientState(client.sessionId);
        client.send("state_update", state);
      } catch (e) {
        console.error(`Failed to send state to ${client.sessionId}`, e);
      }
    }
  }
}
