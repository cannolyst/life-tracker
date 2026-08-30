# Life Tracker

A merged personal tracker: points/habits, cleaning, and finance (savings +
credit card debt) in one Next.js app, backed by Postgres via Drizzle ORM.
Single shared-password login (no per-user accounts).

## Modules

- **Points** (`/points`) — daily habit tasks grouped by category, a shared
  points economy, and rewards you redeem points for.
- **Cleaning** (`/cleaning`) — recurring cleaning tasks by area, each with a
  frequency (every N days); overdue/due-today tasks are called out. Cleaning
  tasks earn points into the same economy as habits.
- **Finance** (`/finance`) — savings goals and credit card payoff tracking,
  with projections, streaks, and pace indicators.

## Getting started

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:
- `DATABASE_URL` — a Postgres connection string (this project uses Supabase's
  transaction pooler URI, port 6543).
- `APP_PASSWORD` — the shared password for signing in.
- `SESSION_SECRET` — a random secret used to sign the session cookie.

Apply the schema, then run the dev server:

```bash
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm run test
```
