# CybSync: Project Evaluation and Task List

_Evaluated: October 13, 2026, on `main` at commit `14f1570` (Next.js 15.5.27)._

_Last updated: October 13, 2026 (all P0 and P1 tasks done, plus several P2/P3 tasks along the way)._

This document records the current state of the CybSync Attendance System and lists the work still needed, **from highest to lowest priority**. Each task says where the problem is and what "done" looks like, so it can be picked up as an issue or PR on its own.

This file is the overall to-do list. The other files in this folder are guides:

| Guide | Covers |
| --- | --- |
| `BACKEND_INTEGRATION.md` | Council login, sessions, and which routes/pages each role can use |
| `STUDENT_LOGIN_BACKEND_INTEGRATION.md` | Student Google sign-in and its setup |
| `STUDENTS.md` | Students page, CSV import, RFID card linking |
| `EVENTS_AND_ATTENDANCE.md` | Events (requests, approval, start/end), the scanner, statistics |
| `REPORTS.md` | Student excuse letters and discrepancy reports |

---

## Summary

| Area | State |
| --- | --- |
| Build and deploy | ✅ Builds and deploys on Vercel |
| UI pages | ✅ All council and student pages are connected to real data |
| Backend API | ✅ Events, attendance, students, reports and auth routes are complete |
| Frontend ↔ backend | ✅ No demo data left |
| Security | ⚠️ API routes require login with the right role, and students sign in with their school Google account + Student ID. Council accounts are created with `npm run seed:admin` (task 4). |
| Mobile layout | ✅ No page scrolls sideways at 390 px |
| Tests | ❌ None |

**In short:** the site now works end to end: students are imported and get RFID cards, events are requested, approved, started and ended, attendance is scanned, and students send excuse letters that the council reviews. What's left is polish: late detection, login rate limiting, tests, and maintenance.

---

## Product decisions

- **Student accounts are view-and-report only.** Students can see their own attendance and submit reports (excuse letters, or discrepancies they noticed in their record). They **cannot** check themselves in to events.
- **Attendance is recorded only by the council's RFID scanner** (`POST /api/attendance/scan`).
- **Students log in with their school Google account + Student ID** (task 3). Both must belong to the same student.

---

## Progress checklist

Tick a box (`- [x]`) in the PR that finishes the task. Details for each task are in the sections below.

**🔴 P0: Critical**
- [x] 1. Protect the council/admin API routes
- [x] 2. Stop trusting a client-sent `x-user-id` header
- [x] 3. Decide how students prove who they are
- [x] 4. Create the first council account

**🟠 P1: High**
- [x] 5. Connect the login pages and keep users logged in
- [x] 6. Connect the council pages to the API
- [x] 7. Connect the student pages and add the missing student report routes
- [x] 8. Add event management
- [x] 9. Fix the attendance records route
- [x] 10. Add student and RFID management

**🟡 P2: Medium**
- [x] 11. Calculate "late" correctly
- [x] 12. Use the AM/PM and Sign In/Sign Out fields consistently
- [x] 13. Finish the dashboard statistics
- [x] 14. Validate IDs and handle errors in every route
- [x] 15. Record who submitted an event request
- [x] 16. Store report attachments
- [x] 17. Fix horizontal scrolling on phones
- [x] 18. Prevent brute-force attacks on login
- [ ] 19. Add tests

**🟢 P3: Low**
- [x] 20. Remove leftover demo code
- [x] 21. Clear lint warnings
- [x] 22. Remove duplicate mock rows
- [x] 23. Update the root README
- [x] 24. Plan the Next.js 16 upgrade
- [x] 25. Accessibility pass
- [x] 26. Make the notification bell work

---

## 🔴 P0: Critical (fix before real students or council members use it)

### 1. Protect the council/admin API routes ✅ Done

> **Status:** Done on `develop-cybsync`. `src/proxy.ts` now:
> - lets only `/api/auth/council-login` and `/api/auth/student-login` through without a token;
> - returns `401 Unauthorized` when the token is missing, invalid, expired, or has no `sub`/`role`;
> - allows `/api/student/*` only for `role: "student"`, and every other `/api/*` route only for `role: "council"` or `"admin"`. Anything else gets `403 Forbidden`.
>
> **What this means for the frontend:** since task 5, the login token is an `HttpOnly` cookie that the browser sends automatically, so pages just call `fetch('/api/...')`. (`Authorization: Bearer <token>` still works for non-browser clients.)
>
> _Original description:_

`src/proxy.ts` only checks a token **when one is sent**. A request with no `Authorization` header goes straight through, so anyone on the internet can call these routes without logging in:

- `GET /api/dashboard`, `GET /api/dashboard/events/upcoming`
- `POST /api/attendance/scan` (record attendance for any student)
- `GET /api/attendance/records/...` (read every student's name, ID, course and section)
- `GET /api/reports`, `POST /api/reports/[id]/accept`, `POST /api/reports/[id]/reject`
- `GET /api/events/past`, `POST /api/events/request`

**Done when:** every route except the two login routes returns `401` without a valid token, and council-only routes return `403` for a token with `role: "student"`.

### 2. Stop trusting a client-sent `x-user-id` header ✅ Done

The student routes (`/api/student/attendance`, `/api/student/dashboard`, `/api/student/check-in`) identify the student by the `x-user-id` header. The middleware sets this header after checking a token, but if no token is sent, it passes along whatever `x-user-id` the client wrote. Anyone can send `x-user-id: <someone's id>` to read that student's attendance or check them in.

**Done when:** the middleware always deletes incoming `x-user-id` and `x-user-role` headers before (optionally) setting them from a verified token. Together with task 1, that is a small change in `src/proxy.ts`.

> **Status:** Done on `develop-cybsync`. `src/proxy.ts` now deletes any client-sent `x-user-id` and `x-user-role` headers on **every** `/api` request, including the public login routes, and only sets them again from a verified token. API routes can trust these headers.

### 3. Decide how students prove who they are ✅ Done

> **Decision:** students sign in with their **school Google account and their Student ID**. The login only succeeds if the Student ID's record has the same email as the Google account.
>
> **Status:** Done on `develop-cybsync`.
> - `src/lib/google.ts` verifies the Google ID token (signature, our client ID, verified email, school domain via `ALLOWED_EMAIL_DOMAIN`).
> - `src/app/api/auth/student-login/route.ts` now requires `{ studentId, credential }` and matches the Student ID to the Google email.
> - `src/app/student-login/page.tsx` has a Student ID field plus a "Sign in with Google" button, and is connected to the API.
> - Student self check-in was removed (`/api/student/check-in` and the event-code box on the student attendance page), per the product decision above.
> - Setup steps (Google Cloud client ID, environment variables): `docs/STUDENT_LOGIN_BACKEND_INTEGRATION.md`.
>
> **Before students can log in:** create the Google client ID, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `ALLOWED_EMAIL_DOMAIN` in Vercel, and make sure every `Student` record's `email` is the student's school Google email.
>
> _Original description:_

`/api/auth/student-login` only asks for a **Student ID**, with no password. Student IDs are not secret (they're printed on IDs and on the attendance table), so anyone who knows one can log in as that student and check them in to events.

**Options:** add a password or PIN, send a one-time code to the student's school email (the `Student` model already has `email`), or use school Google sign-in. This is a product decision for the team.

### 4. Create the first council account ✅ Done

> **Status:** Done on `develop-cybsync`. Run `npm run seed:admin` (script: `scripts/seed-admin.ts`) to create a council/admin account or reset a password. See "Creating Council Accounts" in the root `README.md`.
>
> _Original description:_

`/api/auth/council-login` checks the `User` collection, but there is no way to create a user. There's no sign-up page, admin page or seed script.

**Done when:** a script (e.g. `npm run seed:admin`) creates a council user with a bcrypt-hashed password, and the README explains how to run it against the production database.

---

## 🟠 P1: High (core features don't work without these)

### 5. Connect the login pages and keep users logged in ✅ Done

> **Status:** Done on `develop-cybsync`. Details are in `docs/BACKEND_INTEGRATION.md`.
> - **Council login (`/`)** calls `/api/auth/council-login`, shows errors inline, and redirects to `/dashboard`.
> - **Sessions use an `HttpOnly` cookie** (`cybsync_session`) set by both login routes. "Remember me" keeps it for 30 days; otherwise it lasts until the browser closes. The tokens are no longer returned in the JSON or stored in `localStorage`.
> - **Pages are protected by the middleware:** `/dashboard/*` needs a council/admin login and `/student-dashboard/*` needs a student login, otherwise it redirects to the right login page. Logged-in users who open a login page go straight to their dashboard.
> - **Sign out works** in both sidebars (`POST /api/auth/logout`).
> - **Sidebars show the real logged-in user** via the new `GET /api/auth/me`.
>
> _Original description:_

- **Council login (`src/app/page.tsx`):** `handleSubmit` only does `console.log`. Call `/api/auth/council-login`, store the token, and redirect to `/dashboard`. Show an error message on wrong credentials.
- ~~**Student login (`src/app/student-login/page.tsx`)**~~: done as part of task 3 (Google sign-in + Student ID).
- **Sign out (`src/components/Sidebar.tsx`):** `handleSignOut` does nothing. Clear the token and redirect to `/`. (`StudentSidebar.tsx` already clears storage.)
- **Protect the pages:** `/dashboard/*` and `/student-dashboard/*` open for anyone. Redirect to the login page when there is no valid token.
- **Recommended:** store the token in an `httpOnly` cookie set by the login route instead of `localStorage`. That makes it safer against XSS and lets the middleware protect pages as well as API routes.

### 6. Connect the council pages to the API ✅ Done

> **Status:** Done on `develop-cybsync`. Dashboard, Attendance (scanner), Request, Past Events and Reports all use real data, plus a new **Events** page (task 8). See `docs/EVENTS_AND_ATTENDANCE.md` and `docs/REPORTS.md`.

> _Original description:_

| Page | File | API to call | Notes |
| --- | --- | --- | --- |
| Dashboard | `src/app/dashboard/page.tsx` | `GET /api/dashboard` | Replace the hardcoded "University Pagirimaw 2025" data |
| Attendance / RFID | `src/app/dashboard/attendance/page.tsx` | `POST /api/attendance/scan`, records route | The page sends `eventId: 'current'`, which isn't a real ID. It needs to pick the active event. |
| Request event | `src/app/dashboard/request/page.tsx` | `POST /api/events/request` | |
| Past events | `src/app/dashboard/past-events/page.tsx` | `GET /api/events/past` | |
| Reports | `src/app/dashboard/reports/page.tsx` | `GET /api/reports`, accept, reject | |

### 7. Connect the student pages and add the missing student report routes ✅ Done

> **Status:** Done on `develop-cybsync`. Student dashboard, attendance and reports use real data. New `GET/POST /api/student/reports`; `Report` now has `type` (`excuse`/`discrepancy`), links to the student (from the session) and the event, and supports attachments. Accepting an excuse marks the student excused for that event. See `docs/REPORTS.md`.

> _Original description:_

| Page | File | API to call | Notes |
| --- | --- | --- | --- |
| Student dashboard | `src/app/student-dashboard/page.tsx` | `GET /api/student/dashboard` | |
| Student attendance | `src/app/student-dashboard/attendance/page.tsx` | `GET /api/student/attendance` | Read-only. Check-in was removed. |
| Student reports | `src/app/student-dashboard/reports/page.tsx` | `POST /api/student/reports`, `GET /api/student/reports/history` | **Neither route exists yet.** Create both. |

Student reports are for two things: **excuse letters** (for an event they missed or were late to) and **attendance discrepancies** (a record that's wrong or missing). To support that:
- add a `type` field to `Report` (`"excuse"` or `"discrepancy"`) and let the student pick it on the form;
- link each report to the student from the login token (not from the form) and to the event or attendance record it's about;
- when the council accepts an excuse, set that attendance record's status to `excused`; when they accept a discrepancy, they correct the record.

### 8. Add event management ✅ Done

> **Status:** Done on `develop-cybsync`. New **Events** page: council members start/end/reopen events; **admins** create, edit, delete events and approve or reject requests (approving creates the event). See `docs/EVENTS_AND_ATTENDANCE.md`.

> _Original description:_

Attendance depends on events, but there is no way to create one, start it (`upcoming → active`) or end it (`active → past`). (The `Event.code` field was only for student check-in, which was removed, so it's no longer needed.) Council members also can't see or approve the event requests submitted from the Request page.

**Done when:** council users can list, approve and reject `EventRequest`s, and an approved request becomes an `Event` they can start and end from the UI.

### 9. Fix the attendance records route ✅ Done

> **Status:** Done on `develop-cybsync`. Moved to `GET /api/attendance/records?eventId=…`. The old attendance guide was replaced by `docs/EVENTS_AND_ATTENDANCE.md`.

> _Original description:_

`src/app/api/attendance/records/[recordId]/route.ts` is in a `[recordId]` folder but ignores `recordId` and reads `?eventId=` from the query string instead. Either move it to `/api/attendance/records` (using `?eventId=`) or rename the folder to `[eventId]` and use the path parameter. Then update `docs/ATTENDANCE_BACKEND_INTEGRATION.md` to match.

### 10. Add student and RFID management ✅ Done

> **Status:** Done on `develop-cybsync`. Guide: `docs/STUDENTS.md`.
> - New **Students** page (`/dashboard/students`): search, filter by card, add/edit students, set inactive.
> - **CSV import** with a preview step. It recognizes common class-list column names, reports problem rows, and matches existing students by Student ID. Template: `public/students-template.csv`.
> - **RFID linking** by tapping the card on the USB reader, with "go to next student without a card" for linking many cards in a row.
> - RFID cards are now **unique** in the database. Existing databases need `npm run db:migrate` once.
>
> _Original description:_

The RFID scanner looks students up by `rfid` or `studentId`, but there's no way to add students or link RFID cards to them.

**Done when:** council users can import students (e.g. from a CSV class list) and assign an RFID tag to a student, including by scanning the card.

---

## 🟡 P2: Medium (correctness and quality)

### 11. Calculate "late" correctly ✅ Done

> **Status:** Done. A Sign In after the session's start + grace period (default 15 min, per event; separate optional afternoon start for PM) is marked late, compared in `SCHOOL_TIMEZONE` (default `Asia/Manila`). Logic: `src/lib/late.ts`. See `docs/EVENTS_AND_ATTENDANCE.md`.

> _Original description:_
`/api/attendance/scan` always saves `status: "on-time"`, so the late-attendance numbers on the student dashboard will always be 0. Compare the check-in time with the event's `startTime` (plus a grace period).

### 12. Use the AM/PM and Sign In/Sign Out fields consistently ✅ Done

> **Status:** Done. The scanner page has Session (AM/PM) and Scan (Sign In/Sign Out) toggles, and `/api/attendance/scan` only accepts those values.

> _Original description:_
The RFID scanner accepts any `type` and `action` text from the page. Decide whether events have AM/PM sessions and sign-out, and validate these fields in `/api/attendance/scan` (e.g. `type` must be `AM` or `PM`, `action` must be `Sign In` or `Sign Out`).

### 13. Finish the dashboard statistics ✅ Done

> **Status:** Done. `src/lib/eventStats.ts` computes per-event attended count, rate, and course and year-by-course breakdowns; used by the dashboard, attendance and past events.

> _Original description:_
- `/api/dashboard` returns `courseB: 0` for every year, so the "by Year and Course" chart can't show real data.
- `/api/events/past` returns `totalDepartmentStudents: 0`, `attendanceRate: 0` and empty distribution arrays for every event.
- The dashboard's "attended" count counts students who attended **any** event, not the selected event.

### 14. Validate IDs and handle errors in every route ✅ Done

> **Status:** Done. All routes with IDs check them (404 for invalid IDs) and handle bad JSON bodies with a 400.

> _Original description:_
Passing an invalid MongoDB ID (e.g. `/api/reports/abc/accept`) throws an unhandled `CastError` and returns a generic 500. Routes also call `req.json()` without a `try/catch`, so a bad body crashes the request. Validate IDs with `mongoose.isValidObjectId` and return clear `400` errors.

### 15. Record who submitted an event request ✅ Done

> **Status:** Done. `requestedBy` is set from the logged-in user; reviews record `reviewedBy` too.

> _Original description:_
`EventRequest.requestedBy` is never filled in. Set it from the logged-in user in `/api/events/request`.

### 16. Store report attachments ✅ Done

> **Status:** Done. Files (JPG/PNG/WebP/PDF, checked by content, max 3 × 2 MB) are stored in MongoDB. See `docs/REPORTS.md`.

> _Original description:_
The student report form accepts file uploads, but nothing stores the files. Use a storage service such as Vercel Blob and save the URLs in `Report.attachments`.

### 17. Fix horizontal scrolling on phones ✅ Done

> **Status:** Done. Every council and student page was checked at 390 px wide with no sideways scrolling.

> _Original description:_
Tested at 390 px width (iPhone 14 size):
- `/dashboard/attendance` scrolls **316 px** sideways. Wrap the records table in a container with `overflow-x-auto`.
- `/dashboard` scrolls **67 px** sideways.
- On mobile, the menu button overlaps the page title. Add left padding to the header on small screens.

### 18. Prevent brute-force attacks on login ✅ Done

> **Status:** Done. Both login routes allow 5 failed attempts per account and 20 per IP in 15 minutes, then return `429` with `Retry-After`. Counters are stored in MongoDB with automatic expiry, so they work across Vercel's server instances. See `src/lib/rateLimit.ts` and `docs/BACKEND_INTEGRATION.md`.

> _Original description:_
Add rate limiting to `/api/auth/council-login` and `/api/auth/student-login` (for example, a limit per IP using Vercel's firewall or a small in-database counter).

### 19. Add tests
There are no tests. Start with the API routes (logins, middleware auth, RFID scan, student reports) using Vitest and an in-memory MongoDB, and run `npm run lint` and `npm run build` on every PR with GitHub Actions.

---

## 🟢 P3: Low (polish and maintenance)

20. ✅ **Remove leftover demo code.** _(Done: no mock data, commented-out fetches or alerts remain.)_ Delete mock data, commented-out `fetch` examples and `alert(...)` calls as each page is connected. Replace `alert` with in-page messages or toasts.
21. ✅ **Clear lint warnings.** _(Done: `npm run lint` shows 0 problems.)_ There are 6 warnings: unused variables in the attendance and student reports pages, an unused `Student` import, and an `<img>` that should be `next/image` in `dashboard/reports/page.tsx`. Note: the `Student` import in the records route registers the model for `.populate("student")`, so keep it or replace it with an explicit side-effect import.
22. ✅ **Remove duplicate mock rows** _(Done: the mock data was removed.)_ in `src/app/dashboard/attendance/page.tsx` (record `id: '2'` repeats `year`, `section` and `timestamp`).
23. ✅ **Update the root README.** _(Done: structure, docs and features sections rewritten.)_ Its project-structure section is out of date: it lists `tailwind.config.ts` and docs files at the root, and it's missing the student pages, `src/app/api`, `src/models` and `src/lib`. "Backend API Integration" is listed as not started, but the API exists.
24. ✅ **Plan the Next.js 16 upgrade.** _(Done: upgraded to Next.js 16.4.0 and React 19.3. `middleware.ts` is now `proxy.ts`, ESLint uses the new native config (including the React Compiler rules, whose findings were fixed), and `npm audit` reports 0 vulnerabilities.)_ `npm audit` still reports a `postcss` advisory inside Next.js 15 that is only fixed in Next 16. It only affects the build, not the running site, but Next 16 also renames `proxy.ts` to `proxy.ts`, so plan the upgrade as one task.
25. ✅ **Accessibility pass.** _(Done: an axe-core audit (WCAG 2.1 A/AA + best practices) of all 12 pages at desktop and phone width reports 0 violations. Fixed: labels on the mobile menu buttons and the report file picker, a `main` landmark on the login pages, a hidden header for the students table's actions column, and dialogs now move keyboard focus in and back out. Color contrast, including the blue login background, passes.)_ Check color contrast on the bright blue (`#0000FF`) login background, add labels to icon-only buttons (menu, notifications), and make sure the RFID input works with a keyboard and screen readers.
26. ✅ **Make the notification bell work.** _(Done by removing it: it had no function. Pending counts now show as badges on the Events → Requests and Reports tabs.)_ The bell on the dashboard header has no function yet. Connect it to new reports or event-request updates, or remove it.

---

## Suggested order of work

1. **~~P0 tasks 1, 2 and 4.~~** These are small, contained changes, and the site shouldn't be shared until they're done.
2. **~~P0 task 3 and P1 task 5.~~**
3. ~~**P1 tasks 6–10.**~~
4. **Remaining P2:** 11 (late detection), 18 (login rate limiting), 19 (tests).
5. **Remaining P3:** 23–25.

## Branch workflow

Work happens on the `develop-cybsync` branch. Open a pull request from `develop-cybsync` into `main` to release changes. `main` deploys to production on Vercel, and other branches get Vercel preview URLs.
