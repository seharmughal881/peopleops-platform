# HR System

Modular HR / HRIS platform built on Next.js 16 (App Router), React 19, Prisma + PostgreSQL, Redis + BullMQ for jobs, and Tailwind v4.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and module breakdown, and [docs/PROGRESS.md](docs/PROGRESS.md) for what's implemented vs. stubbed.

## Quick start

```bash
npm install
npm run services:up          # start postgres + redis in Docker
npm run setup                # prisma db push + generate + seed
npm run dev                  # http://localhost:3000
# in a separate terminal:
npm run worker               # BullMQ worker (background jobs)
```

### Seeded credentials

| Role        | Email                  | Password      |
|-------------|------------------------|---------------|
| Super admin | admin@example.com      | admin123      |
| Employee    | employee@example.com   | employee123   |

## Full Docker stack (alternative — runs everything in containers)

```bash
docker compose --profile full up --build
```

This brings up `postgres`, `redis`, `app` (Next), and `worker` (BullMQ).

## Scripts

| Script                | What it does                                    |
|-----------------------|-------------------------------------------------|
| `npm run dev`         | Next.js dev server                              |
| `npm run build`       | Production build                                |
| `npm run start`       | Run the production build                        |
| `npm run worker`      | Run the BullMQ worker (separate process)        |
| `npm run typecheck`   | `tsc --noEmit`                                  |
| `npm run services:up` | `docker compose up -d postgres redis`           |
| `npm run services:down` | Stop Docker services                          |
| `npm run db:push`     | Apply Prisma schema                             |
| `npm run db:generate` | Regenerate Prisma client                        |
| `npm run db:seed`     | Seed roles, sample users, leave policies        |
| `npm run db:reset`    | Wipe + reseed                                   |
| `npm run setup`       | push + generate + seed (first-run helper)       |

## Health check

```
GET /api/health → { ok, checks: { db, redis } }
```

Returns 200 when both Postgres and Redis are reachable, 503 otherwise. Use this for liveness probes.

## Architecture at a glance

- **Routes** — `app/(auth)`, `app/(employee)`, `app/(manager)`, `app/(admin)` route groups
- **Business logic** — `lib/modules/<name>/` (auth, employee, attendance, leave, payroll, workflows, audit, notifications, reporting, compliance, …)
- **Database** — PostgreSQL via Prisma (`prisma/schema.prisma`)
- **Cache / queues** — Redis (used by BullMQ for jobs and delayed/repeating reminders)
- **Background jobs** — BullMQ worker in `workers/index.ts`, job definitions in `lib/jobs/`
- **Route gating** — `proxy.ts` (Next 16's replacement for `middleware.ts`)
- **API style** — Server Actions for own-UI mutations; Route Handlers (e.g. `/api/health`) for non-browser callers

## Background jobs

Defined in [lib/jobs/queue.ts](lib/jobs/queue.ts) and handled in [lib/jobs/handlers.ts](lib/jobs/handlers.ts):

| Job kind | Trigger | What it does |
|---|---|---|
| `notification.email` | Event-driven — fires when `notify({ channel: 'email' })` is called | Sends via SMTP (if `SMTP_HOST` set), otherwise logs |
| `notification.slack` | Event-driven — same, channel `'slack'` | Posts to `SLACK_WEBHOOK_URL`, otherwise logs |
| `documents.expiration-check` | Scheduled — daily at 07:00 | Notifies HR admins of documents expiring within 30 days |
| `leave.approval-reminder` | Delayed — queued with 24h delay when a leave request is submitted | Reminds the approver if still pending |

To register more repeatable jobs, add to `REPEATABLES` in [lib/jobs/scheduler.ts](lib/jobs/scheduler.ts).

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and PR:
- Spins up Postgres 16 + Redis 7 services
- `npm ci` → `prisma generate` → `prisma db push` → `db:seed`
- `typecheck` + `build`

## File storage

Documents and other files use a swappable storage adapter at [lib/storage/](lib/storage/).

- **Dev default**: `LocalStorage` writes to `./uploads/` (gitignored).
- **Production**: set `AWS_S3_BUCKET` and `AWS_REGION` env vars — `S3Storage` is auto-selected, no code change.
- Files are served via `/api/files/[...key]` which checks: requester owns the document OR has `employee:read` permission.

## Notes

- This repo uses Next.js 16. Many APIs differ from older versions — `cookies()` is async, `middleware.ts` is now `proxy.ts`, etc. See `node_modules/next/dist/docs/` for the bundled, version-accurate documentation. The project's `AGENTS.md` requires consulting those docs before writing Next-specific code.
# peopleops-platform
