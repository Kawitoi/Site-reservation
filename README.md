# TableFlow

TableFlow is a multi-tenant SaaS for restaurant reservation management: floor
plan editor, manual and public online booking, a race-condition-safe
availability engine, Stripe subscription billing, and role-based access
control (owner / manager / staff) with strict per-restaurant data isolation.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript (strict), React 19
- PostgreSQL + [Prisma](https://www.prisma.io) (driver-adapter architecture, `@prisma/adapter-pg`)
- [Better Auth](https://www.better-auth.com) (email/password + `organization` plugin for multi-tenancy)
- [Stripe](https://stripe.com) (Checkout, customer portal, webhooks)
- Nodemailer (SMTP transactional email)
- Vitest (unit/integration) + Playwright (E2E)
- Tailwind CSS v4 + Radix UI primitives

## Prerequisites

- Node.js 22+
- PostgreSQL 16+ with the `btree_gist` extension available (bundled with the
  standard `contrib` module — the default on most distro packages and the
  official Docker image; the setup migration creates it automatically, it
  just needs a superuser-privileged connection the first time).
- npm

## Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` (see [Environment variables](#environment-variables) below).
At minimum for local development you need `DATABASE_URL`,
`BETTER_AUTH_SECRET`, and `APP_URL`.

Create the database, apply migrations, and seed demo data:

```bash
createdb tableflow_dev   # or: psql -c "CREATE DATABASE tableflow_dev;"
npm run db:migrate       # applies all migrations (prisma migrate deploy)
npm run db:seed          # demo org + restaurant + tables + reservations
npm run dev
```

Open http://localhost:3000. The seed script creates a demo account:

- Email: `demo@tableflow.local`
- Password: `demo12345`

### Generating the Prisma client

The Prisma client is generated into `lib/generated/prisma` (gitignored) and
is required before typechecking, building, or running the app. It is
regenerated automatically whenever `schema.prisma` changes and you run
`npm run db:generate`, or explicitly with:

```bash
npx prisma generate
```

### Creating new migrations

```bash
npx prisma migrate dev --create-only   # generate a migration diff, don't apply it
```

Review the generated SQL before applying — Prisma cannot model the
double-booking exclusion constraint or its generated `duration` column
(declared as `Unsupported("tsrange")` in the schema precisely so Prisma
never proposes to drop them), so always inspect a fresh diff against the
`reservation` table by hand before running `prisma migrate deploy`.

## Environment variables

See `.env.example` for the full list. Notes:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | yes | Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` / `APP_URL` | yes | Public base URL (e.g. `https://app.example.com` in production, `http://localhost:3000` in dev). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | no | When unset, outgoing emails are logged instead of sent (`email.not_configured` log entries) — fine for local dev, **required in production** so account verification, password reset, invitation and booking-confirmation emails actually deliver. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` | no | When unset, billing/plan-limit enforcement is fully disabled (`getEffectivePlan` returns `null`) — useful for local dev and CI. Set all four to enable subscriptions in production. |

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build (`output: "standalone"`). |
| `npm start` | Run the standalone production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Unit + integration tests (Vitest, against `DATABASE_URL`). |
| `npm run test:watch` | Vitest in watch mode. |
| `npm run test:e2e` | Playwright E2E suite (spins up `npm run dev` itself). |
| `npm run db:migrate` | Apply pending migrations (`prisma migrate deploy`, non-interactive). |
| `npm run db:migrate:dev` | Generate + apply a migration interactively (local dev only). |
| `npm run db:seed` | Seed demo data. |
| `npm run db:generate` | Regenerate the Prisma client. |

## Tests

Unit and integration tests run against a **real** Postgres database — never
your dev database. `tests/setup.ts` refuses to run unless `DATABASE_URL`
contains `tableflow_test`, loaded from `.env.test`:

```bash
createdb tableflow_test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tableflow_test?schema=public" npx prisma migrate deploy
echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tableflow_test?schema=public"' > .env.test
npm test
```

E2E tests (Playwright) drive a real browser against `npm run dev` backed by
the same test database, and clean up their own fixture data (organizations
prefixed `E2E ...`) in an `afterEach` hook:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tableflow_test?schema=public" npm run test:e2e
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, the unit/integration
suite, the E2E suite, and a production build against a disposable Postgres
service container on every push and pull request.

## Multi-tenancy & security

- Every server action and query derives the organization/location a user may
  touch from their authenticated session (`server/services/authorization.ts`)
  — client-supplied IDs are never trusted for authorization decisions.
- Double booking is prevented at the database level via a Postgres `EXCLUDE`
  constraint on a generated `tsrange` column (see the migration comments in
  `prisma/migrations/20260831121500_reservation_no_overlap_constraint`),
  not just an application-level availability check — this closes the race
  window between two concurrent booking requests.
- Passwords are hashed by Better Auth; secrets, tokens and password hashes
  are never written to logs (`lib/logger.ts`).
- RGPD: customers can be anonymized (scrubs personal fields on the customer
  record and on their historical reservations) or have their data exported,
  from the client detail page in the app (`server/services/customer.ts`).

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for a full VPS deployment
guide (systemd + Nginx) and [`docs/backups.md`](docs/backups.md) for the
backup/restore strategy.
