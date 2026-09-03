# Tapframe

QR pages for every YouTube video. Turn viewers on TVs, desktops and tablets —
screens where there is no link in bio — into leads you own.

React + Vite + Tailwind. No backend required to run it.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # production build into dist/
npm run preview      # serve the built output
npm run loadtest     # data layer benchmarks and correctness suite
```

---

## Deploy to Vercel

**GitHub import (recommended)**

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import it
3. Vercel auto-detects Vite. Click Deploy.

No environment variables needed. `vercel.json` includes the SPA rewrite, without
which any page refresh returns a 404.

**CLI**

```bash
npm i -g vercel && vercel
```

---

## Backend (Supabase + Vercel)

The app runs two ways:

- **Local mode** (no setup): everything saves to your browser. Good for trying
  it. A scanned QR only resolves on the device that made the page.
- **Connected mode** (Supabase): pages, leads, and analytics live in a real
  Postgres database. **A scanned QR resolves on anyone's phone** — this is the
  launch-ready mode.

To switch on connected mode, follow **[SETUP.md](./SETUP.md)** — about 15
minutes, no backend experience needed. The database schema, security rules, and
public page/scan/lead functions are all in `supabase/migrations/0001_init.sql`.

## What's in here

```
src/
├── main.jsx              entry point + storage shim
├── index.css             Tailwind layers, focus states, reduced-motion
├── lib/
│   ├── qr.js             QR encoder (byte mode, EC level M, versions 1-10)
│   ├── stats.js          O(1) event aggregation, no event log
│   ├── store.js          sharded persistence, LRU cache, streaming export
│   └── ratelimit.js      token bucket + coalescing write queue
└── ui/
    ├── App.jsx           all screens
    ├── Charts.jsx        lazy-loaded (keeps recharts out of the first paint)
    └── primitives.jsx    buttons, inputs, cards, QR renderer
```

**The QR engine is written from scratch**, not pulled from a package. ~180 lines,
zero dependencies, verified module-for-module against a reference encoder across
400 randomised inputs. Every code the app renders is genuinely scannable, and
PNG export runs at 16x so it stays sharp when a 1080p video scales it.

**Analytics keep no event log.** Events increment counters in O(1) and are
discarded. 1,000,000 events aggregate in 564ms into a 73KB payload.

**Leads are sharded** at 500 rows per storage key with a length index, so paging
costs the same at row 250,000 as at row 1.

---

## Scale

Verified by `npm run loadtest`:

| | |
|---|---|
| 1,000,000 events aggregated | 564ms → 73KB |
| 250,000 leads written | 352ms |
| Page load at any depth | ~0ms |
| Streamed CSV export of 250,000 | 183ms |
| 60 keystrokes → actual writes | 2 |

The browser ceiling is roughly **100,000 contacts**, bound by the 5–10MB
`localStorage` quota rather than by CPU. Past that you need a server.
[ARCHITECTURE.md](./ARCHITECTURE.md) has the Postgres schema, the API surface,
the rate-limit table, and the migration order.

---

## What is simulated

Stated up front so nothing surprises you:

- **Auth** — the six-digit code is generated and shown on screen. No email is sent.
- **Billing** — upgrading switches the plan locally. No Stripe.
- **Auth email** — with Supabase connected, sign-in sends a real 6-digit code.
  Without it, the app runs in local mode and shows the code on screen.
- **Billing** — upgrading switches the plan locally. Stripe isn't wired yet.
- **Search** covers the ~20,000 most recent leads and says so on screen.

The QR codes are not simulated.

---

## Roadmap

- [ ] Real magic-link auth (Resend or Postmark)
- [ ] Postgres + public page rendering at `qr.clearpath.click/:slug`
- [ ] Edge rate limiting per ARCHITECTURE.md
- [ ] Stripe billing
- [ ] Webhook out to ConvertKit / Mailchimp
- [ ] Local currency at checkout

---

Built by [@SirBusayoAmusan](https://github.com/SirBusayoAmusan)
