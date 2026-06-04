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

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.post("/api/room", async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) {
    return res.status(400).json({ error: "channelId required" });
  }
  res.json({ roomId: `discord_${channelId}` });
});

const httpServer = http.createServer(app);

const gameServer = new Server({ server: httpServer });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(gameServer.define("battleship", BattleshipRoom) as any).filterBy(["roomId"]);

httpServer.listen(PORT, () => {
  console.log(`Sink the Fleet server running on port ${PORT}`);
});
