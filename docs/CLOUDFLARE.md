# Cloudflare (Pages + Worker) – Passo a passo

Este guia sobe o UI no Cloudflare Pages e o relay em um Worker com Durable Object (salas e token). Seu domínio: `lucrepostando.online`.

## 1) Preparar o repositório local
- Requisitos: Node 18+, npm, Git, `wrangler` (`npm i -g wrangler`).
- Build do UI local (opcional): `cd webapp && npm ci && npm run build`.

## 2) Subir o UI no Cloudflare Pages
- Acesse Cloudflare → Pages → Create a project → Connect to Git (recomendado) ou Upload diretório `webapp/dist`.
- Build settings:
  - Build command: `npm ci && npm run build` (com working dir `webapp`)
  - Output directory: `webapp/dist`
- Variáveis (Pages → Settings → Environment variables):
  - `VITE_WS_URL = wss://relay.lucrepostando.online`
  - `VITE_WS_PATH = /cs2_webradar`
- (Opcional) Custom Domain para o UI: adicione `radar.lucrepostando.online` ao projeto Pages.

## 3) Subir o Relay no Cloudflare Workers
- Login: `wrangler login`
- Deploy (na raiz do repo):
  - `cd cloudflare/worker`
  - `wrangler deploy`
- Anote a URL `*.workers.dev` (funciona como fallback para testes com WSS).
- Em Cloudflare → Workers & Pages → seu Worker → Settings → Variables:
  - `ALLOWED_ORIGINS = https://radar.lucrepostando.online,https://<seu-projeto>.pages.dev`

## 4) Roteamento do Worker no seu domínio
- DNS: crie `relay.lucrepostando.online` como “Proxied” (laranja).
- Workers → Routes → Add route: `relay.lucrepostando.online/cs2_webradar*` → selecione o Worker.
- Para o produtor (usermode) usar `ws://` (sem TLS):
  - Desative redirecionamento forçado em HTTP para este subdomínio (em SSL/TLS → Edge Certificates, deixe “Always Use HTTPS” desativado OU crie uma regra de página para não forçar HTTPS em `relay.lucrepostando.online/*`).
  - Resultado: o navegador usa `wss://relay...` e o usermode usa `ws://relay...`.

## 5) Configurar o usermode
- Edite `usermode/release/config.json` (criado no 1º run se não existir):
```
{
  "m_use_localhost": false,
  "m_local_ip": "",
  "m_public_ip": "",
  "m_ui_base": "https://radar.lucrepostando.online",
  "m_relay_host": "relay.lucrepostando.online",
  "m_relay_port": 80,
  "m_relay_path": "/cs2_webradar"
}
```
- Compile e execute `usermode.exe`. Ele gera sala e token, conecta ao Worker e exibe um link do tipo:
  - `https://radar.lucrepostando.online/r/ROOM?t=TOKEN`

## 6) Teste
- Abra o link no navegador (UI do Pages). Deve conectar via WSS ao Worker.
- Inicie uma partida; o `usermode` enviará frames para a sala; os viewers verão no radar.

## Notas
- Sem domínio: use a URL `*.workers.dev` como `VITE_WS_URL` (UI). O usermode precisaria de WSS (não suportado pelo easywsclient atual). Com seu domínio, o caminho com `ws` funciona.
- Segurança: mantenha `ALLOWED_ORIGINS` restrito. O token protege salas contra acesso casual.
- Escala: Durable Objects mantêm o estado da sala enquanto houver conexões; Cloudflare gerencia instâncias automaticamente.

