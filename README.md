# Pulse RCS

A small messenger with accounts, contacts, text chat, read receipts, and a video-call
screen. The backend stores shared data in a cloud database (Turso), so people on different
computers and networks can message each other.

## Want it live on the internet?

Follow **[DEPLOY.md](./DEPLOY.md)** — a step-by-step, browser-only guide (free, no credit
card). About 15 minutes.

## Run it on your own computer (optional)

Needs Node.js 18+.

```bash
npm install
npm start
```

Then open http://localhost:8787. With no database configured it uses a local file
(`pulse-local.db`) — fine for trying it out on one machine. To sync across computers you need
the Turso setup described in DEPLOY.md; locally you can put the two `TURSO_*` values in a
`.env`-style shell export, or just deploy.

## What's in here

```
server.js         Backend: key/value storage API + WebSocket live push, backed by Turso/libSQL
package.json      Dependencies and the `npm start` command
public/index.html The frontend (React app, fully bundled — no build step)
.env.example      The two Turso variables you'll set on Render
DEPLOY.md         The browser-only deployment walkthrough
```

## How it works

The frontend talks to the backend through a tiny storage API (`/kv/...`, `/list/...`) that
mirrors get/set/delete/list. Shared data (accounts, contacts, chats) is common to everyone;
personal data (your login session) is namespaced per browser so it stays private. A WebSocket
(`/ws`) pushes a signal when shared data changes, so new messages arrive near-instantly.

## Limits

- **Free-tier sleep:** the host naps after 15 min idle; first request then takes ~30–60s.
- **Video calls:** the call screen captures your own camera and the controls work, but
  bridging two cameras across the internet needs WebRTC signaling — the `/ws` server is where
  that would plug in.
- **Security:** demo-grade auth (light client-side hashing, open CORS). Add real
  authentication before any sensitive use.
