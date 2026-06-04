import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { BattleshipRoom } from "./BattleshipRoom";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// API: get or create room for a given Discord channel
app.post("/api/room", async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) {
    return res.status(400).json({ error: "channelId required" });
  }

  // Return the room ID; client will join via Colyseus
  res.json({ roomId: `discord_${channelId}` });
});

const httpServer = http.createServer(app);

const gameServer = new Server({
  server: httpServer,
  express: app,
});

gameServer.define("battleship", BattleshipRoom, {
  // Allow clients to request a specific room ID
  filterBy: ["roomId"],
});

gameServer.listen(PORT);

console.log(`🚢 Sink the Fleet server running on port ${PORT}`);
console.log(`   WebSocket: ws://localhost:${PORT}`);
console.log(`   Health:    http://localhost:${PORT}/health`);
