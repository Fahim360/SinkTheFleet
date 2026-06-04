import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

// Discord Application ID from environment variable
const CLIENT_ID = (import.meta as unknown as { env: Record<string, string> }).env.VITE_DISCORD_CLIENT_ID || "YOUR_APP_CLIENT_ID";

// Detect if we're running inside Discord Activity iframe
// Discord Activities are loaded inside an iframe on the discord.com domain
function isRunningInDiscord(): boolean {
  try {
    // Discord injects a frame_id query param when loading Activities
    const params = new URLSearchParams(window.location.search);
    return params.has("frame_id") || window !== window.parent;
  } catch {
    return false;
  }
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
    channelId: null,
    guildId: null,
    instanceId: null,
    user: null,
    isAuthenticated: false,
  };

  // In development / outside Discord, use mock SDK
  if (!isRunningInDiscord() || CLIENT_ID === "YOUR_APP_CLIENT_ID") {
    console.log("[Discord SDK] Using mock SDK (not running inside Discord)");
    const mockSdk = new DiscordSDKMock(CLIENT_ID, null, null, null);
    _sdk = mockSdk;

    // Mock context for development
    context.channelId = "dev-channel-001";
    context.guildId = "dev-guild-001";
    context.instanceId = "dev-instance-001";
    context.user = {
      id: `dev-user-${Math.random().toString(36).slice(2, 6)}`,
      username: `DevPlayer${Math.floor(Math.random() * 99)}`,
      avatar: null,
      discriminator: "0000",
      global_name: null,
    };
    return context;
  }

  try {
    const sdk = new DiscordSDK(CLIENT_ID);
    _sdk = sdk;

    // Wait for SDK to be ready
    await sdk.ready();
    console.log("[Discord SDK] Ready");

    // Get instance context
    const instanceContext = await sdk.commands.getInstanceConnectedParticipants();
    context.channelId = sdk.channelId;
    context.guildId = sdk.guildId;
    context.instanceId = sdk.instanceId;

    // Authorize and get user info
    const { code } = await sdk.commands.authorize({
      client_id: CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: [
        "identify",
        "guilds",
        "rpc.activities.write",
      ],
    });

    // Exchange code for access token (requires your backend)
    // For simplicity, try the exchange endpoint
    try {
      const tokenResponse = await fetch("/api/discord/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (tokenResponse.ok) {
        const { access_token } = await tokenResponse.json();
        const auth = await sdk.commands.authenticate({ access_token });

        if (auth?.user) {
          context.user = {
            id: auth.user.id,
            username: auth.user.username,
            avatar: auth.user.avatar ?? null,
            discriminator: auth.user.discriminator ?? "0",
            global_name: (auth.user as { global_name?: string }).global_name,
          };
          context.isAuthenticated = true;
        }
      }
    } catch (authErr) {
      console.warn("[Discord SDK] OAuth failed, continuing without user auth:", authErr);
    }

    console.log("[Discord SDK] Context:", context);
    void instanceContext;
  } catch (err) {
    console.error("[Discord SDK] Init failed:", err);
  }

  return context;
}

export function getSDK(): DiscordSDK | DiscordSDKMock | null {
  return _sdk;
}

export function getAvatarUrl(userId: string, avatarHash: string | null): string | undefined {
  if (!avatarHash) return undefined;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`;
}
