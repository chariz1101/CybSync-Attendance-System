# CybSync - Attendance-System

Cyb:Org Attendance System Project

## Tech Stack

- **Next.js 16** - React framework with server-side rendering
- **React 19.3** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **ESLint** - Code linting
- **Turbopack** - Fast bundler

## Getting Started

### Prerequisites

- Node.js 20.9 or later
- npm or yarn or pnpm

### Installation

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Create a `.env.local` file (it is git-ignored) for local development:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET=<long random string>
TOKEN_EXPIRY=1d   # optional, defaults to 1d
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com   # student Google sign-in
ALLOWED_EMAIL_DOMAIN=<your school email domain>                # only these accounts can sign in
```

See `env.example` for details, and `docs/STUDENT_LOGIN_BACKEND_INTEGRATION.md` for how to create the Google client ID.

### Creating Council Accounts

There's no sign-up page for council members. Create accounts (or reset a password) from your computer:

```bash
npm run seed:admin
```

It asks for a username, display name, role (`council` or `admin`) and password, and saves the account with the password safely hashed. It uses `MONGODB_URI` from `.env.local`, so to create an account on the **live** site, put the production `MONGODB_URI` (the same one as in Vercel) in `.env.local` first.

- Running it again with an existing username offers to **reset that account's password**.
- Non-interactive use: `SEED_PASSWORD=... npm run seed:admin -- --username cictsc --name "CICT Student Council" --role council`

### Database Upgrades

After pulling an update that changes the database (the PR will say so), run this once against the production database (production `MONGODB_URI` in `.env.local`). It's safe to run more than once:

```bash
npm run db:migrate
```

### Managing Students

Council members import class lists (CSV) and link RFID cards on **Dashboard → Students**. See `docs/STUDENTS.md` for the CSV template and how card linking works.

### Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import this repository. Vercel detects Next.js automatically; keep the default build settings.
3. Under **Environment Variables**, add `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `ALLOWED_EMAIL_DOMAIN` (and `TOKEN_EXPIRY` if you want a different expiry). Also add your Vercel URL to the Google client's **Authorized JavaScript origins**.
4. Click **Deploy**. Every push to the default branch redeploys production, and other branches get preview URLs.

If the database is MongoDB Atlas, allow connections from Vercel under **Network Access** (for example `0.0.0.0/0`, since Vercel does not use fixed IPs on the Hobby plan).

### Linting

```bash
npm run lint
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Council login (/)
│   │   ├── student-login/            # Student login (Google + Student ID)
│   │   ├── dashboard/                # Council pages: dashboard, events, attendance (scanner),
│   │   │                             #   students, request, past-events, reports
│   │   ├── student-dashboard/        # Student pages: dashboard, attendance, reports
│   │   └── api/                      # API routes (auth, events, attendance, students, reports, student/*)
│   ├── components/                   # Sidebars, charts, shared UI
│   ├── lib/                          # Auth/session, validation, stats and formatting helpers
│   ├── models/                       # Mongoose models (User, Student, Event, EventRequest, Attendance, Report, ReportAttachment)
│   └── proxy.ts                      # Login + role checks for pages and API routes
├── scripts/                          # npm run seed:admin, npm run db:migrate
├── public/students-template.csv      # CSV template for importing students
└── docs/                             # Guides and the task list (start with docs/README.md)
```

## Documentation

| Guide | Covers |
| --- | --- |
| [`docs/README.md`](docs/README.md) | Project status and the prioritized task list |
| [`docs/BACKEND_INTEGRATION.md`](docs/BACKEND_INTEGRATION.md) | Council login, sessions, route protection |
| [`docs/STUDENT_LOGIN_BACKEND_INTEGRATION.md`](docs/STUDENT_LOGIN_BACKEND_INTEGRATION.md) | Student Google sign-in and setup |
| [`docs/STUDENTS.md`](docs/STUDENTS.md) | Importing students, linking RFID cards |
| [`docs/EVENTS_AND_ATTENDANCE.md`](docs/EVENTS_AND_ATTENDANCE.md) | Events, approvals, scanning, statistics |
| [`docs/REPORTS.md`](docs/REPORTS.md) | Student excuse letters and discrepancy reports |

## Features

**Council**
- Council/admin login, with sessions kept in a secure cookie
- Events: request, approve (admin), start, end and reopen
- RFID attendance scanning with AM/PM and Sign In/Out, plus CSV export
- Students: CSV class-list import, add/edit, RFID card linking
- Dashboard and past-event statistics with charts
- Review student reports (excuse letters, discrepancies) with attachments

**Students**
- Login with school Google account + Student ID
- View own attendance and stats
- Send excuse letters or discrepancy reports, with photo/PDF attachments

See [`docs/README.md`](docs/README.md) for what's still planned.
