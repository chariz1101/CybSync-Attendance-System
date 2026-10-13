# Student Login: Backend Integration Guide

## Overview

Students log in with **two things**:

1. their **Student ID** (e.g. `2023M1025`), and
2. their **school Google account** ("Sign in with Google").

The login succeeds only when the Student ID belongs to the same email as the Google account. Knowing someone's Student ID isn't enough to log in as them.

Student accounts are **view-and-report only**:

- ✅ View their own attendance history and stats
- ✅ Submit reports (excuse letters, or attendance discrepancies they noticed)
- ❌ They **cannot** check themselves in to events. Attendance is recorded only by the council's RFID scanner.

## How it works

```
Student                     Browser (student-login page)            Server (/api/auth/student-login)        Google
   |  types Student ID  ─────────▶ |                                          |                                   |
   |  clicks "Sign in with Google" ─▶ Google popup ─────────────────────────────────────────────────────────────▶ |
   |                               | ◀────────────────────────────── ID token (signed JWT with email) ───────────── |
   |                               | POST { studentId, credential } ────────▶ |                                   |
   |                               |                                          | verify token signature + audience ▶|
   |                               |                                          | check email verified + school domain
   |                               |                                          | find Student by studentId
   |                               |                                          | student.email == Google email?
   |                               | ◀── { student } + session cookie ──────── |
   |                               | go to /student-dashboard                 |
```

Code:

| Part | File |
| --- | --- |
| Login page (Student ID field + Google button) | `src/app/student-login/page.tsx` |
| Login API route | `src/app/api/auth/student-login/route.ts` |
| Google token verification | `src/lib/google.ts` |

## API

### `POST /api/auth/student-login`

Public route, so no `Authorization` header is needed.

**Request body**

```json
{
  "studentId": "2023M1025",
  "credential": "<Google ID token from Google Identity Services>",
  "rememberMe": false
}
```

**Success (200)**

```json
{
  "success": true,
  "student": {
    "id": "665f...",
    "studentId": "2023M1025",
    "name": "Juan Dela Cruz",
    "course": "BSCS",
    "year": "3",
    "section": "B",
    "email": "juan.delacruz@<school domain>"
  },
  "message": "Login successful"
}
```

The login token is set as the `cybsync_session` cookie (`HttpOnly`; 30 days with "Remember me", otherwise until the browser closes). Student pages just call the API with `fetch`, and the browser sends the cookie automatically. See "Sessions" in `BACKEND_INTEGRATION.md`.

**Errors**

| Status | Message | When |
| --- | --- | --- |
| 400 | Student ID and Google sign-in are required. | Missing `studentId` or `credential` |
| 401 | Google sign-in failed. Please try again. | Google token is invalid, expired, issued for another app, or the email isn't verified |
| 403 | Please sign in with your school Google account. | The Google account isn't in `ALLOWED_EMAIL_DOMAIN` (e.g. a personal Gmail) |
| 401 | That Student ID doesn't match your Google account. | The ID doesn't exist **or** belongs to a different email. Both cases use the same message so the form can't be used to discover which IDs exist. |
| 403 | Student account is inactive or suspended | `Student.status` isn't `active` |

## What the server checks

1. The Google ID token's signature is valid and was issued for **our** Google client ID (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
2. `email_verified` is true.
3. The token's Workspace domain (`hd`) **and** the email domain both equal `ALLOWED_EMAIL_DOMAIN`.
4. A `Student` with that `studentId` exists and its `email` matches the Google email (case-insensitive).
5. The student's `status` is `active`.

If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` or `ALLOWED_EMAIL_DOMAIN` isn't set, every student login is refused.

## Setup

### 1. Create a Google OAuth client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project. Ideally use one owned by the school or org account, not a personal one.
2. **APIs & Services → OAuth consent screen**: choose **Internal** if the project belongs to the school's Google Workspace (only school accounts can sign in). Otherwise choose **External** and fill in the app name and support email.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add every URL the site runs on, for example:
     - `http://localhost:3000`
     - `https://<your-project>.vercel.app`
     - any custom domain
   - No redirect URIs are needed.
4. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`). It isn't a secret.

> Vercel preview deployments get a new URL for each branch. Google doesn't allow wildcard origins, so test Google sign-in on `localhost` or on the production URL, or add specific preview URLs as needed.

### 2. Set environment variables

Locally in `.env.local`, and in **Vercel → Project → Settings → Environment Variables**:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
ALLOWED_EMAIL_DOMAIN=<your school email domain, e.g. myschool.edu.ph>
```

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is built into the page, so **redeploy after setting or changing it**.

### 3. Make sure student records have the right email

Each `Student` document's `email` must be the student's **school Google email**, because that's what the login matches against. Students whose record has a missing or wrong email can't log in until it's fixed. (Task 10 in `docs/README.md` covers importing students.)

## Testing

- Google sign-in can't be fully automated without a real Google account. To test manually, run `npm run dev` with the two variables set, open `http://localhost:3000/student-login`, enter a Student ID that exists in your database with your school email, and click **Sign in with Google**.
- Try the failure cases too: someone else's Student ID, a personal Gmail account, and an inactive student.
