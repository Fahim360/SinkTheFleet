import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { BattleshipRoom } from "./BattleshipRoom";

const PORT               = parseInt(process.env.PORT || "3001", 10);
const DISCORD_CLIENT_ID  = process.env.DISCORD_CLIENT_ID  || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Discord OAuth2 token exchange ─────────────────────────────────
// Called by the client SDK after receiving an auth code.
// Exchanges the code for an access_token so the SDK can authenticate
// and return the real Discord user identity (username, avatar, etc.)
app.post("/api/discord/token", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code required" });
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.status(503).json({ error: "Discord credentials not configured on server" });
  }

  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Token exchange] Discord error:", err);
      return res.status(400).json({ error: "Token exchange failed" });
    }

    const data = await response.json() as { access_token: string };
    res.json({ access_token: data.access_token });
  } catch (e) {
    console.error("[Token exchange] Error:", e);
    res.status(500).json({ error: "Internal error" });
  }
});

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(gameServer.define("battleship", BattleshipRoom) as any).filterBy(["roomId"]);

httpServer.listen(PORT, () => {
  console.log(`Sink the Fleet server running on port ${PORT}`);
  if (!DISCORD_CLIENT_SECRET) {
    console.warn("⚠️  DISCORD_CLIENT_SECRET not set — avatar/username auth will not work");
  }
});
