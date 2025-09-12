export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Health check
    if (url.pathname === "/healthz") {
      return new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });
    }

    // Only handle our WS path
    const WS_PATH = "/cs2_webradar";
    if (url.pathname !== WS_PATH) {
      return new Response("Not found", { status: 404 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }

    const role = url.searchParams.get("role") === "producer" ? "producer" : "viewer";
    const room = (url.searchParams.get("room") || "default").trim();
    const token = (url.searchParams.get("t") || "").trim();

    // Origin allowlist for viewers
    if (role === "viewer") {
      const allowed = (env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const origin = request.headers.get("Origin");
      if (allowed.length && origin && !allowed.includes(origin)) {
        return new Response("origin not allowed", { status: 403 });
      }
    }

    const id = env.ROOM.idFromName(room);
    const obj = env.ROOM.get(id);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hand off the server end to the Durable Object for this room with explicit WS upgrade
    const doUrl = `https://do${WS_PATH}?role=${role}&room=${encodeURIComponent(room)}&t=${encodeURIComponent(token)}`;
    try {
      await obj.fetch(doUrl, {
        method: "GET",
        headers: { Upgrade: "websocket" },
        webSocket: server,
      });
    } catch (e) {
      try { server.close(1011, "do error"); } catch {}
      return new Response("do error", { status: 500 });
    }

    return new Response(null, { status: 101, webSocket: client });
  },
};

export class RoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.viewers = new Set();
    this.producers = new Set();
    this.token = undefined;
    this.lastBroadcast = 0;
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role") === "producer" ? "producer" : "viewer";
    const token = (url.searchParams.get("t") || "").trim();

    const ws = request.webSocket;
    ws.accept();

    // Token gating: if already set, must match; first producer may set it
    if (this.token) {
      if (token !== this.token) {
        try { ws.close(1008, "invalid token"); } catch {}
        return new Response(null, { status: 101, webSocket: ws });
      }
    } else if (role === "producer" && token) {
      this.token = token;
    }

    const set = role === "producer" ? this.producers : this.viewers;
    set.add(ws);

    ws.addEventListener("message", (evt) => {
      if (role !== "producer") return;
      const now = Date.now();
      if (now - this.lastBroadcast < 33) return; // ~30fps
      this.lastBroadcast = now;
      this.broadcastToViewers(evt.data);
    });

    const cleanup = () => {
      set.delete(ws);
      // If empty, drop token to allow next producer to set a new one
      if (this.viewers.size === 0 && this.producers.size === 0) {
        this.token = undefined;
      }
    };

    ws.addEventListener("close", cleanup);
    ws.addEventListener("error", cleanup);

    return new Response(null, { status: 101, webSocket: ws });
  }

  broadcastToViewers(data) {
    for (const v of this.viewers) {
      try { v.send(data); } catch { try { v.close(1011, "error"); } catch {} this.viewers.delete(v); }
    }
  }
}
