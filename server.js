// Pulse RCS backend — shared storage + realtime push, backed by Turso (libSQL).
// Run:  npm install  &&  node server.js
// Required env (from Turso):  TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
// Optional env:  PORT (default 8787)
//
// If TURSO_DATABASE_URL is not set, it falls back to a local file (dev only) —
// handy for testing, but on Render's free tier you MUST set the Turso vars or
// data is lost on restart.

const express = require("express");
const { WebSocketServer } = require("ws");
const { createClient } = require("@libsql/client");
const path = require("path");
const http = require("http");

const PORT = process.env.PORT || 8787;

// ---- database: Turso in production, local file if no creds (dev) ----
const db = process.env.TURSO_DATABASE_URL
  ? createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  : createClient({ url: "file:pulse-local.db" });

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kv (
      scope TEXT NOT NULL,
      key   TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope, key)
    )
  `);
}

const scopeFor = (shared, clientId) => (shared ? "shared" : "p:" + (clientId || "anon"));

async function kvGet(scope, key) {
  const r = await db.execute({ sql: "SELECT value FROM kv WHERE scope=? AND key=?", args: [scope, key] });
  return r.rows.length ? r.rows[0].value : null;
}
async function kvSet(scope, key, value) {
  await db.execute({
    sql: "INSERT INTO kv(scope,key,value,updated_at) VALUES(?,?,?,?) " +
         "ON CONFLICT(scope,key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
    args: [scope, key, value, Date.now()],
  });
}
async function kvDel(scope, key) {
  const r = await db.execute({ sql: "DELETE FROM kv WHERE scope=? AND key=?", args: [scope, key] });
  return r.rowsAffected > 0;
}
async function kvList(scope, prefix) {
  const r = await db.execute({
    sql: "SELECT key FROM kv WHERE scope=? AND key LIKE ? ESCAPE '\\'",
    args: [scope, prefix.replace(/[%_\\]/g, "\\$&") + "%"],
  });
  return r.rows.map((row) => row.key);
}

const app = express();
app.use(express.json({ limit: "6mb" }));

// permissive CORS so the HTML frontend can be opened from anywhere
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-Client-Id");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const clientId = (req) => req.get("X-Client-Id") || req.query.cid || "anon";

app.get("/kv/:scope/:key", async (req, res) => {
  try {
    const shared = req.params.scope === "shared";
    const value = await kvGet(scopeFor(shared, clientId(req)), req.params.key);
    if (value === null) return res.status(404).json({ error: "not found" });
    res.json({ key: req.params.key, value });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.post("/kv/:scope/:key", async (req, res) => {
  try {
    const shared = req.params.scope === "shared";
    const { value } = req.body;
    if (typeof value !== "string") return res.status(400).json({ error: "value must be string" });
    await kvSet(scopeFor(shared, clientId(req)), req.params.key, value);
    if (shared) broadcast({ type: "change", key: req.params.key });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.delete("/kv/:scope/:key", async (req, res) => {
  try {
    const shared = req.params.scope === "shared";
    const deleted = await kvDel(scopeFor(shared, clientId(req)), req.params.key);
    res.json({ deleted });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get("/list/:scope", async (req, res) => {
  try {
    const shared = req.params.scope === "shared";
    const keys = await kvList(scopeFor(shared, clientId(req)), (req.query.prefix || "").toString());
    res.json({ keys });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use(express.static(path.join(__dirname, "public")));

// ---- realtime push ----
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const ws of wss.clients) if (ws.readyState === 1) ws.send(data);
}
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello" }));
  ws.on("message", () => {});
});

initDb()
  .then(() => {
    server.listen(PORT, () => {
      const mode = process.env.TURSO_DATABASE_URL ? "Turso (persistent)" : "local file (dev only)";
      console.log(`Pulse RCS backend on http://localhost:${PORT}  — storage: ${mode}`);
    });
  })
  .catch((e) => {
    console.error("Failed to init database:", e);
    process.exit(1);
  });
