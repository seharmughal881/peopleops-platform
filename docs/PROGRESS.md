# Progress

Last updated: 2026-05-19 (Scaffolded items finished — break tracking, geolocation, carry-forward leave job, GDPR export/delete)

Honest accounting of what's actually implemented, scaffolded, or stubbed — mapped to the original feature requirements.

## ✅ Working end-to-end (verified)

### Features
| Feature | Where |
|---|---|
| Login + session (JWT cookie via `jose`) | [lib/modules/auth/](../lib/modules/auth) · [app/(auth)/login/](../app/(auth)/login) |
| Logout | `logoutAction` in [lib/modules/auth/actions.ts](../lib/modules/auth/actions.ts) |
| Route gating + role-based redirect | [proxy.ts](../proxy.ts) · `requireUser` / `requirePermission` in DAL |
| RBAC (roles + permission strings, wildcard `*`) | [lib/modules/auth/rbac.ts](../lib/modules/auth/rbac.ts) |
| Audit log on every mutation | [lib/modules/audit/](../lib/modules/audit) · `/admin/audit-logs` |
| Employee CRUD (admin) + directory + org chart | [lib/modules/employee/](../lib/modules/employee) · [app/(admin)/admin/employees/](../app/(admin)/admin/employees) |
| **Employee detail page (admin)** | [app/(admin)/admin/employees/[id]/](../app/(admin)/admin/employees/[id]) — overview, docs, salary, employment history |
| Employee self-service profile edit | [app/(employee)/profile/](../app/(employee)/profile) |
| **Emergency contacts (employee edits own)** | [app/(employee)/profile/EmergencyContactsForm.tsx](../app/(employee)/profile/EmergencyContactsForm.tsx) |
| **Skills & certifications (employee edits own)** | [app/(employee)/profile/SkillsManager.tsx](../app/(employee)/profile/SkillsManager.tsx) |
| **Salary history (admin add)** | [lib/modules/employee/salary.ts](../lib/modules/employee/salary.ts) · employee detail page |
| **Documents (upload, list, delete, auth-gated download)** | [lib/modules/employee/documents.ts](../lib/modules/employee/documents.ts) · self-service at `/documents` · admin per-employee · [app/api/files/[...key]/](../app/api/files/[...key]) |
| Attendance clock in / clock out + 30-day log + overtime detect | [lib/modules/attendance/](../lib/modules/attendance) |
| **Shift patterns + assignment (admin)** | [lib/modules/attendance/shifts.ts](../lib/modules/attendance/shifts.ts) · `/admin/shifts` |
| Manager team attendance view | [app/(manager)/manager/attendance/](../app/(manager)/manager/attendance) |
| Leave: requests, multi-level approvals, balances | [lib/modules/leave/](../lib/modules/leave) |
| **Holiday calendar admin** | [lib/modules/leave/holidays.ts](../lib/modules/leave/holidays.ts) · `/admin/holidays` |
| Manager approval dashboard (leave + expenses combined) | [app/(manager)/manager/approvals/](../app/(manager)/manager/approvals) |
| **Expenses & Reimbursements** (draft → submit → manager approve → finance reimburse) | [lib/modules/expenses/](../lib/modules/expenses) · `/expenses` · `/admin/expenses` · receipts via storage abstraction · two-level approval (manager always, finance if amount ≥ 1000) |
| **Performance Management** — Goals/OKRs (employee + manager) | [lib/modules/performance/](../lib/modules/performance) · `/performance` |
| **Performance Management** — Review cycles + reviews (self/manager/peer/upward) | `/admin/performance` opens cycles · `/manager/performance` initiates reviews · `/performance/review/[id]` form |
| **Performance Management** — PIPs (open + checkpoints + close passed/failed) | Manager initiates; subject sees banner on `/performance` |
| **Performance Management** — Promotion recommendations | Manager recommends from `/manager/performance` (suggested candidates auto-surfaced for direct reports with avg review ≥ 4.5 and no active PIP). HR decides at `/admin/performance`. Approval auto-applies new title + adds a SalaryHistory entry. Subject sees a banner on `/performance` while pending. |
| **Recruitment** — Job postings (draft → open → filled/closed) | [lib/modules/recruitment/](../lib/modules/recruitment) · `/admin/recruitment` |
| **Recruitment** — Candidate pipeline (applied → screening → interview → offer → hired/rejected) | Per-job detail page with add-candidate (resume upload to storage) and per-candidate stage buttons |
| **Recruitment** — Interviews (schedule + log feedback with rating + recommendation) | Interviewer gets notification; submitting feedback auto-marks completed |
| **Recruitment** — Offers (draft → sent → accepted/declined/withdrawn) | Auto-advances candidate to hired/rejected on offer decision |
| **Recruitment** — Funnel KPIs | Overview page shows pipeline counts and offer stats |
| **Asset Management** — Hardware assets (laptop/desktop/phone/tablet/monitor/accessory) | [lib/modules/assets/](../lib/modules/assets) · `/admin/assets` with status (available/assigned/maintenance/retired) + assignment history |
| **Asset Management** — Software licenses with seat tracking | `/admin/licenses` with assign/revoke + renewal-date warnings |
| **Asset Management** — Employee self-service "My equipment" | `/my-assets` shows devices + licenses assigned to current user |
| Payslip runs + employee payslip view | [lib/modules/payroll/](../lib/modules/payroll) |
| **Payroll reports** | `/admin/payroll` now has totals (gross/net/runs), monthly trend bars, per-department breakdown. `/admin/payroll/[id]` shows per-run detail with deductions broken out per line. `/admin/payroll/[id]/export.csv` streams a GL-style CSV (one row per gross/deduction/net line) for accounting hand-off. |
| Reporting: headcount, attendance, leave, attrition | [lib/modules/reporting/](../lib/modules/reporting) · `/admin/reports` |
| Document expiration alerts | Daily background job notifies HR |
| In-app notifications | [lib/modules/notifications/](../lib/modules/notifications) |
| **Company announcements (admin create + employee dashboard view)** | [lib/modules/comms/](../lib/modules/comms) · `/admin/announcements` |
| **Employee recognition** (4 categories, public feed + private option) | `/recognition` — give + feed, recipient gets a notification |
| **Company events** (RSVP going/maybe/notGoing, capacity enforcement) | `/events` for employees · `/admin/events` and `/admin/events/[id]` for HR with attendee lists |
| **Surveys & polls** (rating 1-5 / text / multiple-choice, anonymous mode) | `/surveys` + `/surveys/[id]` for taking · `/admin/surveys` + `/admin/surveys/[id]` for results with aggregated charts |
| **Benefits enrollment** (5 plan types, 3 coverage levels, dependents, enrollment windows) | [lib/modules/benefits/](../lib/modules/benefits) · `/admin/benefits` (plan CRUD + enrollment overview) · `/benefits` (employee browse + enroll + waive + dependents + change coverage + terminate) · `benefit:*` permission on `hr_admin` · 4 sample plans seeded |
| **Diversity analytics** (self-disclosed, aggregated, k-anonymity-protected) | [lib/modules/diversity/](../lib/modules/diversity) · gender / pronouns / race-ethnicity / veteran / disability fields on a separate `EmployeeDiversity` table for stricter access · employee self-disclosure form on `/profile` · admin breakdown on `/admin/reports` that suppresses buckets with fewer than 5 people |
| **Finance / GL export** (CSV for QuickBooks / Xero / generic GL) | [lib/modules/finance/](../lib/modules/finance) · `/admin/finance` with date-range picker and downloads · `/api/admin/finance/{expenses,payroll}.csv` route handlers · per-category GL mapping (override via `FINANCE_GL_MAP` env JSON) · every export audit-logged · gated by `expense:*` and `payroll:*` from the existing `finance` role |
| **SSO — Google OIDC** (real openid-client flow, PKCE, state, nonce) | [lib/modules/auth/oidc.ts](../lib/modules/auth/oidc.ts) · `/api/auth/oidc/google/{start,callback}` · "Sign in with Google" button on `/login` (only rendered when `GOOGLE_OAUTH_CLIENT_ID`+`GOOGLE_OAUTH_CLIENT_SECRET` set) · `OAuthAccount` table links provider sub → user · auto-links on first sign-in when email matches an existing active user AND `email_verified` is true · refuses unverified emails and unknown emails (admin must provision the user first) · proxy.ts allows `/api/auth/oidc/*` through |

### Infra & Background Jobs
| Item | Status |
|---|---|
| PostgreSQL | ✅ Wired (Docker compose service, Prisma provider) |
| Redis | ✅ Wired (Docker compose service) |
| **File storage abstraction** | ✅ [lib/storage/](../lib/storage) with `LocalStorage` (default) and `S3Storage` (auto-selected when `AWS_S3_BUCKET` + `AWS_REGION` set) |
| **Auth-gated file serving** | ✅ `/api/files/[...key]` — verifies ownership or `employee:read` perm |
| Background jobs (BullMQ) | ✅ Worker process + 4 job kinds |
| Event-driven notifications | ✅ Email + Slack channels enqueue to BullMQ |
| Health check (`/api/health`) | ✅ Tests DB + Redis, returns 200/503 |
| Docker multi-stage build | ✅ `Dockerfile` with `runner` + `worker` targets |
| Docker compose | ✅ `docker-compose.yml` with `--profile full` |
| GitHub Actions CI | ✅ `.github/workflows/ci.yml` |

### Background jobs
| Kind | Trigger | Verified |
|---|---|---|
| `notification.email` | `notify({ channel: 'email' })` | ✅ Picked up + processed (logs if no SMTP) |
| `notification.slack` | `notify({ channel: 'slack' })` | ✅ Picked up + processed (logs if no webhook) |
| `documents.expiration-check` | Daily 07:00 cron | ✅ Registered with BullMQ repeatable |
| `leave.approval-reminder` | 24h delayed after leave request | ✅ Enqueued from workflows |

## 🟡 Scaffolded — minor gaps

| Feature | What exists | What's still missing |
|---|---|---|
| ~~Geolocation attendance~~ | ✅ Done — clock-in client form captures `navigator.geolocation` (4s timeout, fails-open) and submits lat/lng with the action; stored on `AttendanceLog.geoLat/geoLng` |
| MFA / SSO | ✅ TOTP MFA shipped (otpauth + qrcode + `/api/auth/mfa/{enroll,verify,disable}` + UI at `/profile/security` + login challenge for cookie & mobile). ✅ Google OIDC SSO shipped (PKCE flow via openid-client). Microsoft / Okta / SAML providers still NOT wired. |
| Rate limiting | ✅ Login rate-limited (Redis-backed, 8 attempts / 10 min, per IP **and** per email; fails-open on Redis outage) |
| ~~GDPR export/delete~~ | ✅ Done — `lib/modules/compliance/gdpr.ts` builds a portable JSON archive (Article 20) and hard-deletes employee + cascades with audit-log anonymisation (Article 17). Admin UI at `/admin/employees/[id]` via GdprPanel; export route at `/api/admin/gdpr/export/[employeeId]`; type-DELETE-to-confirm safeguard. |
| ~~Break tracking~~ | ✅ Done — new `BreakEvent` model linked to `AttendanceLog`; `startBreak`/`endBreak` server actions; live elapsed-time button on `/attendance`; net hours on clock-out subtract break time; open breaks auto-close at clock-out. |
| ~~Carry-forward leave~~ | ✅ Done — `leave.year-end-rollover` BullMQ repeatable cron registered for `0 1 1 1 *` (Jan 1 @ 01:00); for each employee × policy carries `min(prevBalance, carryForwardMax)` plus the new year's `annualEntitlement`. Handler in `lib/jobs/handlers.ts`, schedule in `lib/jobs/scheduler.ts`. |
| S3 in prod | `S3Storage` class wired, auto-selects when env vars set | Real AWS creds + bucket for actual deployment |

## 🔴 Phase 2 — folder + empty `index.ts` only

| Module | What's missing |
|---|---|
| ~~**Performance**~~ | ✅ Goals, reviews, PIPs done. 360 feedback rounds and promotion-recommendation engine not yet built. |
| ~~**Recruitment**~~ | ✅ Done. Job postings, candidate pipeline, interviews, offers, funnel analytics. Hiring-request approval flow (manager submits → HR approves) NOT built — recruiters/HR create job postings directly. |
| ~~**Asset management**~~ | ✅ Done — hardware assets with assignment history, software licenses with seat tracking + renewal warnings, employee self-service "My equipment". |
| ~~**Benefits enrollment**~~ | ✅ Done — plan CRUD, enrollment windows, 3 coverage levels, dependents, waivers, terminations. |
| ~~**Internal comms beyond announcements**~~ | ✅ Done — recognition feed, events with RSVP + capacity, surveys with anonymous mode + 3 question types (rating/text/choice) + aggregated results. |
| **Biometric integrations** | Hardware vendor not chosen |
| ~~**Mobile app**~~ | ✅ Route Handlers shipped at `/api/mobile/v1/*` — bearer-token auth (`POST /auth/login`, `POST /auth/logout`, `GET /me`), attendance (`GET /attendance`, `POST /attendance/clock-in`, `POST /attendance/clock-out`), leave (`GET /leave`, `POST /leave/submit`), notifications (`GET` + `POST` mark-read), payslips, approvals (`GET` + `POST /approvals/decide` handles both leave + expense), announcements. Proxy skips `/api/mobile` so cookies aren't required. |
| ~~**Diversity analytics**~~ | ✅ Done — separate `EmployeeDiversity` table, self-disclosed only, aggregated report with k-anonymity (threshold = 5). |

## Architectural decisions still open

1. **Multi-tenant or single-tenant?** Currently single. Retrofit is painful.
2. **SSO providers** — Google, Microsoft, Okta.
3. **Localization / multi-currency / multi-country payroll**.
4. **Biometric attendance hardware** — vendor choice.
5. **Slack vs Teams** — Slack handler exists; Teams would need its own.

## Production hardening still to do

- **Rotate `SESSION_SECRET`** — generate with `openssl rand -base64 32`.
- **Rate limit `/login`** — IP+email-based, Redis-backed.
- **Argon2 instead of bcryptjs** if you want stronger hashing.
- **Real SMTP / Slack** — fill env vars from `.env.example`. Handlers already wired.
- **`prisma migrate` proper migrations** instead of `db push`.

## How to verify it still works

```bash
npm run services:up     # postgres + redis
npm run setup           # push schema + generate + seed
npm run build           # type-check + production build
npm run start           # web server (port 3000)
npm run worker          # background worker (separate terminal)

curl http://localhost:3000/api/health
```

Log in as `admin@example.com / admin123` (full admin) or `employee@example.com / employee123` (self-service view).

Try the new flows:
- **Admin**: Employees → click a name → Upload document, Add salary entry
- **Admin**: Holidays → Add a holiday
- **Admin**: Shifts → Create pattern → Assign to employee
- **Admin**: Announcements → Publish (shows up on employee dashboards)
- **Admin**: Benefits → Create a plan / edit existing / terminate an enrollment
- **Employee**: Profile → Add emergency contacts and skills
- **Employee**: My Documents → Upload, then View (auth-gated)
- **Employee**: Benefits → Enroll in Health PPO with employee+spouse coverage, add a dependent, then change coverage level
