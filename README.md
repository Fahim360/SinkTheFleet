# ⚓ Sink the Fleet

A complete 2-player Battleship Discord Activity built with:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Colyseus (authoritative game server)
- **Multiplayer**: Colyseus rooms — server-authoritative, in-memory
- **Discord Integration**: `@discord/embedded-app-sdk`

---

## Project Structure

```
sink-the-fleet/
├── client/                   # React + Vite frontend
│   ├── public/
│   │   └── anchor.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActivityLog.tsx     # Battle event log
│   │   │   ├── ConnectionBadge.tsx # Connection status indicator
│   │   │   ├── FinishedScreen.tsx  # Win/lose/spectate result screen
│   │   │   ├── Grid.tsx            # 10×10 board with labels
│   │   │   ├── PlacementScreen.tsx # Ship placement UI
│   │   │   ├── PlayingScreen.tsx   # Active game screen
│   │   │   ├── PlayerCard.tsx      # Player name + avatar card
│   │   │   ├── ShipHealth.tsx      # Fleet status tracker
│   │   │   └── WaitingScreen.tsx   # Waiting for 2nd player
│   │   ├── hooks/
│   │   │   └── useColyseus.ts      # Colyseus connection hook
│   │   ├── utils/
│   │   │   └── placement.ts        # Client-side ship placement logic
│   │   ├── App.tsx                 # Root component + phase routing
│   │   ├── discordSdk.ts           # Discord Embedded App SDK init
│   │   ├── main.tsx
│   │   ├── styles.css              # Dark naval theme
│   │   └── types.ts                # Shared type definitions
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                   # Node.js + Colyseus backend
│   ├── src/
│   │   ├── BattleshipRoom.ts   # Game room (server-authoritative)
│   │   ├── gameLogic.ts        # Board/ship/attack logic
│   │   ├── index.ts            # Express + Colyseus server entry
│   │   └── types.ts            # Shared types (mirrored in client)
│   ├── tsconfig.json
│   └── package.json
│
├── package.json              # Monorepo root
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Install Dependencies

```bash
# From project root
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Configure Environment

```bash
# Client
cp client/.env.example client/.env
# Edit client/.env — add your Discord App Client ID if you have one
# Leave VITE_SERVER_URL blank for localhost auto-detection

# Server
cp server/.env.example server/.env
```

### 3. Run Development Servers

```bash
# From project root — starts both client (port 3000) and server (port 3001)
npm run dev
```

Open two browser tabs at `http://localhost:3000` to test 2-player flow.

---

## Discord Activity Setup

### Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it "Sink the Fleet"
3. Go to **Activities** tab → Enable Activities
4. Under **URL Mappings**, add:
   - **Root Mapping**: `/` → `https://your-frontend-domain.com`
   - **Proxy Prefix**: `/.proxy/colyseus` → `https://your-backend-domain.com`

### Step 2: Configure OAuth2

In the Discord Developer Portal:
1. Go to **OAuth2** → add redirect URL: `https://your-frontend-domain.com`
2. Copy your **Client ID** → paste into `client/.env` as `VITE_DISCORD_CLIENT_ID`

### Step 3: Token Exchange Endpoint (Optional for Full Auth)

For full Discord user identity, add a `/api/discord/token` POST endpoint to the server:

```typescript
// In server/src/index.ts — add this route
app.post("/api/discord/token", async (req, res) => {
  const { code } = req.body;
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await response.json();
  res.json({ access_token: data.access_token });
});
```

The game works without full auth — players get auto-generated names in dev mode.

### Step 4: Deploy

#### Deploy Server (example: Railway / Render / Fly.io)

```bash
cd server
npm run build
# Set PORT env var on your host
npm start
```

#### Deploy Client (example: Vercel / Netlify / Cloudflare Pages)

```bash
cd client
# Set VITE_SERVER_URL=wss://your-server-domain.com
# Set VITE_DISCORD_CLIENT_ID=your_client_id
npm run build
# Deploy dist/ folder
```

#### Discord Activity Proxy

Discord Activities run inside an iframe. The SDK rewrites WebSocket URLs through Discord's proxy. The Vite config handles this in dev via `/.proxy/colyseus` path rewriting.

In production, configure your Discord Application's URL Mappings:
```
/.proxy/colyseus  →  wss://your-colyseus-server.com
```

And set `VITE_SERVER_URL` to the proxy path:
```
VITE_SERVER_URL=wss://your-app.discord.com/.proxy/colyseus
```

---

## Game Rules

### Ships
| Ship       | Size |
|------------|------|
| Carrier    | 5    |
| Battleship | 4    |
| Cruiser    | 3    |
| Submarine  | 3    |
| Destroyer  | 2    |

### How to Play

1. **Lobby**: Both players join the same Discord Activity (same channel)
2. **Placement**: Each player places 5 ships on their 10×10 grid
   - Click a ship in the palette, then click the board to place
   - Press **[R]** or the rotate button to toggle horizontal/vertical
   - Click a placed ship to move it
   - Use **Randomize** for instant placement
   - Press **Ready** when done
3. **Playing**: Take turns attacking the enemy grid (A1–J10)
   - Your turn = click cells on the enemy board
   - Hit = 🔴, Miss = ·, Sunk = 🟠
   - Battle log tracks all events
4. **Win**: Sink all 5 enemy ships

### Spectators
- Extra players beyond 2 become spectators
- Spectators see attack results on both boards but not hidden ships
- Spectators cannot attack or place ships

---

## Architecture Notes

### Server-Authoritative Design

The Colyseus backend (`BattleshipRoom.ts`) is the single source of truth:

- All game state lives on the server
- Clients send **intents** (attack, place, ready) — server validates and applies
- Server sends **state snapshots** to each client after every change
- Each client receives a view tailored to them (own ships visible, opponent ships hidden)

### Room Matching

Rooms are matched by `roomId` derived from the Discord Activity instance:
- `discord_{instanceId}` — unique per Activity launch (recommended)
- `discord_{channelId}` — fallback if instanceId unavailable
- `discord_dev` — local development

### Phase State Machine

```
waiting → placing → playing → finished
                                  ↓
                              placing (play again)
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `R` | Rotate ship during placement |
| `Escape` | Deselect current ship |

---

## License

MIT — free to use, modify, and deploy.
