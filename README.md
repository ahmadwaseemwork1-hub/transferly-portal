# Transferly

A client management portal for live-transfer billing between you and the
auto insurance agents you sell transfers to.

- **Admin**: manage clients, upload daily transfers via CSV, track credit
  pending across everyone, generate invoices.
- **Client**: log in to see today's transfers, accept or decline each one,
  track daily/weekly/monthly volume and credit pending, view invoices.

Built with Next.js (App Router), Supabase (Postgres + Auth + Row Level
Security), and Tailwind CSS.

## Getting started

See **SETUP.md** for full deployment instructions (Supabase + Vercel,
~15 minutes, no cost on free tiers).

For local development:

```
npm install
cp .env.local.example .env.local   # fill in your Supabase project values
npm run dev
```

## Project structure

```
src/app/admin/     Admin dashboard: clients, upload, invoices, overview
src/app/client/     Client dashboard: today's transfers, stats, history, invoices
src/app/login/      Shared login page
src/lib/            Supabase clients, auth helpers, business logic (pure, tested)
src/components/     Shared UI kit and layout
supabase/schema.sql Database schema + Row Level Security policies
scripts/            One-time admin account creation script
```

## Scripts

```
npm run dev      Local development server
npm run build    Production build
npm run start    Run a production build locally
npm run lint     ESLint
npm run test     Unit tests (vitest) for CSV parsing, stats, invoicing logic
```
