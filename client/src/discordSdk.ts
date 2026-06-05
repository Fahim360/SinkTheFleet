import { DiscordSDK, DiscordSDKMock } from "@discord/embedded-app-sdk";

const CLIENT_ID = (import.meta as any).env.VITE_DISCORD_CLIENT_ID as string || "YOUR_APP_CLIENT_ID";

function isRunningInDiscord(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.has("frame_id") ||
      window.location.hostname.includes("discordsays.com")
    );
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

  if (!isRunningInDiscord() || CLIENT_ID === "YOUR_APP_CLIENT_ID") {
    console.log("[Discord SDK] Mock mode");
    const mockSdk = new DiscordSDKMock(CLIENT_ID, null, null, null);
    _sdk = mockSdk;
    context.channelId = "dev-channel-001";
    context.guildId = "dev-guild-001";
    context.instanceId = "dev-instance-001";
    context.user = {
      id: `dev-${Math.random().toString(36).slice(2, 8)}`,
      username: `DevPlayer${Math.floor(Math.random() * 99)}`,
      avatar: null,
      discriminator: "0",
      global_name: null,
    };
    return context;
  }

  try {
    const sdk = new DiscordSDK(CLIENT_ID);
    _sdk = sdk;
    await sdk.ready();
    console.log("[Discord SDK] Ready");

    context.channelId = sdk.channelId;
    context.guildId = sdk.guildId;
    context.instanceId = sdk.instanceId;

    // ── OAuth2 PKCE flow to get real user identity ──────────────────
    try {
      const { code } = await sdk.commands.authorize({
        client_id: CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "rpc.activities.write"],
      });

      // Exchange via your backend /api/discord/token
      const tokenRes = await fetch("/api/discord/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (tokenRes.ok) {
        const { access_token } = await tokenRes.json();
        const auth = await sdk.commands.authenticate({ access_token });

        if (auth?.user) {
          context.user = {
            id: auth.user.id,
            username: auth.user.username,
            avatar: auth.user.avatar ?? null,
            discriminator: auth.user.discriminator ?? "0",
            global_name: (auth.user as any).global_name ?? null,
          };
          context.isAuthenticated = true;
          console.log("[Discord SDK] Authenticated as:", context.user.username);
        }
      } else {
        throw new Error("Token exchange failed");
      }
    } catch (authErr) {
      // ── Fallback: use Discord RPC participant info ─────────────────
      // This gives us the user's display name even without a backend token exchange
      console.warn("[Discord SDK] Full auth failed, using participant fallback:", authErr);
      try {
        const participants = await sdk.commands.getInstanceConnectedParticipants();
        // The first participant is usually the current user
        const me = (participants as any)?.participants?.[0];
        if (me) {
          context.user = {
            id: me.id ?? `guest-${context.instanceId?.slice(-6)}`,
            username: me.username ?? me.nickname ?? `Player`,
            avatar: me.avatar ?? null,
            discriminator: me.discriminator ?? "0",
            global_name: me.global_name ?? me.nick ?? null,
          };
        } else {
          // Last resort: anonymous guest
          context.user = {
            id: `guest-${context.instanceId?.slice(-6) ?? Math.random().toString(36).slice(2,8)}`,
            username: `Player`,
            avatar: null,
            discriminator: "0",
            global_name: null,
          };
        }
      } catch {
        context.user = {
          id: `guest-${Math.random().toString(36).slice(2,8)}`,
          username: `Player`,
          avatar: null,
          discriminator: "0",
          global_name: null,
        };
      }
    }
  } catch (err) {
    console.error("[Discord SDK] Init failed:", err);
  }

  return context;
}

export function getSDK() { return _sdk; }

export function getAvatarUrl(userId: string, avatarHash: string | null): string | undefined {
  if (!avatarHash) return undefined;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`;
}
