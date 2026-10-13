# CybSync - Attendance-System

Cyb:Org Attendance System Project

## Tech Stack

- **Next.js 15.5** - React framework with server-side rendering
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **ESLint** - Code linting
- **Turbopack** - Fast bundler

## Getting Started

### Prerequisites

- Node.js 18.17 or later
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
│   ├── app/                    # App Router pages and layouts
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── attendance/     # Attendance tracking
│   │   │   │   └── page.tsx    # Attendance page with RFID
│   │   │   ├── request/        # Event request
│   │   │   │   └── page.tsx    # Event request form
│   │   │   └── page.tsx        # Main dashboard
│   │   ├── layout.tsx          # Root layout component
│   │   ├── page.tsx            # Council login page
│   │   └── globals.css         # Global styles
│   └── components/             # Reusable components
│       ├── Sidebar.tsx         # Dashboard sidebar
│       └── StatCard.tsx        # Statistics card component
├── public/                     # Static assets
├── BACKEND_INTEGRATION.md      # Login backend guide
├── DASHBOARD_BACKEND_INTEGRATION.md  # Dashboard backend guide
├── ATTENDANCE_BACKEND_INTEGRATION.md # Attendance & RFID guide
├── REQUEST_BACKEND_INTEGRATION.md    # Event request guide
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── tailwind.config.ts          # Tailwind CSS configuration
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Completed Features

- ✅ Council Login Page (/)
- ✅ Event Dashboard (/dashboard)
- ✅ Attendance Page (/dashboard/attendance)
- ✅ Request Event Page (/dashboard/request)
- ✅ RFID Scanner Integration
- ✅ Event Request Form with Validation
- ✅ Responsive Sidebar Navigation
- ✅ Real-time Statistics Display
- ✅ Attendance Charts (Donut & Bar)
- ✅ Attendance Records Table
- ✅ Upcoming Events Section
- ✅ Mobile Responsive Design
- ✅ Student Login Page
- ✅ Past Events View

## Features to Implement

- ❌ User Management
- ❌ Backend API Integration
