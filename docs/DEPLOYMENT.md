# Deployment (Production)

This repository serves a React UI (Netlify) and a Node WebSocket relay for rooms/tokens.

## 1) Build and deploy the UI (Netlify)
- Base: `webapp/`
- Build command: `npm run build`
- Publish directory: `webapp/dist`
- Environment variables:
  - `VITE_WS_URL` = `wss://relay.yourdomain.com`
  - `VITE_WS_PATH` = `/cs2_webradar`
- Redirects: `webapp/public/_redirects` already handles SPA routes (`/r/:room`).

## 2) Run the relay (Node + pm2)
- Host the relay on a VPS (Ubuntu/Debian) behind Nginx.
- Install Node LTS and pm2.
- From repo root:
  - `cd webapp/ws`
  - `npm install` (only ws dependency)
  - `pm2 start ecosystem.config.js`
- Optional envs:
  - `PORT` (default 22006)
  - `WS_PATH` (default `/cs2_webradar`)
  - `ALLOWED_ORIGINS` (comma list, e.g., `https://yourapp.netlify.app`)
  - If not using Nginx TLS, set `TLS_KEY_FILE` and `TLS_CERT_FILE` to enable HTTPS/WSS directly.

## 3) Configure Nginx (WSS termination)
- Use `deploy/nginx.conf.example` as a starting point.
- Point `server_name` to your relay domain and set valid TLS certs.
- Proxy `/cs2_webradar` to `http://127.0.0.1:22006`.

## 4) Configure usermode (Windows app)
- Edit `usermode/release/config.json` (or generated at first run):
  - `m_use_localhost`: `false`
  - `m_ui_base`: `https://yourapp.netlify.app`
  - `m_relay_host`: `relay.yourdomain.com`
  - `m_relay_port`: `22006`
  - `m_relay_path`: `/cs2_webradar`
- Run `usermode.exe`. It generates a `room` and `token`, connects as producer, and shows a share link like:
  - `https://yourapp.netlify.app/r/ROOM?t=TOKEN`

## Notes
- Viewers must use the exact link (room + token) to join.
- The relay throttles broadcasts (~30 fps) and sends heartbeats for stability.
- Keep your relay updated and monitored (pm2 logs, restarts).

