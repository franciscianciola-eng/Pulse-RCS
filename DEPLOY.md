# Deploy Pulse RCS — free, all in the browser

This gets your messenger live on the internet so two separate computers on different
networks can use it. Everything below is done in a web browser. No terminal, no credit card.

You'll use two free services:
- **Turso** — a free cloud database that stores your accounts and messages (survives restarts).
- **Render** — runs the server and gives you a public web address.

Total time: about 15 minutes. You'll create three free accounts along the way (GitHub,
Turso, Render).

---

## Part 1 — Put the code on GitHub (≈5 min)

Render deploys from a GitHub repository, so the files need to live there first.

1. Go to **github.com** and sign in (create a free account if you don't have one).
2. Click the **+** in the top-right → **New repository**.
3. Name it something like `pulse-rcs`. Leave it **Public** (or Private — both work). Click
   **Create repository**.
4. On the new empty repo page, click the link **“uploading an existing file”**
   (it's in the line "…or push an existing repository / uploading an existing file").
5. Drag **all the files from this project folder** into the upload box — including the
   `public` folder. Make sure you upload the contents (server.js, package.json, the `public`
   folder, etc.), not a zip.
   - Tip: if drag-and-drop won't take the folder, open the folder, select everything inside,
     and drag that. Then separately use **choose your files** to add the `public/index.html`
     if it didn't come along — the `public` folder must end up in the repo.
6. Scroll down, click **Commit changes**.

Your code is now on GitHub.

---

## Part 2 — Create the free Turso database (≈5 min)

1. Go to **turso.tech** and click **Sign up** — signing in with your GitHub account is the
   fastest. It's free and asks for no card.
2. Once in the dashboard, create a new **Database** (also called a "group"/"database" — take
   the defaults, any name like `pulse`, nearest region).
3. Open the database and find its **connection details**. You need two values:
   - the **Database URL** — it looks like `libsql://pulse-yourname.turso.io`
   - an **auth token** — a long string of characters. If there's a button like
     **Create Token** / **Generate token**, click it and copy the token.
4. Keep these two values handy for the next part. (If you lose the token, just generate a new
   one — that's fine.)

---

## Part 3 — Deploy on Render (≈5 min)

1. Go to **render.com** and **Sign up** — again, signing in with GitHub is easiest, and no
   card is required for the free tier.
2. In the dashboard, click **New +** → **Web Service**.
3. Connect your GitHub account when prompted, then pick the `pulse-rcs` repository you made.
4. Render auto-detects Node.js. Confirm these settings (they should fill in automatically):
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
5. Before finishing, open the **Environment Variables** section (also called "Advanced" →
   "Environment Variables") and add the two Turso values:
   - Key `TURSO_DATABASE_URL` → paste your Turso Database URL
   - Key `TURSO_AUTH_TOKEN` → paste your Turso auth token
6. Click **Create Web Service**.

Render will build and start it — the first deploy takes a couple of minutes. When it's done
you'll see a URL at the top like:

```
https://pulse-rcs.onrender.com
```

Open it. That's your live messenger. Share that link with the other person; both of you
create an account, add each other by username, and chat across your different networks.

---

## Good to know

- **First load after a quiet spell is slow.** On the free tier, the server sleeps after 15
  minutes of no traffic and takes 30–60 seconds to wake on the next visit. After that it's
  snappy. Paid tiers ($7/mo) remove the sleep if you ever want that.
- **Your data is safe across restarts** because it lives in Turso, not on Render's disk.
- **Updating the app later:** edit the files on GitHub (or re-upload), and Render
  auto-redeploys within a minute.
- **Custom link:** the `onrender.com` address is yours to share as-is. A custom domain is a
  paid feature.

## If something goes wrong

- **App loads but sign-up spins forever / errors:** the Turso variables are probably missing
  or mistyped. In Render → your service → **Environment**, double-check both
  `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then **Manual Deploy → Clear build cache &
  deploy**.
- **Build failed:** open the **Logs** tab in Render and look at the last lines. Most often
  it's that `package.json` didn't make it into the repo root — confirm it's there on GitHub.
- **"Not found" at the URL root:** make sure the `public` folder (with `index.html` inside)
  was uploaded to GitHub.

## Security note

This is a demo-grade app: passwords are only lightly hashed, and CORS is open. Fine for
friends-and-family use. Before anything sensitive or public-facing, add real authentication
(server-side password hashing with bcrypt and proper sessions) and restrict CORS to your own
domain.
