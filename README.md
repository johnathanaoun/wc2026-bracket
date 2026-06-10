# 🏆 World Cup 2026 Bracket Challenge

A live bracket challenge app for you and your friends. Everyone gets the same link, submits their picks, and watches the leaderboard update in real time.

---

## 🚀 Deploy in 4 steps

### Step 1 — Create your Supabase database (free)

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign up with GitHub (easiest) or email
3. Click **New project** — name it `wc2026-bracket`, pick any region, set a password
4. Wait ~1 minute for it to spin up
5. In the left sidebar click **SQL Editor** → **New query**
6. Open the file `supabase_setup.sql` from this repo, paste the whole thing, click **Run**
7. You should see "Success" — your table is ready
8. Go to **Settings → API** in the left sidebar
9. Copy two things:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)

---

### Step 2 — Push to GitHub

1. Go to [github.com](https://github.com) and sign up / log in
2. Click the **+** icon top right → **New repository**
3. Name it `wc2026-bracket`, set to **Public**, click **Create repository**
4. On the next page, click **uploading an existing file**
5. Drag and drop ALL the files from this folder (everything except `node_modules/` and `dist/`)
6. Files to upload:
   - `src/` folder (App.jsx, main.jsx, supabase.js)
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `netlify.toml`
   - `.env.example`
   - `supabase_setup.sql`
   - `README.md`
7. Click **Commit changes**

---

### Step 3 — Deploy on Vercel (free)

1. Go to [vercel.com](https://vercel.com) and click **Sign Up** → continue with GitHub
2. Click **Add New → Project**
3. Find your `wc2026-bracket` repo and click **Import**
4. Vercel auto-detects it as a Vite project ✓
5. Before clicking Deploy, click **Environment Variables** and add:
   - Name: `VITE_SUPABASE_URL` → Value: your Project URL from Step 1
   - Name: `VITE_SUPABASE_ANON_KEY` → Value: your anon key from Step 1
6. Click **Deploy**
7. In ~60 seconds you get a live URL like `wc2026-bracket.vercel.app`

---

### Step 4 — Share the link

Drop your Vercel URL in Discord. Anyone who opens it can:
- Submit their bracket picks
- See everyone else's picks on the leaderboard (updates every 30 seconds automatically)
- Track scores as the tournament progresses

---

## 🎮 How it works

| Feature | Detail |
|---------|--------|
| Bracket flow | Groups → 3rd place picks → Full knockout bracket |
| Advancement | Click a team to pick them — they auto-advance through rounds |
| Shared DB | Supabase Postgres — all picks stored centrally |
| Live refresh | Leaderboard auto-refreshes every 30 seconds |
| AI tips | Built-in Claude AI gives group and winner predictions |
| Lock date | Picks lock June 11, 2026 at 15:00 UTC |

## Scoring

| Round | Points |
|-------|--------|
| Group stage (1st/2nd correct) | 1 pt each |
| 3rd place qualifier picks | 1 pt each |
| Round of 32 correct | 2 pts |
| Round of 16 correct | 3 pts |
| Quarter-final correct | 5 pts |
| Semi-final correct | 8 pts |
| Champion correct | 15 pts |
