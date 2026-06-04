import { useEffect, useRef, useState, useCallback } from "react";
import * as Colyseus from "colyseus.js";
import { ClientGameState, AttackResult, PlacedShip } from "../types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface UseColyseusOptions {
  serverUrl: string;
  roomId: string;
  username: string;
  discordUserId?: string;
  avatarUrl?: string;
}

interface UseColyseusReturn {
  status: ConnectionStatus;
  gameState: ClientGameState | null;
  lastAttackResult: { result: AttackResult; attackerId: string } | null;
  error: string | null;
  placeShips: (ships: PlacedShip[]) => void;
  randomizeShips: () => void;
  setReady: () => void;
  attack: (x: number, y: number) => void;
  playAgain: () => void;
}

export function useColyseus({
  serverUrl,
  roomId,
  username,
  discordUserId,
  avatarUrl,
}: UseColyseusOptions): UseColyseusReturn {
  const clientRef = useRef<Colyseus.Client | null>(null);
  const roomRef = useRef<Colyseus.Room | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [lastAttackResult, setLastAttackResult] = useState<{
    result: AttackResult;
    attackerId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      try {
        setStatus("connecting");

        const client = new Colyseus.Client(serverUrl);
        clientRef.current = client;

        // Try to join existing room with this ID, or create it
        const room = await client.joinOrCreate("battleship", {
          roomId,
          username,
          discordUserId,
          avatarUrl,
        });

        if (!mounted) {
          room.leave();
          return;
        }

        roomRef.current = room;
        setStatus("connected");
        setError(null);

        room.onMessage("state_update", (state: ClientGameState) => {
          if (mounted) setGameState(state);
        });

        room.onMessage("attack_result", (data: { result: AttackResult; attackerId: string }) => {
          if (mounted) setLastAttackResult(data);
        });

        room.onMessage("randomized_ships", (data: { placements: PlacedShip[] }) => {
          // Dispatch a custom event for the placement component to handle
          window.dispatchEvent(
            new CustomEvent("randomized_ships", { detail: data.placements })
          );
        });

        room.onMessage("error", (data: { message: string }) => {
          if (mounted) setError(data.message);
          setTimeout(() => { if (mounted) setError(null); }, 3000);
        });

        room.onLeave((code) => {
          if (!mounted) return;
          console.log(`[Colyseus] Left room (code: ${code})`);
          if (code === 1000) {
            setStatus("disconnected");
          } else {
            // Abnormal disconnect — try to reconnect
            setStatus("reconnecting");
            reconnectTimer = setTimeout(() => {
              if (mounted) connect();
            }, 3000);
          }
        });

        room.onError((code, message) => {
          console.error(`[Colyseus] Room error ${code}: ${message}`);
          if (mounted) {
            setError(`Connection error: ${message}`);
            setStatus("disconnected");
          }
        });

      } catch (err) {
        console.error("[Colyseus] Connection failed:", err);
        if (mounted) {
          setStatus("reconnecting");
          setError("Failed to connect to server. Retrying...");
          reconnectTimer = setTimeout(() => {
            if (mounted) connect();
          }, 3000);
        }
      }
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (roomRef.current) {
        roomRef.current.leave();
        roomRef.current = null;
      }
    };
  }, [serverUrl, roomId, username, discordUserId, avatarUrl]);

  const send = useCallback((type: string, data?: Record<string, unknown>) => {
    if (roomRef.current) {
      roomRef.current.send(type, data || {});
    }
  }, []);

  const placeShips = useCallback(
    (ships: PlacedShip[]) => send("place_ships", { ships }),
    [send]
  );

  const randomizeShips = useCallback(() => send("randomize_ships"), [send]);

  const setReady = useCallback(() => send("set_ready"), [send]);

  const attack = useCallback(
    (x: number, y: number) => send("attack", { x, y }),
    [send]
  );

  const playAgain = useCallback(() => send("play_again"), [send]);

  return {
    status,
    gameState,
    lastAttackResult,
    error,
    placeShips,
    randomizeShips,
    setReady,
    attack,
    playAgain,
  };
}
