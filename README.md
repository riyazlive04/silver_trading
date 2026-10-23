# Sirah Digital — Commodity Trading Desk

Internal platform for managing client investments in Sirah Digital's silver commodity trading desk: automatic
repayment schedule calculation, payout tracking, branded PDF/Excel statements, and an AI-assisted dashboard.

## Stack

Next.js 16 (App Router, TypeScript) · Prisma + SQLite · Auth.js (credentials) · Tailwind + shadcn/ui ·
`@react-pdf/renderer` · `exceljs` · Recharts · `@anthropic-ai/sdk`

## First-time setup

```bash
npm install
npx prisma db push      # creates prisma/dev.db from the schema
npm run db:seed         # seeds the super admin, interest rules, rate plans, and a demo client
npm run dev             # http://localhost:3000 (or next free port)
```

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
| `DATABASE_URL` | yes | SQLite file path, e.g. `file:./dev.db` — resolved relative to `prisma/schema.prisma`, so this lands at `prisma/dev.db`. Don't prefix it with `prisma/` or Prisma will nest it at `prisma/prisma/dev.db`. |
| `AUTH_SECRET` | yes | Auth.js session signing secret — generate with `openssl rand -base64 32` for production |
| `NEXTAUTH_URL` | yes | The app's base URL |
| `ANTHROPIC_API_KEY` | no | Enables the AI cover-note generator and the portfolio assistant chat. The app runs fully without it — those two features just show a clear disabled state until it's set, and also require a super admin to leave "Full AI Suite" on under Settings → Platform. |

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

## Deployment notes

- SQLite is fine for the current 1–10 user scale. To move to PostgreSQL later: change `provider` in
  `prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at the Postgres instance, and run
  `npx prisma db push` — no application code changes needed.
- Back up `prisma/dev.db` regularly; it's the entire system of record.
