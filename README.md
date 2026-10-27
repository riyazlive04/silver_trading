# Sirah Digital — Commodity Trading Desk

Internal platform for managing client investments in Sirah Digital's silver commodity trading desk: automatic
repayment schedule calculation, payout tracking, branded PDF/Excel statements, and an AI-assisted dashboard.

## Stack

Next.js 16 (App Router, TypeScript) · Prisma + PostgreSQL · Auth.js (credentials) · Tailwind + shadcn/ui ·
`@react-pdf/renderer` · `exceljs` · Recharts · `openai`

## First-time setup

Needs a Postgres database. Easiest locally is Docker:

```bash
docker compose up -d    # starts Postgres on localhost:5434 (see docker-compose.yml)
npm install
cp .env.example .env    # already points at the docker compose database by default
npx prisma db push      # creates the schema
npm run db:seed         # seeds the super admin, admin, interest rules, rate plans, and a demo client
npm run dev             # http://localhost:3000 (or next free port)
```

No Docker? Point `DATABASE_URL` in `.env` at any Postgres instance (local install, or a free tier on
Neon/Supabase/Vercel Postgres) instead of running `docker compose up -d`.

## Admin & super admin access

Two dedicated, password-only entry points bypass the regular email+password form:

- **`/admin`** — signs in as the seeded Admin account (`admin@sirahdigital.in`)
- **`/superadmin`** — signs in as the seeded Super Admin account (`support@sirahdigital.in`)

Both currently use the shortcut password set in `prisma/seed.ts` (`SHORTCUT_PASSWORD`). Change it there and
re-run `npm run db:seed` to rotate it — the seed enforces that password on every run, so changing it in the
Users screen alone will be overwritten the next time the seed script runs. The general `/login` page still works
for any account (Staff included) using its email + its own password.

## Environment variables (`.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string, e.g. `postgresql://user:pass@host:5432/dbname`. |
| `AUTH_SECRET` | yes | Auth.js session signing secret — generate with `openssl rand -base64 32`. Also used to derive the encryption key for the stored OpenAI API key (see below), so rotating it makes any previously-saved key unreadable (the app falls back to `OPENAI_API_KEY` and a super admin just re-enters the key). Generate it once and keep it stable — don't regenerate it on every deploy. |
| `AUTH_TRUST_HOST` | only when self-hosting | Auth.js needs this set to `true` behind most reverse proxies. Not needed on Vercel — it's trusted automatically there. |
| `OPENAI_API_KEY` | no | Fallback only — **the preferred way to set this is as a super admin, from Settings → Platform**, where it's encrypted at rest (AES-256-GCM, keyed off `AUTH_SECRET`) and never displayed again after saving. This env var is only used if no key has been configured there. Either way, enabling the AI cover-note generator and portfolio assistant also requires "Full AI Suite" to be on under Settings → Platform. |
| `OPENAI_MODEL` | no | Defaults to `gpt-4o`. |

## Roles

- **Super Admin** — everything below, plus exclusive control of Settings → Platform (the "Full AI Suite" and
  "Track Actual Payouts" feature flags). Seeded as the first user; create more via direct DB access, not the UI
  (prevents privilege escalation through the regular user-management screen).
- **Admin** — manages interest rules, rate plans, clients, investments, and Staff/Admin user accounts.
- **Staff** — day-to-day client and investment entry.

## Core business rules

- Minimum investment is admin-configurable (seeded at ₹3,00,000 per the original brief) under Settings → Rates &
  Rules, enforced both client- and server-side.
- Rate basis (monthly/annual) and payout structure (interest-only/amortizing) are global, admin-configurable
  settings — **not** hardcoded. Every investment snapshots the rules active at the moment it's created, so later
  admin changes never alter an existing client's schedule or exported statements.
- The calculation engine (`src/lib/calculator.ts`) is pure and covered by `npm test` — see
  `src/lib/calculator.test.ts` for the exact figures validated against the brief's rate table.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run test        # calculation engine unit tests (Vitest)
npm run db:seed     # re-run the seed script (idempotent — upserts, won't duplicate)
npm run db:studio   # Prisma Studio, to browse/edit the DB directly
```

## Deploying on Vercel

1. **Provision Postgres.** From the Vercel dashboard: Storage → Create Database → Postgres (this is Neon under
   the hood and wires `DATABASE_URL` into your project automatically). Neon or Supabase directly work just as
   well if you'd rather manage the database separately from Vercel.
2. **Import the project.** New Project → import `riyazlive04/silver_trading` from GitHub. Framework preset
   (Next.js) is auto-detected, no build command changes needed.
3. **Set environment variables** (Project → Settings → Environment Variables), for Production (and Preview if
   you want preview deploys to work too):
   - `DATABASE_URL` — already set if you provisioned Postgres from step 1; otherwise paste your connection
     string
   - `AUTH_SECRET` — generate once with `openssl rand -base64 32` and keep it fixed across deploys
   - `OPENAI_API_KEY` — optional; a super admin can set this from the app instead (Settings → Rates & Rules)
     once it's live
4. **Deploy.** Vercel runs `npm install` (which triggers `prisma generate` via the `postinstall` script) then
   `next build`.
5. **Initialize the production database**, once, after the first deploy. Copy the production `DATABASE_URL`
   from Vercel's env vars into your local `.env` (temporarily), then run:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
   Switch `.env` back to your local database afterward. This creates the schema and seeds the super admin,
   admin, default rate plans and interest rules. Re-running
   `db:seed` later is safe — it upserts and won't duplicate data, but it does reset the `/admin` and
   `/superadmin` shortcut password to whatever's in `prisma/seed.ts`, so change that file's `SHORTCUT_PASSWORD`
   before the first production seed if you want something other than the current one.
6. **Log in** at `/superadmin`, change the shortcut password's source in `prisma/seed.ts` for future reference,
   and set a real OpenAI key under Settings if you want the AI features live.

Custom domain: add it under Project → Settings → Domains as usual; nothing else in the app needs to know the
domain name (Auth.js reads it from the request).
