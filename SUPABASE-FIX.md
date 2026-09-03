# Fix Supabase Auth — Get the Right Key

The key you used (`sb_publishable_...`) is a new-style Supabase Storage key.
The app needs the **anon JWT key** which starts with `eyJ`.

## Steps to get it

1. Go to https://supabase.com and open your project
2. Click **Project Settings** (gear icon, bottom left)
3. Click **API** in the left sidebar
4. Under **Project API keys** you'll see two keys:
   - `anon public` — this is the one you need. It starts with `eyJ...`
   - `service_role` — DO NOT use this one in the app
5. Copy the `anon public` key

## Update your .env file

Open the `.env` file in the project root and replace the key:

```
VITE_SUPABASE_URL=https://hqvucyhhndylzdtpmppg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...paste-the-full-anon-key-here...
```

## Update on Vercel

Go to your Vercel project → Settings → Environment Variables → update
`VITE_SUPABASE_ANON_KEY` with the correct key → Redeploy.

## While the key is wrong

The app still works — entering your email auto-signs you in without a code
(local mode fallback). Your pages save to the browser, not the database.
Once you fix the key, sign out and sign back in — your Supabase data will load.
