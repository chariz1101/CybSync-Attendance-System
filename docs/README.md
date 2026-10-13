# CybSync: Project Evaluation and Task List

_Evaluated: October 13, 2026, on `main` at commit `14f1570` (Next.js 15.5.27)._

_Last updated: October 13, 2026 (all P0 tasks and P1 task 5 done)._

This document records the current state of the CybSync Attendance System and lists the work still needed, **from highest to lowest priority**. Each task says where the problem is and what "done" looks like, so it can be picked up as an issue or PR on its own.

The other files in this folder (`*_BACKEND_INTEGRATION.md`) describe the API each page expects. This file is the overall to-do list.

---

## Summary

| Area | State |
| --- | --- |
| Build and deploy | ✅ Builds and deploys on Vercel |
| UI pages | ✅ All 10 pages are designed and render on desktop |
| Backend API | ⚠️ 16 routes exist, but some are missing or incomplete |
| Frontend ↔ backend | ❌ **Nothing is connected yet.** Every page shows hardcoded demo data, and every button only logs to the console or shows a "Demo mode" alert. |
| Security | ⚠️ API routes require login with the right role, and students sign in with their school Google account + Student ID. Council accounts are created with `npm run seed:admin` (task 4). |
| Mobile layout | ⚠️ Two dashboard pages scroll sideways on phones |
| Tests | ❌ None |

**In short:** the site looks finished, but it doesn't work yet. The most important work is (1) closing the security holes in the API and (2) connecting each page to its API route.

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
- [ ] 6. Connect the council pages to the API
- [ ] 7. Connect the student pages and add the missing student report routes
- [ ] 8. Add event management
- [ ] 9. Fix the attendance records route
- [ ] 10. Add student and RFID management

**🟡 P2: Medium**
- [ ] 11. Calculate "late" correctly
- [ ] 12. Use the AM/PM and Sign In/Sign Out fields consistently
- [ ] 13. Finish the dashboard statistics
- [ ] 14. Validate IDs and handle errors in every route
- [ ] 15. Record who submitted an event request
- [ ] 16. Store report attachments
- [ ] 17. Fix horizontal scrolling on phones
- [ ] 18. Prevent brute-force attacks on login
- [ ] 19. Add tests

**🟢 P3: Low**
- [ ] 20. Remove leftover demo code
- [ ] 21. Clear lint warnings
- [ ] 22. Remove duplicate mock rows
- [ ] 23. Update the root README
- [ ] 24. Plan the Next.js 16 upgrade
- [ ] 25. Accessibility pass
- [ ] 26. Make the notification bell work

---

## 🔴 P0: Critical (fix before real students or council members use it)

### 1. Protect the council/admin API routes ✅ Done

> **Status:** Done on `develop-cybsync`. `src/middleware.ts` now:
> - lets only `/api/auth/council-login` and `/api/auth/student-login` through without a token;
> - returns `401 Unauthorized` when the token is missing, invalid, expired, or has no `sub`/`role`;
> - allows `/api/student/*` only for `role: "student"`, and every other `/api/*` route only for `role: "council"` or `"admin"`. Anything else gets `403 Forbidden`.
>
> **What this means for the frontend:** since task 5, the login token is an `HttpOnly` cookie that the browser sends automatically, so pages just call `fetch('/api/...')`. (`Authorization: Bearer <token>` still works for non-browser clients.)
>
> _Original description:_

`src/middleware.ts` only checks a token **when one is sent**. A request with no `Authorization` header goes straight through, so anyone on the internet can call these routes without logging in:

- `GET /api/dashboard`, `GET /api/dashboard/events/upcoming`
- `POST /api/attendance/scan` (record attendance for any student)
- `GET /api/attendance/records/...` (read every student's name, ID, course and section)
- `GET /api/reports`, `POST /api/reports/[id]/accept`, `POST /api/reports/[id]/reject`
- `GET /api/events/past`, `POST /api/events/request`

**Done when:** every route except the two login routes returns `401` without a valid token, and council-only routes return `403` for a token with `role: "student"`.

### 2. Stop trusting a client-sent `x-user-id` header ✅ Done

The student routes (`/api/student/attendance`, `/api/student/dashboard`, `/api/student/check-in`) identify the student by the `x-user-id` header. The middleware sets this header after checking a token, but if no token is sent, it passes along whatever `x-user-id` the client wrote. Anyone can send `x-user-id: <someone's id>` to read that student's attendance or check them in.

**Done when:** the middleware always deletes incoming `x-user-id` and `x-user-role` headers before (optionally) setting them from a verified token. Together with task 1, that is a small change in `src/middleware.ts`.

> **Status:** Done on `develop-cybsync`. `src/middleware.ts` now deletes any client-sent `x-user-id` and `x-user-role` headers on **every** `/api` request, including the public login routes, and only sets them again from a verified token. API routes can trust these headers.

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

### 6. Connect the council pages to the API

| Page | File | API to call | Notes |
| --- | --- | --- | --- |
| Dashboard | `src/app/dashboard/page.tsx` | `GET /api/dashboard` | Replace the hardcoded "University Pagirimaw 2025" data |
| Attendance / RFID | `src/app/dashboard/attendance/page.tsx` | `POST /api/attendance/scan`, records route | The page sends `eventId: 'current'`, which isn't a real ID. It needs to pick the active event. |
| Request event | `src/app/dashboard/request/page.tsx` | `POST /api/events/request` | |
| Past events | `src/app/dashboard/past-events/page.tsx` | `GET /api/events/past` | |
| Reports | `src/app/dashboard/reports/page.tsx` | `GET /api/reports`, accept, reject | |

### 7. Connect the student pages and add the missing student report routes

| Page | File | API to call | Notes |
| --- | --- | --- | --- |
| Student dashboard | `src/app/student-dashboard/page.tsx` | `GET /api/student/dashboard` | |
| Student attendance | `src/app/student-dashboard/attendance/page.tsx` | `GET /api/student/attendance` | Read-only. Check-in was removed. |
| Student reports | `src/app/student-dashboard/reports/page.tsx` | `POST /api/student/reports`, `GET /api/student/reports/history` | **Neither route exists yet.** Create both. |

Student reports are for two things: **excuse letters** (for an event they missed or were late to) and **attendance discrepancies** (a record that's wrong or missing). To support that:
- add a `type` field to `Report` (`"excuse"` or `"discrepancy"`) and let the student pick it on the form;
- link each report to the student from the login token (not from the form) and to the event or attendance record it's about;
- when the council accepts an excuse, set that attendance record's status to `excused`; when they accept a discrepancy, they correct the record.

### 8. Add event management

Attendance depends on events, but there is no way to create one, start it (`upcoming → active`) or end it (`active → past`). (The `Event.code` field was only for student check-in, which was removed, so it's no longer needed.) Council members also can't see or approve the event requests submitted from the Request page.

**Done when:** council users can list, approve and reject `EventRequest`s, and an approved request becomes an `Event` they can start and end from the UI.

### 9. Fix the attendance records route

`src/app/api/attendance/records/[recordId]/route.ts` is in a `[recordId]` folder but ignores `recordId` and reads `?eventId=` from the query string instead. Either move it to `/api/attendance/records` (using `?eventId=`) or rename the folder to `[eventId]` and use the path parameter. Then update `docs/ATTENDANCE_BACKEND_INTEGRATION.md` to match.

### 10. Add student and RFID management

The RFID scanner looks students up by `rfid` or `studentId`, but there's no way to add students or link RFID cards to them.

**Done when:** council users can import students (e.g. from a CSV class list) and assign an RFID tag to a student, including by scanning the card.

---

## 🟡 P2: Medium (correctness and quality)

### 11. Calculate "late" correctly
`/api/attendance/scan` always saves `status: "on-time"`, so the late-attendance numbers on the student dashboard will always be 0. Compare the check-in time with the event's `startTime` (plus a grace period).

### 12. Use the AM/PM and Sign In/Sign Out fields consistently
The RFID scanner accepts any `type` and `action` text from the page. Decide whether events have AM/PM sessions and sign-out, and validate these fields in `/api/attendance/scan` (e.g. `type` must be `AM` or `PM`, `action` must be `Sign In` or `Sign Out`).

### 13. Finish the dashboard statistics
- `/api/dashboard` returns `courseB: 0` for every year, so the "by Year and Course" chart can't show real data.
- `/api/events/past` returns `totalDepartmentStudents: 0`, `attendanceRate: 0` and empty distribution arrays for every event.
- The dashboard's "attended" count counts students who attended **any** event, not the selected event.

### 14. Validate IDs and handle errors in every route
Passing an invalid MongoDB ID (e.g. `/api/reports/abc/accept`) throws an unhandled `CastError` and returns a generic 500. Routes also call `req.json()` without a `try/catch`, so a bad body crashes the request. Validate IDs with `mongoose.isValidObjectId` and return clear `400` errors.

### 15. Record who submitted an event request
`EventRequest.requestedBy` is never filled in. Set it from the logged-in user in `/api/events/request`.

### 16. Store report attachments
The student report form accepts file uploads, but nothing stores the files. Use a storage service such as Vercel Blob and save the URLs in `Report.attachments`.

### 17. Fix horizontal scrolling on phones
Tested at 390 px width (iPhone 14 size):
- `/dashboard/attendance` scrolls **316 px** sideways. Wrap the records table in a container with `overflow-x-auto`.
- `/dashboard` scrolls **67 px** sideways.
- On mobile, the menu button overlaps the page title. Add left padding to the header on small screens.

### 18. Prevent brute-force attacks on login
Add rate limiting to `/api/auth/council-login` and `/api/auth/student-login` (for example, a limit per IP using Vercel's firewall or a small in-database counter).

### 19. Add tests
There are no tests. Start with the API routes (logins, middleware auth, RFID scan, student reports) using Vitest and an in-memory MongoDB, and run `npm run lint` and `npm run build` on every PR with GitHub Actions.

---

## 🟢 P3: Low (polish and maintenance)

20. **Remove leftover demo code.** Delete mock data, commented-out `fetch` examples and `alert(...)` calls as each page is connected. Replace `alert` with in-page messages or toasts.
21. **Clear lint warnings.** There are 6 warnings: unused variables in the attendance and student reports pages, an unused `Student` import, and an `<img>` that should be `next/image` in `dashboard/reports/page.tsx`. Note: the `Student` import in the records route registers the model for `.populate("student")`, so keep it or replace it with an explicit side-effect import.
22. **Remove duplicate mock rows** in `src/app/dashboard/attendance/page.tsx` (record `id: '2'` repeats `year`, `section` and `timestamp`).
23. **Update the root README.** Its project-structure section is out of date: it lists `tailwind.config.ts` and docs files at the root, and it's missing the student pages, `src/app/api`, `src/models` and `src/lib`. "Backend API Integration" is listed as not started, but the API exists.
24. **Plan the Next.js 16 upgrade.** `npm audit` still reports a `postcss` advisory inside Next.js 15 that is only fixed in Next 16. It only affects the build, not the running site, but Next 16 also renames `middleware.ts` to `proxy.ts`, so plan the upgrade as one task.
25. **Accessibility pass.** Check color contrast on the bright blue (`#0000FF`) login background, add labels to icon-only buttons (menu, notifications), and make sure the RFID input works with a keyboard and screen readers.
26. **Make the notification bell work.** The bell on the dashboard header has no function yet. Connect it to new reports or event-request updates, or remove it.

---

## Suggested order of work

1. **~~P0 tasks 1, 2 and 4.~~** These are small, contained changes, and the site shouldn't be shared until they're done.
2. **~~P0 task 3 and P1 task 5.~~**
3. **P1 tasks 8 and 10.** Without events and students in the database, the rest of the app has no data to show.
4. **P1 tasks 6, 7 and 9.** Connect the pages one at a time.
5. P2, then P3.

## Branch workflow

Work happens on the `develop-cybsync` branch. Open a pull request from `develop-cybsync` into `main` to release changes. `main` deploys to production on Vercel, and other branches get Vercel preview URLs.
