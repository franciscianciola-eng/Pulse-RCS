# Pulse RCS

A small messenger with accounts, contacts, one-to-one chat, group chats, read receipts,
and a video-call screen. The backend stores shared data in a cloud database (Turso), so people on different
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

Because shared storage is readable by everyone, message bodies never go in plain: each
account gets an ECDH key pair on sign-up, and a one-to-one chat is encrypted with the key
the two sides derive from each other's public key.

## Group chats

**New group** in the sidebar starts a group with any of your contacts; anyone in a group can
add more of *their* contacts from the members panel (the people icon in the group header), or
leave it. Groups sit in the same list as one-to-one chats, sorted by the latest message.

A group gets one random AES-GCM key. That key is stored once per member, wrapped with the
ECDH secret between the member and whoever added them — so only members can read the
conversation, and adding someone later just adds one more wrapped copy. Joining that way
also makes the earlier history readable; leaving deletes your copy of the key, and the last
member out deletes the group.

Group storage keys: `rcsgroup:<id>` holds the roster and the wrapped keys,
`rcsgroupchat:<id>` holds the encrypted messages.

## Limits

- **Free-tier sleep:** the host naps after 15 min idle; first request then takes ~30–60s.
- **Video calls:** the call screen captures your own camera and the controls work, but
  bridging two cameras across the internet needs WebRTC signaling — the `/ws` server is where
  that would plug in.
- **Video calls are one-to-one:** group chats have no call button.
- **Group keys aren't rotated:** leaving removes your wrapped copy of the key, so the app
  stops decrypting for you, but the group keeps using the same key afterwards.
- **Security:** demo-grade auth (light client-side hashing, open CORS). Add real
  authentication before any sensitive use.
