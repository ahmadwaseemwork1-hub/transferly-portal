# VOXPACT — Setup & Deployment Guide

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

**If you already ran `schema.sql` before** (i.e. you deployed an earlier
version of VOXPACT), run the migration files in order:
`supabase/migrations/002_employees_and_leads.sql`, then
`supabase/migrations/003_financials.sql`, then
`supabase/migrations/004_workflow_and_operations.sql`. Each adds new
columns/tables without touching your existing data. Fresh installs should
run `schema.sql`, then `002`, `003`, `004`, in that order.

Migration `004` also turns on Supabase Realtime for the `transfers` table
(needed for leads to appear on a client's dashboard instantly) — this
happens automatically as part of running the file, there's no separate
toggle to flip in the Supabase dashboard.

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
   VOXPACT's fields (client, date, lead name, phone, state, insurance
   type, value), preview, and import.
3. Your client logs in at the same URL and sees the transfer waiting for
   them to accept or decline.

## 8. Employees and the lead paste-form

Employees are a third login type, separate from admin and client. They can
only ever see their own submitted leads and stats — never financials, never
other employees' data.

1. As admin, go to **Employees > Add employee**. Set their employment type
   (on-site / hybrid / remote / part-time), a temporary password, and
   optionally a base rate + bonus tiers now (the payroll calculator that
   reads these comes in a later phase — for now this just saves the numbers
   so you don't have to re-enter them).
2. Assign clients to that employee from their detail page, if relevant.
3. The employee logs in and uses **Submit Lead**: they paste one row copied
   straight out of the lead spreadsheet — tab-separated, "NA" placeholders
   and all. The parser recognizes the real column layout automatically
   (first name, last name, DOB, email, phone, street, city, state, zip, a
   few sheet-specific columns, vehicle, carrier, home status), fills in
   every field, and shows it as **editable text boxes** — nothing is
   locked, so any misread is a one-click fix before submitting. It also
   still understands the older single-combined-name/address format as a
   fallback.
4. If you gave that employee a **daily cap** (set when creating them, or
   editable on their detail page), submissions stop being accepted past
   that count for the day with a clear message — not a silent failure.
5. The moment they submit, it lands on the matching client's dashboard
   live — no refresh needed. It also shows up under admin's **Approvals**
   page. Approving it is what marks it as counting toward that employee's
   payroll — it's separate from whether the insurance client accepts the
   same transfer for billing. Those two things don't block each other.
6. Employees can see exactly which clients are assigned to them, and that
   client's live details (schedule, cap, notes, whether their campaign is
   currently active), under **My Clients**.

The parser is smart about the layout but still honest about uncertainty: a
handful of sheet columns whose exact meaning isn't confirmed (right now
guessed as things like "Accidents"/"Tickets"/"Spouse") are shown in an
"Additional columns" section with editable labels, so nothing pasted is
ever silently dropped or mislabeled with false confidence.

## 9. Payroll

Once employees have submissions approved, **Payroll** (admin) and **My Pay**
(employee) show computed totals for today/week/month/6 months/year. The math
follows the exact rule you confirmed: below an employee's lowest bonus
tier, pay is base-rate x approved-transfer-count for that day. At or above
a tier's threshold, pay becomes that tier's flat amount instead — it does
not add to the per-transfer total. This is computed fresh from approved
transfers every time, not stored, so editing an employee's pay rules later
re-prices everything going forward without a migration.

One thing worth knowing: if a tier's flat amount is lower than what a few
more transfers would've earned per-transfer, hitting that tier can *reduce*
a day's pay. That's not a bug — it's exactly what you specified — but check
your tier numbers if a payout looks off.

## 10. Financials

Admin-only, under **Financials**. Four numbers, kept deliberately separate:

- **Billable** — automatic, computed from accepted transfers x each
  client's rate. This is what you're owed, not what you've been paid.
- **Actual received (net)** — what you manually log under "Log actual
  revenue": the gross amount a platform (Payoneer/PayPal/bank) paid out,
  minus its fee and any tax withheld. The net is what actually hit your
  bank.
- **Expenses** — rent, payroll, software, anything you log under "Log an
  expense."
- **Payroll** — pulled live from the payroll calculator above.

Net profit shown on the page is actual received minus expenses minus
payroll — not billable minus expenses, since billable is money you're
owed, not money you have.

**Currency**: toggle PKR/USD at the top. Every entry keeps whatever
currency it was logged in — nothing is silently converted. When you switch
the view to a currency different from how an entry was logged, converting
it needs that specific date's exchange rate. If VOXPACT doesn't have a
rate for that date yet, it shows a banner asking you to enter it right
there — and that date's amounts are left out of the totals (not guessed
at) until you do. Once entered, that rate is remembered permanently for
that date, so you only get asked once per date, ever.

## 11. Live delivery, accept → billable/refund, and campaigns

This is the workflow the client-facing side now runs on:

1. An employee (or admin) submits a lead for a client. It appears on that
   client's dashboard immediately (Supabase Realtime — not a polling
   delay), under "Needs your response."
2. The client **Accepts** or **Declines** it, same as before. Declining
   still asks for a reason.
3. Once accepted, it moves to a second, separate step: after the call
   itself has ended, the client (or admin) marks it **Billable** or
   **Refund**. Only "Billable" transfers count toward "credit pending,"
   monthly billable totals, and what an invoice can include — an accepted
   call that turns out not to be billable never quietly gets invoiced.
4. Every client also has a **Campaign** toggle (Active/Paused) they control
   themselves from their own dashboard, separate from the account-level
   Active/Paused status you control from the admin side. It's how a client
   tells your employees "I'm not taking calls right now" without you
   having to do anything on their behalf. Admin sees both statuses, and can
   filter the Clients list by campaign status.
5. The admin **Clients** page now shows, per client, all the operational
   details in one place — Campaign, Agent (mirrors Campaign), Schedule,
   Timer (pause-until), Cap, Transfer (cool-off), Status, and Extra info
   (accepted states, notes) — every field editable inline, any time.

## Checking your deployment is connected properly

After deploying, visit `https://your-app.vercel.app/api/health` in your
browser. It reports, in plain English:

- Whether all three environment variables are actually set in Vercel
- Whether the app can reach your Supabase database and read the `clients`
  table (this fails if you skipped running `supabase/schema.sql`)
- Whether the service role key works (needed for creating clients,
  uploading CSVs, and generating invoices)

If something's wrong, it tells you exactly which of the three it is
instead of a generic error. Fix that one thing and refresh.

## If login isn't working

1. Check `/api/health` first (above) — most login failures trace back to
   a missing environment variable or a schema that was never run.
2. If health checks all pass but a specific person still can't log in, the
   most common cause is a login that exists in Supabase Auth but has no
   matching row in the `profiles` table (e.g. you created the auth user by
   hand instead of through **Add client** or `create-admin.mjs`). The login
   page will now tell you explicitly if this is the case, instead of
   silently failing.
3. Never create login accounts directly in the Supabase Auth dashboard —
   always use **Admin > Add client** (for clients) or `create-admin.mjs`
   (for admins). Both of those also create the required `profiles` row;
   creating a user in the Auth tab alone does not.

## About the CSV upload

There's no fixed CSV template — you upload whatever columns your CSV
already has, and match them to VOXPACT's fields on screen each time.
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

- Billing: VOXPACT generates a printable/downloadable invoice (via your
  browser's "Print > Save as PDF") from each client's accepted, unbilled
  transfers. It does not collect payment — you invoice/collect outside the
  app (Stripe, bank transfer, etc.), matching what you asked for.
- Password resets: handled by you from each client's detail page in the
  admin dashboard. There's no self-service "forgot password" email flow.
- Multi-tenant security: every client only ever sees their own data. This
  is enforced at the database level (Postgres Row Level Security), not just
  hidden in the interface, so it holds even if someone inspects network
  requests.
- Payroll is now computed live from approved transfers using the tier rule
  you confirmed — see "Payroll" above. It is not a bank integration; it
  tells you what each employee is owed, you still pay them yourself.
- "Real time" means Supabase Realtime (a live database subscription), not a
  page that refreshes every few seconds — a submitted lead appears on the
  client's screen (and an employee's own submissions list) without anyone
  clicking refresh.
- Financials is now live — see "Financials" above. Actual revenue and
  expenses are entered by hand (this is a ledger you maintain, not a bank
  or Payoneer/PayPal API integration). Billable revenue and payroll are
  computed automatically from real transfer/employee data.
- Currency conversion never guesses a rate. If a date's rate hasn't been
  entered yet, that date's amounts are excluded from totals — not
  estimated — until you enter it.
