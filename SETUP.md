# Setup — Supabase + Vercel

This turns Tapframe from a single-device demo into a real product where a QR
code resolves on anyone's phone. Follow it top to bottom once; it takes about
15 minutes and needs no prior backend experience.

If you skip this entirely, the app still runs — it just falls back to storing
everything in your own browser (fine for trying it out, not for sharing codes).

---

## Part 1 — Create the database (Supabase)

1. Go to **supabase.com**, sign in, click **New project**.
2. Name it `tapframe`, pick a region near you, set a database password (save it
   somewhere), and create. Wait ~2 minutes for it to provision.
3. In the left sidebar open **SQL Editor → New query**.
4. Open the file `supabase/migrations/0001_init.sql` from this repo, copy the
   whole thing, paste it into the editor, and click **Run**. You should see
   "Success. No rows returned." That built every table, index, security rule,
   and the public functions.
5. Turn on email codes: **Authentication → Providers → Email**. Make sure
   **Email** is enabled. Under **Authentication → Email Templates**, the default
   works — Supabase sends a 6-digit code (a "magic code") to sign in.
   - For real sending at volume you'll later add your own SMTP under
     **Project Settings → Auth → SMTP**, but the built-in sender is fine to
     start.
6. Get your keys: **Project Settings → API**. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string — this one is safe in the browser)

---

## Part 2 — Point the app at it

1. In the project root copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Paste your two values in:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
   ```
3. Run it locally:
   ```bash
   npm install
   npm run dev
   ```
   Open the app, click **Start free**, enter your email, and check your inbox
   for the 6-digit code. Once you're in, create a page — it's now saving to
   Supabase, not your browser.

**How to confirm it worked:** in the Supabase dashboard open **Table Editor →
pages**. Your new page is there as a row. That's the proof it's server-side.

---

## Part 3 — Test the actual unlock

This is the whole reason for the backend, so verify it directly:

1. On your laptop, create a page and open the **QR code** tab. Download the PNG
   or just copy the page URL.
2. On your **phone** (different device, on mobile data, not your laptop's
   browser), open that URL or scan the code.
3. The page loads. Fill in the email form.
4. Back on your laptop, open **Leads** — the email your phone submitted is
   there. And **Analytics** shows the scan and the lead.

That round trip — laptop makes it, phone scans it, laptop sees the result — is
what was impossible before. That's the launch-ready behaviour.

---

## Part 4 — Deploy to Vercel

1. Push this repo to GitHub.
2. Go to **vercel.com/new**, import the repo. Vercel detects Vite automatically.
3. Before deploying, open **Environment Variables** and add the same two:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Vercel gives you a URL like `tapframe.vercel.app`.
5. Back in Supabase: **Authentication → URL Configuration**, set **Site URL** to
   your Vercel URL and add it to **Redirect URLs**. This lets sign-in codes work
   on the live site.

Your QR codes now encode your Vercel URL and resolve for anyone, anywhere.

### Custom domain (optional)
When you're ready to use `qr.clearpath.click` for real: buy it, add it to your Vercel
project under **Settings → Domains**, and update the Supabase Site URL to match.
The QR codes will then encode the pretty domain. Until then they use the Vercel
URL, which works perfectly — it's just longer.

---

## What the anon key can and can't do

The anon key is *meant* to be public — it ships in every Supabase app's browser
bundle. It's safe because **Row Level Security** (built by the migration) means
that key can only ever read or write the signed-in user's own rows. A visitor
scanning a page can call three specific functions (view a page, record a scan,
submit a lead) and nothing else — they can't read your lead list or anyone
else's. That's the whole security model, and it's enforced in the database, not
in the app.

Never put the **service_role** key in the frontend or in this repo. You don't
need it for anything here.

---

## Troubleshooting

- **"This page isn't here" when scanning** — the page's slug doesn't match, or
  the page is archived. Check **Table Editor → pages**.
- **No sign-in email** — check spam; confirm Email provider is enabled; on the
  free tier Supabase rate-limits auth emails to a few per hour.
- **Leads not saving from a scan** — confirm the SQL migration ran fully
  (re-run it; it's safe to run twice). The `capture_lead` function must exist
  under **Database → Functions**.
- **Works locally, not on Vercel** — you forgot to add the two environment
  variables in Vercel, or the Supabase Site URL doesn't match your Vercel URL.
