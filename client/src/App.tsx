import React, { useEffect } from "react";
import { initDiscordSDK, DiscordContext, getAvatarUrl } from "./discordSdk";
import { useColyseus } from "./hooks/useColyseus";
import { ConnectionBadge } from "./components/ConnectionBadge";
import { WaitingScreen } from "./components/WaitingScreen";
import { PlacementScreen } from "./components/PlacementScreen";
import { PlayingScreen } from "./components/PlayingScreen";
import { FinishedScreen } from "./components/FinishedScreen";
import { Grid } from "./components/Grid";
import { ActivityLog } from "./components/ActivityLog";
import { PlacedShip } from "./types";

function resolveServerUrl(): string {
  const isDiscordIframe =
    window.location.hostname.includes("discordsays.com") ||
    new URLSearchParams(window.location.search).has("frame_id");

  if (isDiscordIframe) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/colyseus`;
  }

  const fromEnv = (import.meta as any).env.VITE_SERVER_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return "ws://localhost:3001";
}

function resolveRoomId(ctx: DiscordContext): string {
  if (ctx.instanceId) return `discord_${ctx.instanceId}`;
  if (ctx.channelId)  return `discord_${ctx.channelId}`;
  return "discord_dev";
}

export const App: React.FC = () => {
  const [discordCtx, setDiscordCtx] = React.useState<DiscordContext | null>(null);
  const [sdkReady,   setSdkReady  ] = React.useState(false);

  useEffect(() => {
    initDiscordSDK().then(ctx => { setDiscordCtx(ctx); setSdkReady(true); });
  }, []);

  if (!sdkReady || !discordCtx) {
    return (
      <div className="app">
        <div className="screen">
          <div className="waiting-icon" style={{ fontSize: 38 }}>⚓</div>
          <div style={{ fontFamily:"var(--font-display)", color:"var(--accent-radar)", fontSize:11, letterSpacing:"0.15em" }}>
            INITIALIZING...
          </div>
        </div>
      </div>
    );
  }

  return <GameApp discordCtx={discordCtx} />;
};

const GameApp: React.FC<{ discordCtx: DiscordContext }> = ({ discordCtx }) => {
  const serverUrl = resolveServerUrl();
  const roomId    = resolveRoomId(discordCtx);

  const username =
    discordCtx.user?.global_name ||
    discordCtx.user?.username    ||
    "Player";

  const avatarUrl =
    discordCtx.user?.id && discordCtx.user?.avatar
      ? getAvatarUrl(discordCtx.user.id, discordCtx.user.avatar)
      : undefined;

  const {
    status, gameState, lastAttackResult, error,
    placeShips, randomizeShips, setReady, attack, playAgain,
  } = useColyseus({ serverUrl, roomId, username, discordUserId: discordCtx.user?.id, avatarUrl });

  const myInfo  = gameState?.players.find(p => p.sessionId === gameState.mySessionId);
  const opponent = gameState?.players.find(p => p.sessionId !== gameState.mySessionId && !p.isSpectator);

  return (
    <div className="app">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="app-header">
        <div className="app-title">⚓ Sink the Fleet</div>
        <div className="header-right">
          {(gameState?.spectatorCount ?? 0) > 0 && (
            <div className="spectator-badge">👁 {gameState!.spectatorCount}</div>
          )}
          {myInfo?.isSpectator && <div className="spectator-badge">Spectating</div>}
          <ConnectionBadge status={status} />
        </div>
      </div>

      {error && <div className="error-toast">{error}</div>}

      {/* ── Phase routing ────────────────────────────────────── */}
      {!gameState || gameState.phase === "waiting" ? (
        <WaitingScreen
          players={gameState?.players ?? []}
          mySessionId={gameState?.mySessionId ?? ""}
          spectatorCount={gameState?.spectatorCount ?? 0}
        />

      ) : gameState.phase === "placing" ? (
        myInfo && !myInfo.isSpectator ? (
          <PlacementScreen
            onPlaceShips={placeShips}
            onRandomize={randomizeShips}
            onReady={setReady}
            myInfo={myInfo}
            opponent={opponent ?? null}
            isReady={myInfo.ready}
            isShipsPlaced={myInfo.shipsPlaced}
          />
        ) : (
          <div className="screen">
            <div className="waiting-icon">👁</div>
            <div className="waiting-title">Spectating</div>
            <div className="waiting-sub">Players are placing their fleets...</div>
            <div className="players-list">
              {gameState.players.filter(p => !p.isSpectator).map(p => (
                <div key={p.sessionId} className="player-card">
                  <div className="player-avatar">
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt={p.username} />
                      : p.username.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div className="player-name">{p.username}</div>
                    <div className={`player-status ${p.ready ? "ready" : ""}`}>
                      {p.ready ? "✓ Ready" : "Placing..."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      ) : gameState.phase === "playing" ? (
        myInfo?.isSpectator ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6, flex:1, overflow:"hidden", minHeight:0 }}>
            <div className="turn-banner their-turn">
              👁 SPECTATING — {gameState.players.find(p => p.sessionId === gameState.currentTurnId)?.username ?? "?"}'s turn
            </div>
            <div className="game-layout">
              <div className="board-section">
                <div className="board-label">{gameState.players.filter(p=>!p.isSpectator)[0]?.username}</div>
                <Grid board={gameState.myBoard} />
              </div>
              <ActivityLog entries={gameState.log} />
              <div className="board-section">
                <div className="board-label enemy">{gameState.players.filter(p=>!p.isSpectator)[1]?.username}</div>
                <Grid board={gameState.opponentBoard} />
              </div>
            </div>
          </div>
        ) : (
          <PlayingScreen
            gameState={gameState}
            lastAttackResult={lastAttackResult}
            onAttack={attack}
          />
        )

      ) : gameState.phase === "finished" ? (
        <FinishedScreen gameState={gameState} onPlayAgain={playAgain} />
      ) : null}
    </div>
  );
};
