# Shadab — Frontend + Supabase steps

Deadline: Thu 12 Nov, 1pm MST. Total: ~2.5–3 hrs.

## Step 0 — Run it (10 min) — DONE, verified
```bash
cd kameti-ai
npm install
# Terminal 1
npm run dev    # http://localhost:5173
# Terminal 2
npm run server # http://localhost:3001
```
Runs in Simulated mode with no keys — that's normal.

## Step 1 — Frontend polish (1–1.5 hrs) — STARTED, in this zip
Files: `src/App.jsx`, `src/index.css`
- [x] Error handling: red banner with dismiss, pay/payout don't mark paid on failure, server-down message
- [x] Loading states: "Checking server…", "Loading circle…", "Processing…", "Paying out…", "Explaining…", "Asking Gemini…"
- [x] Gemini explanation: green AI box on each member card, labelled "AI explanation — Gemini" or "AI explanation — rule-based", with "Why this score" fallback
- [x] Reminders: new "Reminders — Month N" card listing who hasn't paid yet, with a Pay button per person
- [x] Mobile: 44px tap targets, full-width buttons, stacked header / payout button, 1-col members, 2-col stats
- [x] Persistence now: members save to localStorage, so a refresh doesn't wipe payments (Supabase replaces this)

## Step 2 — Test it (20 min)
- [ ] Pay Bilal + Omar, check Reminders shrinks, payout button unlocks only when all paid
- [ ] Click "Explain with AI" — check the AI box + label
- [ ] Resize to phone width (~390px) — check buttons don't overflow
- [ ] `npm run build` — must pass (verified in this zip)

## Step 3 — Supabase, if time (1 hr) — SCAFFOLD READY
Files: `src/supabase.js`, `supabase-members.sql`, `.env.example`
1. Free project at supabase.com → SQL Editor → run `supabase-members.sql`
2. `npm install @supabase/supabase-js`
3. Copy `.env.example` to `.env`, set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
4. In `App.jsx`, swap `loadSavedMembers()` for `loadMembersFromSupabase(demoMembers)` — see comment in `src/supabase.js`
5. Never commit a real `.env`

## Not doing
Login/auth, mobile app, multi-currency, chat.

## Sumeet's part (not yours)
PayPal Sandbox, trust score + dashboard, Gemini keys, video + Devpost.

## v3 — Duration + Apple-style redesign (2026-11-10)
- Duration: pick 3 / 5 / 6 / 10 / 12 months, or Custom 1-24, in Section 1 before starting.
  Locked once anyone pays. Progress bar shows Month X of N, totals show $ over the full run.
  If members > months, a note warns not everyone will get a payout.
  After the last payout, a "Circle complete" banner shows, with Start a new circle.
- Design: Apple-style clean UI — #f5f5f7 background, white cards, 20px corners, SF system font,
  blue #0071e3 primary buttons, pill buttons. No Apple logo. Kameti logo is the blue-green
  rounded square with a K and a circular arrow, top-left in the header.

## v4 — Professional homepage intro (2026-11-10)
- Sticky nav: Kameti logo + name, How it works / Members / Your circle, Start your circle button.
- Hero: "Save together. Win together.", 10 friends / $100 / $1,000 pot, Start + See how it works,
  live preview cards for pot + circle health.
- Features: Rotating pot, AI trust score, PayPal Sandbox — 3 cards.
- How it works: 01 Set it up (incl. fixed months), 02 Everyone pays, 03 One member wins.
- Footer with Kameti name + Sandbox note. No Apple logo anywhere.

## v5 — Minimal, beautiful, black logo (2026-11-10)
- Logo is now black: black rounded square, white K + circular arrow. No blue-green gradient, no Apple logo.
- One system: #f5f5f7 background, white cards, #1d1d1f ink, black primary buttons, blue only for links.
  Same 20px corners, same spacing, same shadows everywhere — synchronous.
- Satisfying motion: fade-up on load, cards lift on hover, buttons press to 0.97, progress animates
  0.6s, smooth scrolling, focus rings. Respects reduced-motion.
- Minimal but enough: no extra colours, no clutter — just hero, features, how it works, your circle.

## v6 — Correct Kameti concept (2026-11-10)
- You were right: old UI had a Pay button on every member, as if you pay everybody.
- Now: Create your group first (name, amount, months, add members, pick "You are").
- You pay ONLY yourself: a "Your payment — Month X" card with "Pay my $100 with PayPal (Sandbox)".
  Your member card is badged "You". Other members show only "Paid" / "Waiting for them to pay".
- Winner is random, no repeats: payout order is shuffled once before the circle starts
  ("Shuffle payout order" button, locked after start), shown as "1. Fatima · 2. Omar …".
  Each month takes the next person in that order. No one wins twice until everyone has won once.
- Demo only: Reminders list now says "Simulate payment" for other members, so judges can
  still unlock the payout in the demo. That is clearly labelled demo, not you paying them.

## v8 — Merged Sumeet's changes (2026-11-10)
- Sumeet's zip (kameti-ai__2.zip) was starter + his changes only — do NOT deploy it alone, it has no homepage/duration/random-winner/v7 polish.
- Merged into v7: predictNextMonthRisk() in trustScore.js, "Next month risk" line on each member card,
  PAYOUT_EMAIL in api.js (set to your Sandbox Personal test email, or leave '' for simulated),
  server.js Gemini debug logging on failure.
- Note: Sumeet changed the Gemini model to 'gemini-3.8-flash' — verify that model name with a Gemini key before relying on live Gemini; without a key the app falls back to simulated explanations anyway.

## v9 — Backend URL fix (2026-11-10, caught by Sumeet's Muse)
- Problem: src/api.js hardcoded http://localhost:3001. Vercel only hosts the frontend,
  it never runs server/server.js, so live PayPal/Gemini keys added to Vercel did nothing —
  the live link stayed Simulated / rule-based.
- Fix: api.js now uses VITE_SERVER_URL (import.meta.env) with fallback to localhost:3001.
- Added render.yaml for a free Render backend (node, npm install, node server/server.js).
  Put PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, GEMINI_API_KEY in Render env vars only.
- Deploy: 1) Render backend, get its URL. 2) Vercel frontend: set only
  VITE_SERVER_URL=https://kameti-ai-server.onrender.com, Redeploy.
  Then the live link should say Live Sandbox / Live Gemini.
- Fallback if Render is too much before Thu: film the video locally on localhost
  where Live Sandbox / Live Gemini already work; Vercel link can stay simulated-only.
- Supabase: still NOT wired in — only src/supabase.js scaffold, members from demoData.js.
  Do not add Supabase env vars yet.
