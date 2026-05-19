# HR System — Architecture & Plan

> Date: 2026-05-18
> Status: Phase 0 — planning. No code yet.

This document captures the agreed shape of the HR platform before we write code. It is the single source of truth for module boundaries, stack choices, and what ships in the MVP.

---

## 1. What we are building

A modular HR / HRIS platform (BambooHR / Zoho People / Keka class). All-in-one but built in **phases**, not all at once. The product is internal-facing to a company's employees, managers, HR, and finance teams.

### MVP (Phase 1) — ship first
1. **Auth + RBAC** — login, sessions, role-based access
2. **Employee Management** — profiles, documents, employment history
3. **Attendance** — clock in/out, timesheets, basic shifts
4. **Leave Management** — requests, approvals, balances, holidays
5. **Payroll (basics)** — payslips, salary records (no full payroll engine yet)
6. **Employee Self-Service** — update profile, view payslip, apply leave
7. **Reports** — basic headcount, attendance, leave

### Phase 2 — expand after MVP
Recruitment, Performance management, AI features, Mobile apps, Advanced analytics, Performance reviews / OKRs, 360 feedback.

### Later
Assets, expenses, comms, deep integrations.

---

## 2. Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16.2.6** (App Router) | Already installed. One codebase for UI + server logic. |
| UI | **React 19.2.4 + Tailwind v4** | Already installed. Server Components by default. |
| Backend | **Next.js Server Actions + Route Handlers** | See [§4 API strategy](#4-api-strategy). Avoids running a separate Nest service for the MVP. |
| Database | **PostgreSQL** | Relational HR data (employees, payroll, audit) needs joins, transactions, and integrity guarantees. |
| ORM | **Prisma** | Mature migrations, type-safe queries, supports the multi-file schema split we'll need as modules grow. |
| Auth | **Auth.js (next-auth v5)** + credentials/SSO providers | Sessions via cookies, works cleanly with App Router + Server Actions. |
| Background jobs | **BullMQ on Redis** | Approvals reminders, payslip generation, report exports. |
| Cache / queues | **Redis** | Sessions, rate limits, job queue. |
| File storage | **S3-compatible** | Documents, payslips, receipts. |
| Email | **Resend or SES** | Transactional + notifications. |
| Observability | **OpenTelemetry** via `instrumentation.ts` | Next 16 has first-class support. |
| Deployment | **Docker + a single Postgres + Redis** | Add Kubernetes only if/when needed. |

### Why **not** a separate NestJS backend
For an internal HR app, the biggest wins of a separate backend (independent scaling, language separation, multi-frontend reuse) don't apply yet. Server Actions give us co-located, type-safe mutations without the network hop. If/when we add a mobile app we'll add Route Handlers for it inside the same repo — no need for a separate service to start.

### Why **not** Drizzle / raw SQL
Drizzle is great for edge runtimes. We're running on a normal Node server. Prisma's relational queries, migration tooling, and ecosystem maturity matter more here than Drizzle's smaller bundle.

---

## 3. Architecture — Modular Monolith

One Next.js application. Modules are folders, not services. Each module owns its routes, server logic, and database tables. Modules communicate only through clearly defined function calls in their public surface — no module reaches into another module's internals.

### Folder structure

```
my-app/
├─ app/                              # Routes only — thin layer
│  ├─ (auth)/                        # Public auth screens
│  │  ├─ login/page.tsx
│  │  └─ forgot-password/page.tsx
│  ├─ (employee)/                    # Employee self-service portal
│  │  ├─ layout.tsx                  # Employee shell (nav, header)
│  │  ├─ dashboard/page.tsx
│  │  ├─ profile/page.tsx
│  │  ├─ leave/page.tsx
│  │  ├─ attendance/page.tsx
│  │  └─ payslips/page.tsx
│  ├─ (manager)/                     # Manager portal
│  │  ├─ layout.tsx
│  │  ├─ team/page.tsx
│  │  ├─ approvals/page.tsx
│  │  └─ reports/page.tsx
│  ├─ (admin)/                       # HR / Super Admin portal
│  │  ├─ layout.tsx
│  │  ├─ employees/page.tsx
│  │  ├─ leave-policies/page.tsx
│  │  ├─ payroll/page.tsx
│  │  ├─ roles/page.tsx
│  │  └─ audit-logs/page.tsx
│  ├─ api/                           # Route Handlers — external clients only
│  │  ├─ mobile/v1/...               # Mobile app
│  │  ├─ webhooks/slack/route.ts     # Slack integration
│  │  └─ integrations/.../route.ts
│  ├─ layout.tsx                     # Root layout
│  └─ page.tsx                       # Landing → redirects based on role
│
├─ lib/
│  ├─ modules/                       # ⭐ All business logic lives here
│  │  ├─ auth/
│  │  │  ├─ actions.ts               # Server Actions (login, logout, MFA)
│  │  │  ├─ rbac.ts                  # Permission helpers
│  │  │  ├─ sessions.ts
│  │  │  └─ index.ts                 # Public surface
│  │  ├─ employee/
│  │  │  ├─ actions.ts               # createEmployee, updateProfile, ...
│  │  │  ├─ queries.ts               # getEmployee, listEmployees, ...
│  │  │  ├─ schema.ts                # Zod schemas
│  │  │  └─ index.ts
│  │  ├─ attendance/
│  │  ├─ leave/
│  │  ├─ payroll/
│  │  ├─ workflows/                  # Shared approval engine
│  │  ├─ notifications/              # Email + Slack + in-app
│  │  ├─ audit/                      # Audit log writer (used by all modules)
│  │  └─ reporting/
│  ├─ db/
│  │  └─ client.ts                   # Prisma client singleton
│  ├─ ui/                            # Shared UI primitives (buttons, forms)
│  └─ utils/
│
├─ prisma/
│  ├─ schema.prisma                  # Root — imports per-module schemas
│  └─ modules/
│     ├─ auth.prisma
│     ├─ employee.prisma
│     ├─ attendance.prisma
│     ├─ leave.prisma
│     └─ payroll.prisma
│
├─ proxy.ts                          # Next 16 — auth gating (was middleware.ts)
├─ instrumentation.ts                # OpenTelemetry
└─ package.json
```

### Module rules (enforced by code review)

1. **No cross-module DB access.** Module `leave` does not read from `employee` tables directly — it calls `employee.queries.getEmployee(id)`.
2. **Each module has an `index.ts`** that re-exports its public surface. Imports from outside must use this file.
3. **Server Actions live in `lib/modules/<name>/actions.ts`**, not inline in pages. Pages import and call them.
4. **Zod schemas live next to the action** that uses them.
5. **Every mutation writes to the audit log** via `lib/modules/audit/`.

This gives us microservice-level boundaries without microservice-level operational cost. If a module ever needs to split out, its `index.ts` becomes the API contract.

---

## 4. API Strategy

Three ways to call server code. Use the right one:

| Caller | Mechanism | Example |
|--------|-----------|---------|
| The app's own UI | **Server Actions** (`'use server'`) | Submitting a leave request from the portal |
| The app's own UI reading data | **Server Components** querying directly | Dashboard fetches today's attendance |
| External clients (mobile app, Slack, integrations) | **Route Handlers** (`app/api/.../route.ts`) | Mobile clock-in, Slack slash command |

**Rule:** if a browser inside this app is the caller, prefer Server Actions. If a non-browser caller hits us, it's a Route Handler. We don't build REST endpoints "just in case."

### Auth in actions
Every Server Action and Route Handler **must** start with an auth check. Next 16's docs explicitly warn: Server Functions are reachable via direct POST — never trust the UI to gate them.

```ts
// lib/modules/leave/actions.ts
'use server'
import { requireUser } from '@/lib/modules/auth'
import { can } from '@/lib/modules/auth/rbac'

export async function submitLeaveRequest(formData: FormData) {
  const user = await requireUser()
  if (!can(user, 'leave:submit')) throw new Error('Forbidden')
  // ...
}
```

---

## 5. Data Model — MVP entities

Sketch only. Full schema lands when we start coding.

```
User           id, email, hashedPassword, mfaEnabled, status
Role           id, name, permissions[]
UserRole       userId, roleId, scope (org-wide vs team-scoped)

Employee       id, userId, employeeCode, firstName, lastName, dob,
               joinDate, departmentId, managerId, status
EmployeeProfile  employeeId, phone, address, emergencyContacts (json)
EmploymentHistory  employeeId, title, departmentId, startDate, endDate
SalaryHistory  employeeId, amount, currency, effectiveDate, reason
Document       employeeId, type, s3Key, expiresAt
Department     id, name, parentId            -- org chart via self-reference

ShiftPattern   id, name, startTime, endTime, breakMinutes
EmployeeShift  employeeId, shiftPatternId, effectiveFrom
AttendanceLog  id, employeeId, clockIn, clockOut, source (web/mobile/biometric),
               geoLat, geoLng, status (regular/overtime/missed)

LeavePolicy    id, name, leaveType, accrualRule, carryForwardRule
LeaveBalance   employeeId, leaveType, balance, year
LeaveRequest   id, employeeId, leaveType, startDate, endDate, status,
               approvalChainId, reason
Holiday        id, date, name, country

PayslipRun     id, periodStart, periodEnd, status
Payslip        id, payslipRunId, employeeId, grossPay, deductions (json),
               netPay, s3Key

Approval       id, entityType (LeaveRequest, Expense, ...), entityId,
               approverId, status, level, comments, decidedAt
ApprovalChain  id, definition (json) — multi-level approval rules

AuditLog       id, userId, action, entityType, entityId, before (json),
               after (json), ip, userAgent, createdAt
Notification   id, userId, channel (email/slack/inApp), payload, readAt
```

Tenant column (`organizationId`) lives on every business entity if/when we decide to go multi-tenant. **MVP assumption: single tenant** — can be added later without much pain because of Prisma migrations.

---

## 6. Auth & RBAC

- **Auth.js v5** with credentials + Google SSO + Microsoft SSO. Magic link for password resets.
- **MFA**: TOTP via `otpauth`. Mandatory for Admin/Finance roles.
- **Sessions**: HTTP-only cookies, 8-hour idle, 30-day absolute, rotation on privilege change.
- **RBAC model**: roles → permissions, scoped (org-wide vs team).
- **Default roles**: Super Admin, HR Admin, Recruiter, Manager, Employee, Finance, IT/Admin Ops.
- **Permission checks** happen in three places, in order: `proxy.ts` (coarse route gating) → page-level `requireUser()` → Server Action / Route Handler `can(user, 'perm')` (authoritative).
- **Audit**: every mutation writes to `AuditLog` via a `withAudit()` wrapper.

---

## 7. Workflows & Notifications

A small, generic engine reused by leave, expenses, hiring requests, etc.

- **ApprovalChain** is a JSON definition: `[{level: 1, approver: 'managerOf(employee)'}, {level: 2, approver: 'role:HR_Admin'}]`.
- **Workflows module** evaluates the chain, creates `Approval` rows, sends notifications, and advances state.
- **Reminders**: BullMQ schedules a job per pending approval; on tick it pings via Notifications.
- **Notifications module**: one entry point (`notify(userId, template, payload)`), fans out to email/Slack/in-app per user preference.

---

## 8. Roadmap

| Sprint | Deliverable |
|--------|-------------|
| 0 | This doc reviewed + tools/CI in place (Prisma, Auth.js, lint, CI) |
| 1 | Auth + RBAC + first admin user + employee directory (read-only) |
| 2 | Employee CRUD + profile self-service + documents (S3) |
| 3 | Attendance (web clock in/out + timesheets) |
| 4 | Leave (requests + approvals + balances) |
| 5 | Workflows engine extracted; Notifications (email + in-app) |
| 6 | Payroll basics (payslip upload, view); Reports (headcount, attendance, leave) |
| 7 | Hardening: audit log UI, MFA enforcement, GDPR export/delete |
| → | **MVP done.** Then Phase 2. |

---

## 9. Open questions (decide before sprint 1)

- **Multi-tenant or single-tenant?** Pick now — retrofitting tenancy is painful.
- **SSO providers?** Google + Microsoft cover most, but customer requirements matter.
- **Localization / multi-currency / multi-country payroll?** Affects data model.
- **Biometric attendance hardware** — which devices? Affects integration design.
- **Slack first or also Teams?** Decide before notifications module is built.

---

## 10. Notes on Next.js 16 specifics

Captured because they affect implementation:

- `middleware.ts` → renamed to **`proxy.ts`** in Next 16.
- `cookies()` is **async** — always `await cookies()`.
- Server Actions are reachable via **direct POST** — every action needs auth/authz inside it. The UI is not a security boundary.
- `'use cache'` + `cacheLife()` are first-class. Use for expensive read paths (e.g., org chart, leave policies).
- `revalidateTag` / `updateTag` for cache invalidation after mutations.
- `RouteContext<'/users/[id]'>` for typed params in Route Handlers.
- Next 16 docs mention `unstable_instant` for fast client navigations — flagged but not adopting until verified in the API reference.
