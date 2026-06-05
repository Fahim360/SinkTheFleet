import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const CLIENT_ID = (import.meta as any).env.VITE_DISCORD_CLIENT_ID as string || "";
const SERVER_URL = (import.meta as any).env.VITE_SERVER_URL as string || "";

// Derive the backend base URL from VITE_SERVER_URL
// e.g. "wss://foo.up.railway.app" → "https://foo.up.railway.app"
function getBackendHttpUrl(): string {
  if (!SERVER_URL) return "";
  return SERVER_URL
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://")
    .replace(/\/colyseus$/, "")
    .replace(/\/$/, "");
}

function isRunningInDiscord(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("frame_id") || window.location.hostname.includes("discordsays.com");
  } catch { return false; }
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name?: string | null;
}

export interface DiscordContext {
  channelId: string | null;
  guildId: string | null;
  instanceId: string | null;
  user: DiscordUser | null;
  isAuthenticated: boolean;
}

let _sdk: DiscordSDK | DiscordSDKMock | null = null;

export async function initDiscordSDK(): Promise<DiscordContext> {
  const context: DiscordContext = {
    channelId: null, guildId: null, instanceId: null,
    user: null, isAuthenticated: false,
  };

  // ── Dev / browser mode ───────────────────────────────────────────
  if (!isRunningInDiscord() || !CLIENT_ID) {
    console.log("[Discord SDK] Mock mode");
    _sdk = new DiscordSDKMock(CLIENT_ID || "dev", null, null, null);
    context.channelId  = "dev-channel-001";
    context.guildId    = "dev-guild-001";
    context.instanceId = "dev-instance-001";
    context.user = {
      id:            `dev-${Math.random().toString(36).slice(2, 8)}`,
      username:      `DevPlayer${Math.floor(Math.random() * 99)}`,
      avatar:        null,
      discriminator: "0",
      global_name:   null,
    };
    return context;
  }

  // ── Real Discord Activity ────────────────────────────────────────
  const sdk = new DiscordSDK(CLIENT_ID);
  _sdk = sdk;

  try {
    await sdk.ready();
    console.log("[Discord SDK] Ready. instanceId:", sdk.instanceId);

    context.channelId  = sdk.channelId;
    context.guildId    = sdk.guildId;
    context.instanceId = sdk.instanceId;

    // authorize → get code
    const { code } = await sdk.commands.authorize({
      client_id:     CLIENT_ID,
      response_type: "code",
      state:         "",
      prompt:        "none",
      scope:         ["identify", "rpc.activities.write"],
    });
    console.log("[Discord SDK] Got auth code");

    // exchange code for token via Railway backend
    const backendBase = getBackendHttpUrl();
    const tokenEndpoint = backendBase
      ? `${backendBase}/api/discord/token`
      : "/api/discord/token";

    console.log("[Discord SDK] Calling token endpoint:", tokenEndpoint);

    const tokenRes = await fetch(tokenEndpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${errText}`);
    }

    const { access_token } = await tokenRes.json();
    console.log("[Discord SDK] Got access token");

    // authenticate SDK with token — this gives us the full user object
    const auth = await sdk.commands.authenticate({ access_token });
    console.log("[Discord SDK] Authenticated:", auth?.user?.username);

    if (auth?.user) {
      context.user = {
        id:            auth.user.id,
        username:      auth.user.username,
        avatar:        auth.user.avatar ?? null,
        discriminator: auth.user.discriminator ?? "0",
        global_name:   (auth.user as any).global_name ?? null,
      };
      context.isAuthenticated = true;
    }

  } catch (err) {
    console.error("[Discord SDK] Auth failed:", err);
    // Fallback — still let them play with a placeholder name
    context.user = {
      id:            `fallback-${context.instanceId?.slice(-6) ?? "???"}`,
      username:      "Player",
      avatar:        null,
      discriminator: "0",
      global_name:   null,
    };
  }

  return context;
}

export function getSDK() { return _sdk; }

export function getAvatarUrl(userId: string, avatarHash: string | null): string | undefined {
  if (!avatarHash) return undefined;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`;
}
