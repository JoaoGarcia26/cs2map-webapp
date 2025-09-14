# CS2 WebRadar

Front-end React application for CS2 WebRadar with Vite.

## Development

```bash
npm run dev
```

## Production

Build the static assets and serve them with the built-in Express server, which handles dynamic room links such as `/r/<room>`:

```bash
npm run build
npm run start
```

The server listens on `PORT` (defaults to `8080`). For process management in production you can use [PM2](https://pm2.keymetrics.io/):

```bash
npm run build
pm2 start server.js --name cs2-webradar
```

If your WebSocket relay runs on another host, set `VITE_WS_URL` before building:

```bash
VITE_WS_URL=ws://relay.example.com:22006 npm run build
```

Alternatively, viewer links accept a `relay` query parameter pointing to the relay URL:

```
http://your.domain/r/<room>?t=<token>&relay=ws://relay.example.com:22006
```

## WebSocket Relay

The WebSocket relay can be started separately:

```bash
npm run relay:pm2
```
