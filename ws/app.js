import { WebSocketServer } from "ws";
import http from "http";
import https from "https";
import url from "url";
import fs from "fs";

// Centralized relay with room-based isolation and optional tokens
const PORT = Number(process.env.WS_PORT || process.env.PORT || 22006);
const WS_PATH = process.env.WS_PATH || "/cs2_webradar";

// Optionally enable TLS if key/cert are provided via env
const TLS_KEY_FILE = process.env.TLS_KEY_FILE;
const TLS_CERT_FILE = process.env.TLS_CERT_FILE;
let server;
if (TLS_KEY_FILE && TLS_CERT_FILE && fs.existsSync(TLS_KEY_FILE) && fs.existsSync(TLS_CERT_FILE)) {
  const credentials = {
    key: fs.readFileSync(TLS_KEY_FILE),
    cert: fs.readFileSync(TLS_CERT_FILE),
  };
  server = https.createServer(credentials);
  console.info(`[ws] TLS enabled`);
} else {
  server = http.createServer();
}
const wss = new WebSocketServer({ server, path: WS_PATH, perMessageDeflate: true });

// roomId -> { viewers: Set<ws>, producers: Set<ws>, lastBroadcast: number }
const rooms = new Map();
const getOrCreateRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { viewers: new Set(), producers: new Set(), lastBroadcast: 0, token: undefined });
  }
  return rooms.get(roomId);
};

// Keep connections healthy
const HEARTBEAT_MS = 15000;
wss.on("connection", (ws, request) => {
  const { query } = url.parse(request.url, true);
  const role = (query.role === "producer" ? "producer" : "viewer");
  const roomId = typeof query.room === "string" && query.room.trim().length > 0 ? query.room.trim() : "default";
  const token = typeof query.t === "string" ? query.t.trim() : undefined;

  const clientAddress = request.socket.remoteAddress?.replace("::ffff:", "") || "unknown";
  const room = getOrCreateRoom(roomId);

  // Optional origin allowlist for viewers (comma-separated)
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers?.origin;
  if (role === "viewer" && allowed.length && origin && !allowed.includes(origin)) {
    ws.close(1008, "origin not allowed");
    return;
  }

  // Optional token gate: if a token is set for the room, enforce it
  if (room.token && token !== room.token) {
    ws.close(1008, "invalid token");
    return;
  }
  // First token wins if provided by the first producer
  if (!room.token && role === "producer" && token) {
    room.token = token;
  }

  if (role === "producer") room.producers.add(ws); else room.viewers.add(ws);
  console.info(`[ws] ${clientAddress} connected role=${role} room=${roomId}`);

  ws.on("message", (data) => {
    if (role !== "producer") return; // only producers broadcast

    const now = Date.now();
    // Throttle to ~30fps per room
    if (now - room.lastBroadcast < 33) return;
    room.lastBroadcast = now;

    // Fanout to viewers only
    room.viewers.forEach((client) => {
      if (client.readyState === 1) {
        try { client.send(data); } catch (_) {}
      }
    });
  });

  ws.on("close", () => {
    room.viewers.delete(ws);
    room.producers.delete(ws);
    // If room is empty, clean up
    if (room.viewers.size === 0 && room.producers.size === 0) {
      rooms.delete(roomId);
    }
    console.info(`[ws] ${clientAddress} disconnected role=${role} room=${roomId}`);
  });

  ws.on("error", (err) => {
    console.error(`[ws] error role=${role} room=${roomId}`, err?.message || err);
  });
});

// Periodic ping to keep connections alive without forcing client pong
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      try { ws.ping(); } catch (_) {}
    }
  });
}, HEARTBEAT_MS);

server.listen(PORT, () => {
  console.info(`[ws] listening on port ${PORT} path ${WS_PATH}`);
});
