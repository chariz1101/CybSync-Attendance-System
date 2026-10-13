# Council Login and Sessions

This guide covers how council members log in, how sessions work for **both** council and student accounts, and how pages and API routes are protected. Student sign-in (Google + Student ID) is described in `STUDENT_LOGIN_BACKEND_INTEGRATION.md`.

## Council login

| Part | File |
| --- | --- |
| Login page | `src/app/page.tsx` (`/`) |
| Login API | `src/app/api/auth/council-login/route.ts` |
| Account model | `src/models/User.ts` (`username`, `passwordHash`, `name`, `role: "council" \| "admin"`) |
| Create accounts / reset passwords | `npm run seed:admin` (`scripts/seed-admin.ts`), see the root `README.md` |

### `POST /api/auth/council-login`

Public route.

**Request body**

```json
{ "username": "cictsc", "password": "••••••••", "rememberMe": false }
```

**Success (200)**: sets the session cookie (see below) and returns:

```json
{
  "success": true,
  "user": { "id": "665f...", "username": "cictsc", "role": "council", "name": "CICT Student Council" },
  "message": "Login successful"
}
```

The page then redirects to `/dashboard`.

**Errors**

| Status | Message |
| --- | --- |
| 400 | Username and password are required. |
| 401 | Incorrect username or password. (Same message for an unknown username and a wrong password.) |
| 429 | Too many failed login attempts. Try again in N minutes. |

Passwords are stored as bcrypt hashes and never returned.

## Sessions

Both login routes (council and student) put the login token in a cookie:

| Setting | Value | Why |
| --- | --- | --- |
| Name | `cybsync_session` | |
| `HttpOnly` | yes | Page scripts can't read it, so an XSS bug can't steal it |
| `Secure` | yes in production | Only sent over HTTPS |
| `SameSite` | `Lax` | Not sent on cross-site POSTs, which blocks CSRF |
| Lifetime | Browser session, or **30 days** with "Remember me" | Without "Remember me" the token also expires after `TOKEN_EXPIRY` (default `1d`) |

**Frontend code doesn't handle tokens.** The browser sends the cookie automatically with every same-site `fetch`, so pages just call the API:

```ts
const res = await fetch('/api/dashboard');
```

There's no need to send an `Authorization` header or read anything from `localStorage`/`sessionStorage`. (The proxy still accepts `Authorization: Bearer <token>` for non-browser clients, e.g. a future RFID device.)

### Other auth routes

| Route | Who | What it does |
| --- | --- | --- |
| `POST /api/auth/logout` | anyone | Clears the session cookie |
| `GET /api/auth/me` | any logged-in user | Returns the current user: `{ role, name, username }` for council/admin, or `{ role: "student", name, studentId, course, year, section, email }` |

`src/lib/useCurrentUser.ts` wraps these for pages: `useCurrentUser(loginPath)` loads the current user (and redirects to `loginPath` if the session has expired), and `signOut(loginPath)` logs out. Both sidebars use them.

## What's protected (`src/proxy.ts`)

`proxy.ts` is Next.js 16's name for middleware. It runs before every page and API request listed in its `matcher`.

**Pages**

| Path | Requires | Otherwise |
| --- | --- | --- |
| `/dashboard/*` | admin or organization session | redirect to `/` |
| `/dashboard/accounts` | admin session | organizations are redirected to `/dashboard` |
| `/student-dashboard/*` | student session | redirect to `/student-login` |
| `/` (council login) | — | council/admin already logged in → redirect to `/dashboard` |
| `/student-login` | — | student already logged in → redirect to `/student-dashboard` |

**API routes**

| Path | Requires |
| --- | --- |
| `/api/auth/council-login`, `/api/auth/student-login`, `/api/auth/logout` | nothing (public) |
| `/api/auth/me` | any valid session |
| `/api/student/*` | student session |
| every other `/api/*` | admin or organization session (`role: "council"`) |

A missing or invalid session gets `401`, and the wrong role gets `403`.

**Inside the routes**, `requireStaff()` (`src/lib/staff.ts`) loads the account from the database on every staff request, so a **disabled or deleted account is refused immediately** (`401`), even though its session cookie hasn't expired. Pages that get a `401` end the session and return to the login page. The same helper limits organizations to their own events (`eventFilterFor`, `canUseEvent`) and marks admin-only actions (`{ adminOnly: true }`).

| Route | Who |
| --- | --- |
| `GET/POST /api/accounts`, `PATCH /api/accounts/:id` | Admin: list, create, rename, reset password, disable/enable, change role (`{ name?, password?, status?, role? }`). Admins can't disable or demote themselves. | For allowed requests, the proxy sets `x-user-id` and `x-user-role` from the verified token (and always strips any the client sent), so API routes can trust them.

## Security notes

- **Login rate limiting** (`src/lib/rateLimit.ts`): after **5 failed attempts for one account** or **20 from one IP address** within 15 minutes, logins are refused with `429` ("Try again in N minutes") until the window ends, even with the right password. A successful login resets that account's counter. Counters live in the `loginattempts` collection and MongoDB deletes them automatically when they expire. Student logins count a failed Google sign-in or a Student ID that doesn't match.
- **Changing `JWT_SECRET`** logs everyone out immediately, which is useful if a token is ever leaked.
- **Deleting a user or student** doesn't end their current session until it expires, but `/api/auth/me` returns `401` for them, so the sidebar sends them back to the login page.
