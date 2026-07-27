# EMS — Employee Management System

A modern, full-stack HR management system: employees, attendance, leave, payroll,
performance, assets, announcements, reporting, company settings, and user/role
administration — with role-based access control for Super Admin, HR, Manager
and Employee roles, and a full audit trail for every action taken.

## Tech stack

**Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · shadcn/ui ·
React Hook Form · Zod · TanStack Table · Recharts

**Backend:** Next.js API Routes · Prisma ORM · MySQL · JWT auth · bcrypt

## Project status

This project is being built module by module. Current status:

- [x] **Module 1 — Foundation:** project scaffold, Tailwind/shadcn setup, full
      Prisma schema & migrations, seed data, Docker support
- [x] **Module 2 — Authentication:** login, logout, forgot/reset/change password,
      JWT access tokens + rotating refresh tokens, RBAC-ready middleware
- [x] **Module 3 — Dashboard:** app shell (sidebar, navbar, breadcrumb, Cmd+K
      search, notifications/theme/user menus), stat cards, and charts
- [x] **Module 4 — Employee module:** full profile CRUD (tabbed form across all
      sections), documents (secure upload/download), notes, auto-generated
      timeline, profile photo, search/filter/sort/pagination, Excel & PDF
      export, print
- [x] **Module 5 — Department & Designation modules:** CRUD with department
      heads, employee/designation counts, conflict-safe uniqueness handling
- [x] **Module 6 — Attendance module:** self-service check-in/out with break
      tracking, monthly calendar, team-today view, filterable report with
      Excel/CSV export, manual entry/correction for HR
- [x] **Module 7 — Leave management:** apply → manager approve/reject → HR
      final approval workflow, auto-calculated working-day counts (excludes
      weekends/holidays), balance deduction/refund, team leave calendar,
      real in-app notifications
- [x] **Module 8 — Holiday management:** Public/Company/Optional holiday CRUD
      with year and type filtering, feeding directly into the leave working-day
      calculation and attendance calendars from Modules 6–7
- [x] **Module 9 — Payroll:** salary generation with auto-suggested defaults
      (including a Loss-of-Pay leave deduction integration), PAID-record
      protection, payslip PDF, Excel export, self-service payslip history
- [x] **Module 10 — Performance:** self- and manager-authored goals, KPIs,
      and a draft → submit → acknowledge review workflow with per-criterion
      ratings and an auto-computed overall score
- [x] **Module 11 — Asset management:** inventory tracking with categories and
      statuses, assign/return workflow with a full assignment history per
      asset, and self-service "My Assets" view
- [x] **Module 12 — Announcements & notifications:** company-wide or
      department-targeted announcements with priority levels, pinning, and
      expiry; automatic in-app notification fan-out on publish; full
      paginated notification history page alongside the existing bell
- [x] **Module 13 — Reports:** a central `/reports` hub (SUPER_ADMIN/HR
      only) covering Employee Directory, Attendance, Leave, Payroll, and
      Asset Inventory — each filterable by department/date/status and
      exportable as Excel/CSV/PDF; adds the two report types the app didn't
      already have (Leave, Assets) and reuses existing scoped exports for
      the rest
- [x] **Module 14 — Settings:** SUPER_ADMIN-only `/settings` hub — Company
      Information, Working Hours, Leave Rules (full leave-type CRUD), Email
      (SMTP), and System — backed by the singleton settings tables from
      Module 1; wires previously-inert schema into real behavior
      (DB-first SMTP config, enforced maintenance mode)
- [x] **Module 15 — Final polish:** verified the Docker Compose stack builds
      and runs end-to-end (db → migrate/seed → app, not just "looks right"
      on paper); added a `SUPER_ADMIN`-only Audit Logs viewer
      (`/audit-logs`) with filtering by entity type/action/user/date range,
      since audit rows had been written since Module 1 with no screen to
      browse them; a security hardening pass (headers, CSRF/rate-limit
      posture, file-upload validation, dependency audit — see Security
      notes below); and this README pass
- [x] **Module 16 — Expense management:** employee-submitted expense claims
      with an optional receipt upload, mirroring Leave's two-stage
      manager → HR approval workflow, plus an HR-only reimbursement step and
      self-service cancellation while a claim is still pending
- [x] **Module 17 — Internal messaging:** 1:1 direct messages between any
      two employees, with text and/or a file/image attachment per message,
      and real-time delivery via Server-Sent Events (no WebSocket server or
      new deployment shape required)
- [x] **Module 18 — Projects & tasks:** a ClickUp/Trello-style tracker —
      multiple projects, each with tasks carrying a status, priority,
      dates, and one or more assignees. SUPER_ADMIN/HR/MANAGER create
      projects and assign tasks; any employee can update the status of a
      task assigned to them. Three views: List (grouped by status), Board
      (drag-and-drop Kanban), and Gantt (a custom day-grid timeline)

## Getting started (local development)

### Prerequisites

- Node.js 20+
- A MySQL 8 server (local install, or via Docker — see below)

### 1. Install dependencies

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is currently required because `@hookform/resolvers`
> lists an optional peer on `valibot` that npm's strict resolver doesn't
> skip automatically.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at least `DATABASE_URL` and `JWT_SECRET` (32+ random
characters — e.g. `openssl rand -hex 32`). Refresh tokens are opaque random
strings hashed in the database, not JWTs, so there's only one JWT secret.

### 3. Start MySQL

Either point `DATABASE_URL` at an existing MySQL server, or start just the
database via Docker:

```bash
docker compose up -d db
```

### 4. Run migrations & seed data

```bash
npm run db:migrate:deploy   # applies the committed migration
npm run db:seed             # seeds departments, roles, demo users, leave types, holidays,
                             # ~2 weeks of attendance history, and a few leave requests
```

(Use `npm run db:migrate` instead of `db:migrate:deploy` if you intend to keep
evolving the schema locally — it will prompt to create new migrations from any
schema changes.)

### 5. Run the app

```bash
npm run dev
```

Visit http://localhost:3000.

### Seeded accounts

| Role        | Email                      | Password        |
|-------------|-----------------------------|------------------|
| Super Admin | `admin@ems.local`           | `ChangeMe123!`   |
| HR          | `hr.manager@ems.local`      | `Password123!`   |
| Manager     | `eng.manager@ems.local`     | `Password123!`   |
| Employee    | `employee@ems.local`        | `Password123!`   |

**Change these credentials before deploying anywhere beyond local development.**

## Running with Docker

The full stack (MySQL + app, with migrations and seed applied automatically)
can be started with:

```bash
docker compose up --build
```

This starts:
- `db` — MySQL 8.4
- `migrate` — a one-off container that runs `prisma migrate deploy` and
  `prisma db seed`, then exits
- `app` — the Next.js production build, listening on port 3000

Verified end-to-end for Module 15 (not just read for correctness): built and ran
all three services against a real database, confirmed `migrate` applies
cleanly (`No pending migrations to apply` against an already-migrated DB,
seed re-runs idempotently), confirmed the `app` container serves the login
page and authenticates correctly, and confirmed the `storage/uploads` volume
mounts as expected.

### Troubleshooting Docker Desktop on Windows

If `docker compose up` (or any `docker pull`) fails partway through with
`failed to copy: httpReadSeeker: ... EOF`, even on small images, this is a
known WSL2 NAT networking bug, not a broken download: DNS resolves Docker's
CDN to an IPv6 address, but WSL2's default ("NAT") networking mode can't
actually route IPv6, so pulls randomly die mid-transfer. Fix:

1. Create/edit `%USERPROFILE%\.wslconfig`:
   ```ini
   [wsl2]
   networkingMode=mirrored
   ```
2. `wsl --shutdown` (restarts the WSL2 VM, including Docker Desktop's)
3. Relaunch Docker Desktop and retry

If Docker Desktop itself won't start with a "WSL not installed" dialog, run
`wsl --install` in an **administrator** PowerShell, restart Windows, then
launch Docker Desktop again.

## Scripts

| Script                     | Description                                      |
|-----------------------------|---------------------------------------------------|
| `npm run dev`               | Start the Next.js dev server                       |
| `npm run build`             | Production build                                   |
| `npm run start`             | Start the production server (after `build`)†       |
| `npm run lint`              | Run ESLint                                          |
| `npm run typecheck`         | Run `tsc --noEmit`                                  |
| `npm run db:generate`       | Regenerate the Prisma Client                        |
| `npm run db:migrate`        | Create/apply a migration in development             |
| `npm run db:migrate:deploy` | Apply committed migrations (production/CI)          |
| `npm run db:studio`         | Open Prisma Studio                                   |
| `npm run db:seed`           | Seed the database                                    |

† `next.config.ts` sets `output: "standalone"` for the Docker image. `next start`
still works locally (as used above), but prints an advisory warning that it
isn't using the trimmed standalone server — safe to ignore outside Docker.

## Project structure

```
prisma/
  schema.prisma          # full data model for every module
  migrations/            # committed SQL migrations
  seed.ts                # seed script
src/
  app/                    # Next.js App Router routes & API routes
  components/
    ui/                   # shadcn/ui primitives
    layout/               # app shell (sidebar, navbar, breadcrumbs) — added in Module 3
    shared/                # cross-feature reusable components
  config/                 # env validation, app-wide constants
  features/               # one folder per business module (feature-based structure)
    auth/ employees/ departments/ designations/ attendance/ leave/
    holidays/ payroll/ performance/ assets/ announcements/
    notifications/ reports/ settings/ dashboard/ verticals/ users/ audit/
    expenses/ messaging/ projects/
  hooks/                  # shared React hooks
  lib/                    # framework-agnostic server utilities (prisma client,
                          # jwt, password hashing, rate limiting, audit log, ...)
  types/                  # shared TypeScript types (API response envelope, etc.)
```

Each `features/<name>` folder owns its server actions/queries, validation
schemas, and feature-specific UI — kept separate from the generic `ui/`
primitives so modules can be reviewed and shipped independently.

## Authentication design notes

- **Access tokens** are short-lived JWTs (15m default), signed/verified with
  [`jose`](https://github.com/panva/jose) rather than `jsonwebtoken`. Route
  protection runs in `src/middleware.ts`, which executes on Next's **Edge**
  runtime — `jsonwebtoken` depends on Node's `crypto` module and doesn't work
  there, while `jose` is pure-JS and works in both Edge and Node.
- Because `src/lib/jwt.ts` is imported from edge middleware, it reads its
  secret via a **static** `process.env.JWT_SECRET` reference rather than
  through the aggregated `getEnv()` zod-parse helper in `src/config/env.ts`.
  Next's edge bundler only inlines env vars it can detect as a literal
  `process.env.NAME` in source; passing the whole `process.env` object to zod
  (as `getEnv()` does) defeats that static detection. `getEnv()` remains the
  right choice for anything Node-only (API routes, server components).
- **Refresh tokens** are opaque random strings (not JWTs), stored hashed
  (SHA-256) in `RefreshToken`, rotated on every use, and both access and
  refresh tokens live in `httpOnly` cookies (`ems_access_token`,
  `ems_refresh_token`) — never exposed to client-side JS. If a revoked/rotated
  refresh token is presented again (token reuse — a theft indicator), the
  entire token family for that user is revoked.
- Middleware only checks JWT signature/expiry/role claims (no DB access —
  Prisma doesn't run on the Edge runtime). `src/lib/api-client.ts` is a
  client-side `fetch` wrapper that transparently calls `/api/auth/refresh`
  and retries once on a 401, so short-lived access tokens don't require
  manual handling in every form/component.
- Password reset requests always return the same generic response whether or
  not the email is registered, to avoid account enumeration.

## Dashboard & UI shell notes

- The authenticated app shell (`src/app/(dashboard)/layout.tsx`) uses shadcn's
  `Sidebar` primitives (collapsible, cookie-persisted state) plus a top bar
  with breadcrumb, a Cmd+K command-palette search (`src/components/layout/global-search.tsx`),
  a notifications placeholder, theme toggle, and user menu.
- `src/components/layout/nav-items.ts` lists every module from the spec up
  front; modules not yet built (everything past Dashboard) render disabled
  with a "Soon" badge instead of linking to a 404 — the nav's final shape is
  visible from Module 3 onward without dead links.
- Nav items can carry a `roles` allow-list (e.g. Payroll/Settings are
  SUPER_ADMIN/HR-only); the sidebar and command palette both filter against
  the signed-in user's role from the same list.
- Dashboard queries (`src/features/dashboard/queries.ts`) compute
  birthdays/work-anniversaries and cumulative employee growth by fetching
  employees and filtering/bucketing in JS rather than a raw `MONTH()`/`DAY()`
  SQL query — simpler and DB-portable at the employee-count scale this
  targets. Revisit with a raw aggregate query if that stops being true.
- Chart categorical colors follow the validated palette from Claude Code's
  `dataviz` skill (`src/features/dashboard/lib/chart-colors.ts`): colors are
  assigned by a fixed entity→slot mapping (e.g. "Present" is always slot 0),
  never by sort rank, so a category's color doesn't shift as data changes.
  `src/app/globals.css` extends shadcn's default `--chart-1..5` (grayscale)
  to 8 validated hues used by every chart.
- Every chart and stat card has an explicit empty state — dashboard data is
  real (not mocked), so a fresh database with few employees legitimately has
  zero attendance/leave history to show.
- **Every stat card is a real link** to the page it summarizes (Employees
  filtered by status, Departments, Leave's Approvals tab, Attendance's Team
  tab, or `#celebrations` for birthdays/anniversaries) rather than a static
  tile — the Leave and Attendance pages accept a `?tab=` param specifically
  so these links land on the relevant tab, not just the module's default one.
- **The whole dashboard is scoped to a Vertical** (the business-unit concept
  introduced alongside Department in an earlier module): Super Admin/HR get
  a filter dropdown defaulting to "All Verticals" and switchable to any
  specific one via `?vertical=<id>`; every other role is silently locked to
  their own employee record's vertical with no switcher shown at all — "the
  Amarc list should only show Amarc people," not merely default to it.
  Department count/chart needed a different query shape than the rest since
  `Department` has no `verticalId` of its own — both now count through the
  `employee` relation instead of a plain `_count`.
- A few real dashboard-query bugs were caught live while building the
  vertical filter: `getAttendanceToday`'s "present" count,
  `getAttendanceStatistics`, `getPendingLeaveRequestsCount`, and
  `getLeaveStatistics` never filtered by `employee.deletedAt`, unlike every
  other dashboard query — after the original seed demo employees were
  terminated, their old attendance/leave records were still being counted
  company-wide, producing an impossible "Attendance Today: 5 / 3" (more
  present than total active employees).

## Employee module notes

- **Employee documents are never served from `/public`.** ID proof, PAN,
  Aadhaar, offer letters, etc. are written under `UPLOAD_DIR`
  (`./storage/uploads` by default — outside `public/`, gitignored) and
  streamed back through authenticated API routes
  (`/api/employees/[id]/documents/[documentId]`, `/api/employees/[id]/photo`)
  that re-check the same RBAC rules as viewing the employee record. A static
  `/public` path would bypass auth entirely for anyone who guessed or logged
  a URL.
- Access control (`src/features/employees/authorization.ts`): SUPER_ADMIN/HR
  can manage every employee; MANAGER can view (not edit) their direct
  reports (`reportingManagerId` match); an employee can always view/edit
  their own photo. This is enforced in the query/mutation layer, not just
  hidden in the UI — the API routes are the actual boundary.
- Employee create/update forms deliberately keep every Zod field as a plain
  `string`/`optional string` (see `src/features/employees/schemas.ts`) rather
  than using `z.coerce`/`z.preprocess` for numbers, dates, or enums. Both of
  those make a schema's *input* type `unknown`, which breaks `useForm<T>` +
  `zodResolver` (react-hook-form requires the schema's input type to match
  the form's field-value type). String→number/Date/enum conversion happens
  once, in the mutation layer (`toEmployeeData`), right before the Prisma
  write — not in validation.
- `EmployeeTimelineEvent` rows are created automatically (join, status
  change, department change) alongside manual `EmployeeNote`s — the two are
  intentionally separate models: timeline is a system-generated audit trail,
  notes are free-text HR commentary.
- Deleting an employee is a soft delete (`deletedAt`) that also sets
  `status: TERMINATED`; attendance, payslips, and leave history referencing
  that employee are preserved.

## Department & Designation module notes

- Management (create/edit/delete) is restricted to SUPER_ADMIN/HR; both pages
  are read-visible in the nav to those same roles only (Managers/Employees
  don't get a Departments/Designations nav entry — org-structure admin, not
  something they need direct access to).
- Deleting a department or designation is a hard delete, safe by schema
  design: `Employee.departmentId`/`designationId` and
  `Designation.departmentId` all use `onDelete: SetNull`, so affected
  employees/designations are unassigned rather than orphaned or blocked. The
  delete confirmation dialog shows the affected counts before you commit.
- **A real bug worth flagging:** Prisma's `P2002` (unique constraint)
  error shape differs by database. On Postgres, `error.meta.target` is an
  array of column names; on **MySQL it's a single string** (the index name,
  e.g. `"departments_headId_key"`). Code that assumed the array shape
  (`target.join(",")`) threw a `TypeError` on every conflict — masking a
  clean 409 behind a generic 500. Fixed in
  `src/features/departments/mutations.ts` by normalizing both shapes before
  inspecting `target`. Worth grepping for `meta?.target` / `meta.target`
  before adding similar target-inspecting error handling elsewhere.

## Attendance module notes

- Self-service (check in/out, breaks) always acts on the caller's own linked
  employee record — the API derives it from the session, it's never accepted
  as a request parameter, so one employee can't punch in on another's behalf
  via a crafted request.
- Manual create/edit/delete of attendance records is SUPER_ADMIN/HR only;
  the "Team" tab (today's status for direct reports or the whole company)
  and the filterable report are visible to SUPER_ADMIN/HR/MANAGER.
- **A real, systemic bug caught by live-testing against MySQL, not by the
  build:** `Attendance.date` is a `@db.Date` column, and Prisma's MySQL
  connector normalizes it by extracting the *UTC* calendar day from whatever
  JS `Date` it's given — it ignores the time-of-day entirely. The
  check-in/out code was computing "today" with `date-fns`'s
  `startOfDay(new Date())` / `endOfDay(new Date())`, which are **local**-time
  boundaries. On a server whose timezone isn't UTC, those two notions of
  "today" disagree: a row gets written under one UTC calendar day, but a
  same-instant read query — built the same way — doesn't actually match it,
  because the write path truncates to a UTC date while the read path
  compares the full (non-UTC-midnight) instant. Symptom: checking in
  succeeded, but the *second* check-in call didn't see the just-created row
  and tried to create another one, hitting the `(employeeId, date)` unique
  constraint and surfacing as a raw 500. Same bug class existed in the
  dashboard's "Attendance Today" stat and its 14-day statistics query.
  Fixed by adding `src/lib/date-only.ts` (`toUtcDateOnly`, `utcDayRange`,
  `utcMonthRange`, `utcDateDaysAgo`) and routing every comparison against a
  `@db.Date` column through it instead of raw `date-fns` day boundaries —
  including the `toUtcDate`/`atUtcTime` helpers that already existed
  ad-hoc in `prisma/seed.ts`, now unified into the same shared module.
  If you add new code that filters or writes a `@db.Date` field by "today",
  "this month", or "N days ago", use these helpers — not `startOfDay(new
  Date())` — or this bug comes back.

## Leave management module notes

- Workflow: employee applies (`PENDING`) → their reporting manager approves/
  rejects (`MANAGER_APPROVED`/`REJECTED`) → HR gives final sign-off
  (`APPROVED`/`REJECTED`). Leave balance is only deducted on final HR
  approval, and refunded if an already-approved request is later cancelled.
  HR can also act directly from `PENDING` (skips the manager step) — needed
  for employees with no assigned manager, and a reasonable escape hatch in
  general.
- Requested days are computed as actual **working days**
  (`src/features/leave/lib/calculate-days.ts`): weekends (per
  `WorkingHoursSettings.workingDays`) and PUBLIC/COMPANY holidays are
  excluded from the count. Half-day leave (`FIRST_HALF`/`SECOND_HALF`) is
  restricted to a single calendar day at the schema-validation level.
- New employees get this year's `LeaveBalance` rows created immediately on
  creation (`src/features/employees/mutations.ts`), rather than lazily on
  first leave application — so balances are visible on an employee's profile
  from day one, matching what `prisma/seed.ts` already did for seeded users.
- **A subtle prop-passing pitfall, not just a type error:** `LeaveRequest.days`
  is a Prisma `Decimal`. Earlier modules passed `Date` fields straight from a
  Server Component into a Client Component and that's fine — Next's RSC
  flight protocol has native `Date` support. `Decimal` is a third-party class
  instance with no such native support, so passing it straight through is a
  real risk, not just a TypeScript complaint. Fixed by converting it with
  `Number(...)` in the Server Component before handing it to
  `LeaveHistoryTable`. If you pass Prisma data with `Decimal` fields
  (salary, leave days, ratings, etc.) into a Client Component, convert it
  server-side first — don't rely on it surviving the boundary as-is.
- Relatedly: comparing `startDate !== endDate` to detect a single-day range
  breaks once those fields are typed as `Date | string`, since two distinct
  `Date` objects are never `===`/`!==`-equal by value. Fixed with
  `date-fns`'s `isSameDay`.
- Real in-app notifications (`Notification` rows) are created at every
  workflow transition — this is the first module to actually produce
  notification data, so the navbar bell (previously a static "nothing here"
  placeholder) now fetches and displays it for real, with unread counts and
  mark-as-read. Module 12 (Announcements & Notifications) later added more
  triggers and a full notifications history page.

## Payroll module notes

- Payroll is **HR/Admin-only**, even for a MANAGER viewing their own direct
  reports — unlike attendance and leave, where a manager approves on their
  team's behalf, salary data is confidential and deliberately not exposed to
  line managers by default (`src/features/payroll/authorization.ts`). Every
  employee can always see and download their own payslips.
- "Generate payslip" computes **suggested defaults**
  (`src/features/payroll/lib/calculate-defaults.ts`) — HRA at 40% of basic,
  PF at 12% of basic, ESI at 0.75% of gross below a wage ceiling, a simple
  professional-tax slab — then HR reviews and can edit every field before
  saving. These are explicitly *not* statutory truth (real percentages vary
  by jurisdiction and company policy); they're a reasonable zero-config
  starting point, not a compliance engine.
- **Cross-module integration:** if an employee has an approved Loss-of-Pay
  leave request overlapping the payroll month, the default deduction is
  computed automatically — `(basic ÷ calendar days in month) × LOP days` —
  with a remark noting why, verified live against the database (`70000 ÷ 31
  × 2 = 4516.13`). This is the clearest example so far of the earlier
  modules actually paying off: Leave (Module 7) produces the data Payroll
  consumes here.
- A payslip is unique per `(employeeId, month, year)`; generating again for
  the same period **updates** the existing draft/generated record rather
  than creating a duplicate. Once marked `PAID`, a payslip is frozen — it
  can no longer be regenerated or deleted, both enforced server-side (not
  just hidden in the UI), so a finalized payment record can't be silently
  altered.
- Payslip PDFs (`src/features/payroll/export.tsx`, via `@react-pdf/renderer`)
  pull company name/address/currency from `CompanySettings` — the same
  singleton table the eventual Settings module (14) will manage — so
  branding updates there flow through to payslips automatically.

## Expense management module notes

- The workflow deliberately **mirrors Leave's two-stage approval**
  (`src/features/expenses/`): employee submits → reporting manager
  approves/rejects → HR gives final approval/rejection. If the employee has
  no reporting manager, the claim routes straight to HR, same fallback Leave
  uses. Authorization (`authorization.ts`) is a near line-for-line port of
  `leave/authorization.ts` with "manager"/"HR" renamed to their expense
  equivalents.
- Reimbursement is a **separate, HR-only fourth step** after HR approval —
  modeled on Payroll's `markPayslipPaid`: it's a one-way transition
  (`APPROVED → REIMBURSED`) guarded server-side so a claim can't be
  reimbursed twice or reimbursed before HR has actually approved it.
- Receipts are optional, uploaded as `multipart/form-data` alongside the
  claim fields, and reuse Employee Documents' existing upload/download
  security model verbatim: `assertAllowedFile` against the same
  `ALLOWED_DOCUMENT_MIME_TYPES` allow-list, `saveUploadedFile`'s
  path-traversal-safe storage, and a `Content-Disposition: attachment`
  download route so a stored file is never rendered inline in the browser.
  No new file-handling code paths were introduced.
- An employee can **cancel their own claim** while it's `PENDING` or
  `MANAGER_APPROVED` (not once HR has approved or reimbursed it) — the same
  cancellable-window judgment call Leave makes for leave requests.
- Verified live end-to-end against the dev database across all four seeded
  roles: submit with and without a receipt, manager approve/reject, HR
  approve/reject, reimburse, receipt download, self-cancel, and the RBAC
  denials (employee blocked from manager/HR actions, manager blocked from
  reimbursing, double-reimburse and cancel-after-terminal-state both
  rejected server-side).

## Messaging module notes

- **1:1 direct messages only**, open to any authenticated account — no group
  chats, no vertical/department restriction. `Conversation`/`Message` are
  keyed by `User.id`, not `Employee.id` — reworked after launch when a pure
  admin account with no linked Employee profile (`admin@deployandtest.com`)
  turned out to be locked out entirely, since every other self-service
  feature (Leave, Attendance, Expenses, Payroll, Assets) gates on an Employee
  profile and messaging originally copied that convention without needing
  to. A participant with no Employee record falls back to the email's
  local-part for a display name and no photo, matching the sidebar's
  existing display-name convention. A `Conversation` is always stored with
  `participantAId < participantBId` (lexicographic sort of the two user
  IDs), so starting a conversation from either side finds the same existing
  row via an `upsert` instead of creating a duplicate pair.
- **Real-time delivery via Server-Sent Events, not WebSockets.** Next.js
  Route Handlers support a streaming `Response` natively, so
  `/api/messages/stream` works within the standard request model — a real
  WebSocket server would have meant bypassing Next's request handling
  entirely with a custom server, a much bigger change for this app's
  deployment shape. New-message events are published through an in-process
  `EventEmitter` (`src/features/messaging/lib/realtime.ts`); since this app
  runs as a single Docker replica, that's sufficient pub/sub without adding
  Redis — revisit if it's ever scaled to multiple instances.
- **Real bug caught in production, not local testing**: the EventEmitter's
  `globalThis` singleton assignment was originally gated to non-production
  (assumed only needed to survive dev-mode hot-reload). It's also needed in
  production — Next.js compiles each Route Handler into its own bundle, so
  the send-message route and the SSE stream route each evaluated
  `realtime.ts` independently, ending up with two EventEmitters that never
  saw each other's events. Symptom: messages sent successfully, but the
  recipient's open SSE connection never fired. Fixed by making the
  `globalThis` share unconditional.
- **Attachments reuse the Employee Documents/Expense receipts security
  model** verbatim (`assertAllowedFile`, `saveUploadedFile`, a
  `Content-Disposition: attachment` download route) — combining
  `ALLOWED_DOCUMENT_MIME_TYPES` and `ALLOWED_PHOTO_MIME_TYPES` since a
  message attachment can reasonably be either a document or an image.
- Also surfaced a **pre-existing upload-permissions bug** unrelated to
  messaging's own code: the `ems_uploads` Docker volume was owned by `root`
  with `755` permissions, so the non-root `nextjs` user the Dockerfile runs
  as couldn't create a brand-new subdirectory under
  `storage/uploads/` — it could only write into subdirectories that already
  existed. This would have eventually broken the *first* document/receipt
  upload for any new employee too, not just messaging's own
  `messages/<conversationId>/` folders. Fixed with a one-time
  `chown -R nextjs:nodejs` on the volume (persists for the volume's
  lifetime; redo after any future volume recreation, e.g. a fresh server).
- The conversation list, message thread, and composer are one client
  component tree (`messages-app.tsx`) rather than independent
  self-fetching pieces, specifically so a message arriving over SSE can be
  appended directly into whichever conversation is currently open — the
  same event also updates the conversation list's last-message preview and
  unread badge in one pass. Mobile gets an explicit list↔thread toggle
  (`onBack`) — a fixed two-column layout would leave no way back to the
  conversation list on a small screen.
- Verified live on production end-to-end: two throwaway employees created,
  messaged each other with a real file attachment, confirmed the recipient
  received the message via a live SSE connection (not just via a page
  refresh), confirmed a non-participant is correctly blocked (403) from
  reading, sending into, or downloading attachments from a conversation
  they're not part of, then fully removed the test accounts afterward.

## Projects & tasks module notes

- **Multiple projects** (like ClickUp Spaces), each holding its own tasks —
  not one shared company-wide board. Every authenticated account can view
  every project; `SUPER_ADMIN`/`HR`/`MANAGER` create projects and
  create/edit/assign/delete tasks; any employee can update the `status` of a
  task they're assigned to (`isTaskAssignee` in
  `src/features/projects/authorization.ts`) — the same manage-vs-self-service
  split used by Leave, Expenses, and every other module. Tasks can have
  multiple assignees (`TaskAssignee` join table against `Employee`, not
  `User` — task assignment is a work-identity concept, unlike messaging's
  participants).
- **Three views over the same data, built in order of complexity**: List
  (grouped by status, inline quick-status `Select`), Board (drag-and-drop
  Kanban via `@dnd-kit`), and Gantt (a hand-rolled day-grid timeline built
  from `date-fns` interval math — deliberately not a third-party Gantt
  library, to keep full control over a fairly simple visualization: a fixed
  labels pane plus a horizontally-scrollable day/month header with
  color-coded bars).
- **Board drag-and-drop is manager-only**; employees see a static board with
  the same inline status control as List on just their own cards. A single
  `reorderTasks` mutation (manager-only) takes a destination status plus the
  full ordered list of task IDs for that column and rewrites
  `status`/`position` for all of them in one transaction — simpler and less
  error-prone than computing a single insertion index against neighboring
  positions on every drop.
- **Gantt splits tasks into "scheduled" and "unscheduled"** rather than
  guessing placement for tasks missing dates: a task needs at least a
  `startDate` or `dueDate` to appear on the timeline (a single date renders
  as a one-day bar); tasks with neither are listed separately below with a
  prompt to add a date. The visible date range is derived from the
  earliest/latest task dates present (padded a few days either side), not a
  fixed calendar window.
- Verified live on production end-to-end for all three phases: created a
  project and task as a manager and assigned it to a real employee; confirmed
  the assignee can update just that task's status (200) while a different,
  uninvolved employee is rejected (403); confirmed the manager-only reorder
  endpoint moves a task's status/position correctly; confirmed a task with
  both dates set and a task with neither come back from the API exactly as
  the Gantt view's scheduled/unscheduled split expects. All test data removed
  afterward.

## Performance module notes

- Deliberately different authorization per sub-entity, not one blanket rule:
  **Goals** can be self-authored (employees setting their own goals is
  standard) or written by a manager/HR/Admin for someone they can manage;
  **KPIs** are management-only (they're assigned targets, not something an
  employee sets for themselves); **Reviews** are always written by a
  reviewer, never the employee being reviewed. Verified live: an employee
  creating their own goal succeeds, the same employee creating their own KPI
  gets a 403.
- Review workflow: `DRAFT` (only the reviewer/HR/Admin can see or edit it —
  an employee hitting the detail endpoint for their own still-draft review
  gets a 403, verified live) → `SUBMITTED` (now visible to the employee,
  who gets notified) → `ACKNOWLEDGED` (employee-only action; their optional
  comment is appended to the review summary rather than stored as a separate
  field, keeping the schema from needing a dual-author summary column for a
  rarely-used case).
- `overallRating` isn't a manually-entered field — it's computed as the
  average of that review's per-criterion ratings at creation time. Verified
  live: three ratings of 4, 5, 4 produced `overallRating: 4.33`.
- Review criteria (`DEFAULT_REVIEW_CRITERIA` in
  `src/features/performance/schemas.ts`) are a fixed list (Quality of Work,
  Productivity, Communication, Teamwork, Initiative) rather than a
  reviewer-configurable set — keeps the review form structured and
  comparable across employees instead of open-ended.

## Asset management module notes

- Unlike Attendance/Leave, managers get **no** elevated visibility here —
  only `SUPER_ADMIN`/`HR` manage the inventory; everyone else (including
  managers) only sees their own assigned assets via "My Assets", mirroring
  the confidentiality pattern from Payroll rather than the org-visibility
  pattern from Attendance. Verified live: a manager gets a 403 creating an
  asset but a normal 200 with an empty list from their own "My Assets".
- An asset's `status` is a derived/managed field, not a freely-editable one:
  it can only become `ASSIGNED` via the Assign action (which also writes the
  `AssetAssignment` row) and can only leave `ASSIGNED` via the Return action
  (which closes that row out). Directly PATCHing `status` into or out of
  `ASSIGNED` is rejected with a validation error, preventing the asset
  record from ever desyncing from its assignment history. Verified live.
- Return outcome drives the resulting asset status via a fixed mapping —
  `RETURNED → AVAILABLE`, `DAMAGED → IN_REPAIR`, `LOST → RETIRED` — set
  inside the same `$transaction` that closes the assignment, so the asset
  and its assignment history can't disagree. Verified live with a DAMAGED
  return: asset status flipped to `IN_REPAIR` and a second return attempt
  on the same assignment correctly failed with "already been returned".
- Deleting an asset while it's `ASSIGNED` is blocked (return it first) so
  inventory deletions can never silently orphan assignment history.
- Caught during a code-review pass before shipping: `AssetFormDialog` had its
  own internal `DialogTrigger` ("Add Asset" button) *and* the parent table
  rendered a separate external "Add Asset" button, which would have shown
  two buttons on screen once composed together. Fixed by removing the
  internal trigger — the dialog is now purely controlled (`open`/`onOpenChange`
  props only), matching the pattern already used by `AssignAssetDialog` and
  `ReturnAssetDialog`. Same fix applied to keep `AnnouncementFormDialog`
  (Module 12) from repeating it.

## Announcements & notifications module notes

- Audience targeting is company-wide (`targetDepartmentId: null`) or a
  single department — there's no per-role targeting, since the schema only
  models a department relation. Regular employees only ever see
  non-expired announcements matching their own department (or company-wide
  ones); `SUPER_ADMIN`/`HR` see everything, including expired and
  zero-recipient ones, so they can manage the full history. Verified live
  across three announcements (company-wide, Engineering-only, Finance-only
  with zero employees): the Engineering employee and manager saw the first
  two but not Finance-only, while HR's management view saw all three.
- Publishing an announcement fans out real `Notification` rows to every
  active, non-deleted employee in the target audience (or everyone, for
  company-wide) via the same fire-and-forget `notifyUser` pattern used by
  Leave and Performance — one failed notification write can't fail the
  announcement itself. The author is explicitly excluded from their own
  fan-out. Verified live: HR posting an announcement produced notifications
  for the employee and manager but none for HR itself.
- No scheduled/deferred publishing: `publishedAt` is always "now" at create
  time. Building a future-dated scheduling UI would need a cron/queue to
  fire the notification fan-out later, which this app doesn't have — rather
  than ship a half-working "Schedule for later" control, only `expiresAt`
  (an end date) is exposed, which needs no background job since it's
  filtered at read time.
- The notification bell (built in Module 7) only ever showed the 20 most
  recent items with no way to see older ones. This module adds a proper
  paginated history at `/notifications` (`GET /api/notifications/list`,
  20/page, with an "unread only" filter) and a "View all notifications"
  link at the bottom of the bell dropdown.

## Reports module notes

- Deliberately a thin aggregation layer, not a rebuild: Employee, Attendance,
  and Payroll already had scoped exports on their own pages (Modules 4, 6, 9),
  so their report cards just point at those existing endpoints with a
  filter form — no new query or export code. Only Leave and Assets needed
  new report queries/builders, since neither had an export path before.
  The Attendance card goes further and reuses the *exact same*
  `AttendanceReport` component already shown on the Attendance page's
  "Reports" tab (passed `canManage={false}` here to hide its manual-entry
  action, which belongs on the Attendance page, not this hub).
- Access is gated at both the page and the API layer, but differently on
  purpose: the page uses `requireSession()` + a `canViewReports` boolean
  with a graceful "you don't have access" card for disallowed roles — the
  same convention every other role-gated page in this app already follows
  (Departments, Payroll, etc.). It deliberately does *not* use
  `requireRole()` to throw, which was tried first and reverted: Next.js's
  App Router error boundary catches the thrown error but still responds
  with HTTP 200, producing a confusing blank "error" page instead of the
  page's own graceful fallback. The underlying API routes
  (`/api/reports/leave`, `/api/reports/assets`) still hard-`403` via
  `ForbiddenError`, since that's a JSON API response, not a rendered page,
  where the 200-status quirk doesn't apply. Verified live: an EMPLOYEE
  session hitting `/reports` now sees the fallback card (previously an
  error boundary), while hitting the report APIs directly still gets a
  proper 403.
- Leave report filtering matches by *overlap*, not containment: a leave
  request is included if `startDate <= dateTo AND endDate >= dateFrom`, so
  a multi-day leave that only partially falls inside the selected range
  still shows up, rather than being silently excluded.

## Settings module notes

- Restricted to `SUPER_ADMIN` only — stricter than most other admin screens
  in this app (which are SUPER_ADMIN/HR) — because these settings affect
  every user at once (payslip branding, working-hours calculations, SMTP
  credentials, maintenance mode), not a single department's data. The page
  follows the same `requireSession()` + graceful-fallback-card convention
  established (and fixed into place) in the Reports module, rather than a
  hard `requireRole()` throw.
- Four of the five tabs write to the singleton settings tables from Module 1
  (`CompanySettings`, `WorkingHoursSettings`, `EmailSettings`,
  `SystemSettings`, all fixed at `id: 1`), so every save is a Prisma
  `upsert`, not a create/update branch. The fifth tab, Leave Rules, is a
  real CRUD list against `LeaveType` — deleting a type that has existing
  `LeaveRequest` rows is blocked with a validation error (checked
  proactively, not caught as a raw FK-constraint error), matching the same
  guard style as Assets' "can't delete while assigned." Verified live:
  deleting the seeded "Casual Leave" (in use) is blocked; deleting a freshly
  created, unused type succeeds.
- This module also wired two settings tables that existed since Module 1
  but were never actually read anywhere:
  - **Email settings** — `src/lib/mail.ts` previously only read SMTP config
    from env vars. It now checks the `EmailSettings` DB row first (if a
    host is set there) and falls back to env vars otherwise, including on
    any DB error — a settings-table hiccup can't break password-reset
    emails. The SMTP password is genuinely encrypted at rest with
    AES-256-GCM (`src/features/settings/lib/crypto.ts`), keyed from
    `JWT_SECRET` so no extra secret is needed, not just base64 or left as
    plaintext despite the schema field being named `smtpPasswordEnc`.
    Verified live: the stored ciphertext for a saved password is genuinely
    random per save (fresh IV) and independently decrypts back to the
    original value; leaving the password field blank on a later save
    leaves the stored ciphertext byte-for-byte unchanged (never silently
    cleared).
  - **Maintenance mode** — `SystemSettings.maintenanceMode` now blocks the
    entire dashboard for everyone except `SUPER_ADMIN` (checked in
    `src/app/(dashboard)/layout.tsx`, not `middleware.ts` — middleware runs
    on the Edge runtime and can't reach Prisma/MySQL without a lot more
    plumbing, so the check lives in the Node-runtime dashboard layout
    instead). Verified live: enabling it shows every other role a
    maintenance page while `SUPER_ADMIN` keeps full access (so they can
    turn it back off), and disabling it restores access immediately.
- The other three System Settings fields (`sessionTimeoutMinutes`,
  `passwordMinLength`, `maxLoginAttempts`, `lockoutDurationMinutes`) are
  genuinely persisted through this screen but **not yet enforced** —
  session length is fixed by `JWT_ACCESS_EXPIRES_IN`, password rules live
  in the Zod schema, and login throttling uses the existing generic
  rate-limiter, none of which read this table yet. Wiring all three would
  mean changing already-tested, security-critical auth code in the same
  pass as adding the settings screen, which felt like the wrong tradeoff
  this late in the build — noted here rather than left silently
  half-working.

## Post-launch fixes and additions

Two real bugs were caught via live browser use (not by `tsc`/lint/build, which all stayed green through both) after the UI restyling pass:

- **Global search crash** (`Cannot read properties of undefined (reading 'subscribe')`): the shared `CommandDialog` in `src/components/ui/command.tsx` rendered its children directly inside `DialogContent` without wrapping them in a `<Command>` root. `cmdk`'s `CommandInput`/`CommandList` need that root's context provider to reach their internal store — without it, the store is `undefined` and any state update throws. This was a latent bug from however the component was originally scaffolded; the global search box (⌘K) had apparently never actually been opened during any prior live-testing pass, since every pass checked page loads, not this specific interaction. Fixed by wrapping `{children}` in `<Command>`.
- **`/leave` server-side crash** for HR/Manager roles (RSC digest error, `Functions cannot be passed directly to Client Components`): `src/app/(dashboard)/leave/page.tsx` (a Server Component) passed an inline arrow function (`actionEndpoint={(id) => ...}`) as a prop to `LeaveApprovalsTable` (a Client Component) — functions aren't serializable across that boundary. This predates today's session (Module 7). It only surfaces in the browser after client-side hydration processes the broken RSC payload, so it was invisible to curl-based smoke tests that only grep the initial server-rendered HTML — a real blind spot in that testing method, now noted. Fixed by passing a plain string discriminator (`actionType: "hr" | "manager"`) instead, with the endpoint URL computed inside the client component.

Also added, from user feedback on the live app:
- **Employee quick deactivate/activate** — a direct action in the Employees table's row menu (`PATCH /api/employees/[id]/status`), instead of requiring the full Edit form.
- **Wizard-style Employee form navigation** — Next/Previous buttons across the 5 tabs, with the submit button only appearing on the last tab. If validation fails on submit, the form automatically jumps back to whichever earlier tab contains the error (otherwise a failure would show no visible cause, since inactive tab content is unmounted).
- **WhatsApp share on Announcements** — a `wa.me` deep link with the announcement text pre-filled, letting anyone open WhatsApp and pick a chat/group to forward it to. Deliberately not a fully automated send: that would require a Meta WhatsApp Business API account, a verified phone number, group opt-in, and per-message billing — real infrastructure this app can't provision on its own.
- **Verticals** (`src/features/verticals/`) — a new business-unit concept sitting above Department, added because a real deployment runs multiple companies under one EMS instance (e.g. "Amarc" 09:30–17:30, "Athachi Group" 09:00–17:00 with Saturdays), each needing its own working hours. Modeled as its own entity rather than repurposing Department, since Departments (Engineering, HR, Sales, …) are function-based and already used throughout the app for org-chart, filtering, and headship — overloading them to also mean "legal entity" would have been a confusing double duty. An employee's Vertical (assigned on the Employment tab) now drives their attendance half-day threshold and leave working-day calculation; employees without one fall back to the single global "Default Working Hours" row that existed before. Verified live: an employee moved to a vertical with Saturday as a working day got `3` leave days for a Fri–Mon range spanning that Saturday, vs. the `2` days the global Mon–Fri default would have produced — proving the resolution genuinely reaches the per-vertical config, not just falling through to the default.
- **Portal access / role assignment** — until now, creating an Employee only created a profile record; nothing in the app could create a `User` login or assign a `Role`, apart from `prisma/seed.ts`. Added a "Portal Access" card on the Employee detail page (`src/features/employees/components/account-access-card.tsx`, HR/Admin only), backed by `PUT /api/employees/[id]/account-access`: granting access for the first time creates a `User` row linked via `Employee.userId`, with a random 12-character generated password (`generateTemporaryPassword` in `src/lib/password.ts`) and `mustChangePassword: true` — the existing login flow already redirects to the forced-change screen for that flag (built in Module 2, just never exercised until now), so this wires into existing behavior rather than adding new enforcement. Credentials are emailed via a new `portalAccessGrantedEmailTemplate`. Changing role or deactivating/reactivating an existing account reuses the same endpoint against the already-linked `User` — deactivating sets `isActive: false` rather than deleting the row, so login then correctly fails while history and reactivation stay possible. A role-escalation guard means only a `SUPER_ADMIN` viewer can grant or preserve the `SUPER_ADMIN` role through this screen — HR can already reach this action under the same "manage employees" permission, so without the guard HR could mint new super admins via an employee profile; verified live (HR granting `SUPER_ADMIN` gets a 403, granting `MANAGER`/`HR`/`EMPLOYEE` works). A "Send password reset" button reuses the existing `requestPasswordReset` service function as-is rather than inventing a parallel reset mechanism.
- **Leave request emails** — `notifyUser`/`notifyHrUsers` in `src/features/leave/mutations.ts` previously only wrote an in-app `Notification` row; nobody got an actual email for apply/approve/reject. `notifyUser` now also emails the recipient (best-effort — a failed send never blocks the in-app notification or the underlying leave action) via a new generic `portalNotificationEmailTemplate`, linking back to the relevant portal page rather than offering one-click approve/reject from the email itself — every decision still goes through the same authenticated, audited API path, so there's no separate email-based security surface to defend. Verified live end-to-end: apply → manager emailed → manager approves → HR emailed → HR approves → employee emailed, with each step's resulting status visible immediately in the portal, since the email link *is* the portal action, not a shortcut around it.
- While testing this, found that **`.env`'s SMTP placeholder values were actively harmful**: `SMTP_HOST="smtp.example.com"` looks like an obviously-fake placeholder but isn't an empty string, so `resolveMailConfig()` treated it as "configured" and every email attempt tried a real DNS lookup and failed (`ENOTFOUND`) instead of using the intended log-to-console dev fallback. This silently affected password-reset emails since Module 2 too. Fixed by blanking the SMTP fields in `.env` (the local, actually-loaded file); `.env.example` keeps the illustrative placeholder since that's a template for filling in, not a value that gets loaded.
- **Users tab** (`src/features/users/`, Settings → Users, `SUPER_ADMIN` only) — a company-wide view the per-employee "Portal Access" card above doesn't give you: every login account in one table (email, linked employee if any, role, last login), a `Switch` to enable/disable each one inline, an inline role `Select`, and a "Create User" dialog for Super Admin to provision an account directly — optionally linked to an existing employee with no login yet, or fully standalone (mirroring the seeded `admin@ems.local`, which has no employee record at all). A static "Roles & Responsibilities" reference sits above the table explaining what each of the four roles can actually do, since that was asked for explicitly and isn't self-evident from a bare role name.
  - **Security**: when linking to an employee, the login email is *always* derived server-side from that employee's own record, never trusted from the client — verified live by submitting a mismatched, attacker-supplied email alongside a valid `employeeId` and confirming the created account used the employee's real email regardless.
  - **Self-lockout guard**: a Super Admin can't deactivate their own account or change their own role from this screen — either would risk locking them out of Settings entirely (the only place to undo it) with no recovery path. Verified live: both actions return a validation error when a viewer targets their own user id.
  - **Found and fixed while testing this**: soft-deleting an Employee (`softDeleteEmployee`) never deactivated their linked login — a "removed" employee could still authenticate and use the portal indefinitely. Now wrapped in the same transaction as the soft-delete: if the employee has a linked `User`, it's set `isActive: false` too. Verified live: granted an employee portal access, confirmed login succeeded, soft-deleted the employee, confirmed the exact same login now fails with `401`.

## Database design notes

- All monetary fields use `Decimal` (mapped to MySQL `DECIMAL`) to avoid
  floating-point rounding issues in payroll calculations.
- Soft delete is used on `Employee` (`deletedAt`) so historical attendance,
  payslips and leave records remain intact after an employee leaves.
- `LeaveRequest` encodes the Employee → Manager → HR approval workflow
  directly as `status` + separate manager/HR actor & timestamp columns,
  rather than a generic workflow-engine table — simpler to query and report on.
- Settings are modeled as typed singleton tables (`CompanySettings`,
  `WorkingHoursSettings`, `EmailSettings`, `SystemSettings`) rather than a
  generic key-value store, so forms can be built directly against typed
  Prisma models with Zod validation.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12); password-reset and
  refresh tokens are stored as SHA-256 hashes, never in plaintext.
- JWT access tokens are short-lived (15m default); refresh tokens are
  long-lived (7d default) and rotated on use (see Authentication design
  notes above).
- Login, forgot-password and reset-password endpoints are rate-limited by IP
  via `src/lib/rate-limit.ts`, which is in-memory and scoped to a single Node
  process. If you deploy multiple instances behind a load balancer, replace
  it with a shared store (e.g. Redis).
- `npm audit` currently reports advisories in transitive dev/build tooling
  (`eslint`'s `minimatch`/`brace-expansion`, Next's bundled `postcss`/`sharp`)
  and in `exceljs`'s zip-writing dependency chain. None of these are reachable
  via user-supplied input in this app's code paths; re-run `npm audit` after
  dependency upgrades to confirm this remains true.
  - Specifically re-checked for Module 15: all 13 `npm audit --omit=dev`
    findings are nested inside `next`'s own pinned `postcss`/`sharp`, or
    `exceljs`'s pinned `uuid` — not our direct dependencies, and every
    suggested fix requires downgrading Next to a 2020-era canary release,
    which `npm audit fix --force` will happily do and which would be far
    more damaging than the advisories themselves. The `sharp` CVEs are
    specifically about `next/image`'s optimization pipeline, which this app
    never invokes — it has no `next/image` usage anywhere (confirmed via
    a repo-wide search), so that code path is present in `node_modules` but
    dormant. Re-run `npm audit --omit=dev` after a Next.js/exceljs upgrade
    to see if these have cleared.
- **Security headers** (`next.config.ts`): `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and
  HSTS are set on every route. A strict `Content-Security-Policy` is
  deliberately **not** set: Radix UI (used throughout — Select, Dropdown,
  Popover, Dialog, Tooltip) positions floating elements via inline `style`
  attributes, which a CSP without `style-src 'unsafe-inline'` would
  silently break across the entire UI. Adding one safely needs a manual
  pass clicking through every dropdown/select/dialog to confirm nothing
  regresses — not something verifiable without a browser in this
  environment, so it's called out here as follow-up work rather than
  shipped half-tested.
- **CSRF posture**: relies on the session cookie's `SameSite: Lax` (plus
  `HttpOnly` and `Secure` in production) rather than a separate CSRF
  token — browsers won't attach the cookie to cross-site POST/PUT/DELETE
  requests under `Lax`, which covers the standard cross-site-form-submit
  CSRF case. This does not defend against a compromised same-site
  subdomain; if this app is ever deployed alongside untrusted subdomains
  of the same parent domain, add an explicit double-submit CSRF token.
- **Rate-limiting trusts `X-Forwarded-For` as-is**
  (`src/lib/rate-limit.ts` → `getClientIp`), which is a client-settable
  header. Behind a reverse proxy that correctly overwrites/strips it
  before forwarding (the standard Docker/nginx/Traefik setup), this is
  safe — the proxy's own value wins. If this app is ever exposed directly
  to the internet without such a proxy in front, that header must not be
  trusted as-is (an attacker could send a different fake value on every
  request to bypass both the login rate limiter and IP attribution in the
  audit log). Deploy behind a reverse proxy that manages this header, or
  harden `getClientIp` to only trust a configured, known-trusted proxy hop.
- **File uploads**: validated by size (`MAX_UPLOAD_SIZE_MB`) and an
  allowlisted MIME type per upload type (photos vs. documents), stored
  under a private `storage/uploads/` directory (never `public/`) with
  UUID-randomized filenames, served only through authenticated routes with
  path-traversal protection (`resolveSafePath` refuses to serve outside
  the upload root). Documents are always served with `Content-Disposition:
  attachment`, so even a mismatched extension/MIME-type pair can't render
  inline in the browser. Profile photos are served with a `Content-Type`
  derived from a small hardcoded extension allowlist (never from
  client-supplied input), so an unexpected extension safely degrades to
  `application/octet-stream` instead of being guessed/rendered.
- **Before deploying to production**, change the placeholder secrets that
  ship in `.env`/`.env.example` for local development —
  `JWT_SECRET="change-me-access-secret-min-32-chars-long"` and the seeded
  `SEED_SUPER_ADMIN_PASSWORD`. Neither is enforced at startup (there's no
  "refuses to boot with the default secret" check), so this is a manual
  step for whoever deploys this.
