# Transferly — Setup & Deployment Guide

This gets your client portal live at a real URL using free-tier Supabase
(database + login) and Vercel (hosting). Total time: about 15–20 minutes.

## 1. Create your Supabase project

1. Go to https://supabase.com and sign in (or create a free account).
2. Click **New project**. Pick any name (e.g. "transferly"), set a database
   password (save it somewhere), and choose a region close to you.
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Run the database schema

1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy its entire contents,
   paste it into the SQL editor, and click **Run**.
4. You should see "Success. No rows returned." This creates all tables,
   security rules, and the accept/decline function.

You can re-run this file safely later if needed — it won't duplicate data.

## 3. Get your API keys

1. In Supabase, go to **Project Settings > API**.
2. Copy three values:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal") → this is `SUPABASE_SERVICE_ROLE_KEY`

The service role key is powerful — it bypasses all security rules. Never
share it or put it in a public repository.

## 4. Push the code to GitHub

1. Create a new empty repository on GitHub (e.g. `transferly-portal`).
2. From this project's folder, run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/transferly-portal.git
   git push -u origin main
   ```

## 5. Deploy on Vercel

1. Go to https://vercel.com and sign in (or create a free account).
2. Click **Add New > Project**, then import the GitHub repo you just pushed.
3. Before deploying, expand **Environment Variables** and add the three
   values from step 3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy**. After a couple of minutes you'll get a live URL like
   `https://transferly-portal.vercel.app` — this is the link your clients
   and you will use to log in.

## 6. Create your first admin login

Admin accounts aren't created through a signup form (on purpose — nobody
should be able to sign themselves up as an admin). Instead, run this once
from your own computer:

1. Make sure you have Node.js installed.
2. In this project folder, run:
   ```
   npm install
   NEXT_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
   node scripts/create-admin.mjs you@yourcompany.com "YourStrongPassword123"
   ```
3. Go to your live Vercel URL and log in with that email/password. You'll
   land on the admin dashboard.

## 7. Add your first client and send your first transfer

1. As admin, go to **Clients > Add client**. Fill in their business info
   and set a temporary password for them — share it with them directly.
2. Go to **Upload Transfers**, choose a CSV file, match its columns to
   Transferly's fields (client, date, lead name, phone, state, insurance
   type, value), preview, and import.
3. Your client logs in at the same URL and sees the transfer waiting for
   them to accept or decline.

## About the CSV upload

There's no fixed CSV template — you upload whatever columns your CSV
already has, and match them to Transferly's fields on screen each time.
Only **client** and **date** are required; everything else is optional.
The "client" column must match an existing client's business name exactly
(case-insensitive) — rows that don't match are flagged and skipped, so one
typo never blocks the rest of the file.

## Local development (optional)

If you want to run this on your own computer before/instead of deploying:

```
npm install
cp .env.local.example .env.local   # then fill in your Supabase values
npm run dev
```

Then open http://localhost:3000.

## What's included vs. what's still manual

- Billing: Transferly generates a printable/downloadable invoice (via your
  browser's "Print > Save as PDF") from each client's accepted, unbilled
  transfers. It does not collect payment — you invoice/collect outside the
  app (Stripe, bank transfer, etc.), matching what you asked for.
- Password resets: handled by you from each client's detail page in the
  admin dashboard. There's no self-service "forgot password" email flow.
- Multi-tenant security: every client only ever sees their own data. This
  is enforced at the database level (Postgres Row Level Security), not just
  hidden in the interface, so it holds even if someone inspects network
  requests.
