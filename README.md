# Kameti AI

An AI-run rotating savings circle (kameti / committee), built for the PayPal AI Hackathon.

A group of people each pay the same amount every month. One member takes the
whole pot each month, in rotation. Kameti AI keeps track of who paid, scores
each member's reliability from their payment history, explains that score in
plain language, and pays the pot out through PayPal Sandbox.

## What it does

- Create a circle: name it, set the monthly amount, add members
- See the pot total, how much has been collected this month, and who is next
  in line for the payout
- See a trust score for every member: 0–100, Low / Medium / High risk, with
  a plain-language reason and on-time / late / missed counts
- Explain with AI: with a free Gemini key set, the explanation comes from
  Gemini; without it, the rule-based reason is used instead
- Pay with PayPal (Sandbox): with free PayPal Sandbox keys set, the server
  creates a real Sandbox order; without them, the payment is simulated
- Pay out the pot: once everyone has paid, pay the current month's winner
  through PayPal Sandbox Payouts (or simulated) and move to the next month
- Mode line at the top of the app shows honestly whether it is running in
  Live Sandbox or Simulated (no keys) mode

## How the trust score works

The score is calculated in `src/trustScore.js` from payment history:

- Start at 70
- On-time payment: +10
- Late payment: −15
- Missed payment: −30
- Capped at 0–100
- 80+ is Low risk, 55–79 is Medium risk, below 55 is High risk

The Gemini explanation in `server/server.js` uses that score and history as
its input, so it never invents payments.

## Free stack

- Vite + React 18 frontend
- Small Express server in `server/server.js` (port 3001)
- PayPal Sandbox REST API: Checkout orders and Payouts — Sandbox only,
  no real money ever moves
- Gemini free tier, model `gemini-2.0-flash`, for the 2-sentence explanation
- No database yet, no paid service, no key required to run the demo

## How to run

On a Mac, from inside the `kameti-ai` folder:

```bash
npm install
npm run dev
```

Then open the local address Vite prints, usually http://localhost:5173

To run the server as well, in a second terminal from the same folder:

```bash
npm run server
```

The server runs on http://localhost:3001. Without any keys it returns
simulated responses. With keys set in a local `.env` file it calls the
real Sandbox and Gemini APIs.

To make a production build of the frontend:

```bash
npm run build
```

## Free keys — all optional

Copy `.env.example` to `.env` and fill in only the keys you want. Never
commit a real `.env` file, and never put a key in a public repo.

### PayPal Sandbox — free

1. Go to developer.paypal.com and sign in with a PayPal account
2. Go to Apps & Credentials, stay on Sandbox (never Live)
3. Create an app, copy the Client ID and Client Secret
4. Put them in `.env` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

### Gemini — free tier

1. Go to Google AI Studio at aistudio.google.com
2. Click Get API key, create a key in a new or existing project
3. Put it in `.env` as `GEMINI_API_KEY`
4. No card is needed for the free tier

### No keys at all

Skip the `.env` file entirely. The app still runs end to end: simulated
PayPal payments and payouts, and rule-based AI explanations.

## Who does what

### Sumeet

- PayPal integration: `server/server.js` Sandbox orders and Payouts, and
  the frontend calls in `src/api.js`
- Trust score and dashboard: `src/trustScore.js`, `src/App.jsx`, and the
  payment history shown on each member card
- Demo video and Devpost submission

### CS-major friend

- Frontend and member flow in `src/App.jsx` and `src/index.css`
- Data: move the member list from `src/demoData.js` into a free database
  such as Supabase, and add payment reminders
- Polish: loading states, error handling, mobile layout, and the Gemini
  explanation display

## 2-day MVP scope

Day 1: circle setup, add members, trust scores, PayPal Sandbox payments.
Day 2: pot payout and month rotation, Gemini explanations, integration
testing, demo video and submission.

Out of scope for the MVP: user accounts and login, real money, SMS
notifications, and multi-language support. Those are follow-ups, not
blockers for a working demo.
