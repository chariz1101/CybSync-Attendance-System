# Dashboard Backend Integration Guide

## Overview

The Event Dashboard is located at `src/app/dashboard/page.tsx` and displays real-time attendance data for university events.

## Data Structure

The dashboard expects data in the following TypeScript interface:

```typescript
interface DashboardData {
  event: {
    name: string;
    date: string;
  };
  stats: {
    totalDepartmentStudents: number;
    totalStudentsAttended: number;
    attendanceRate: number;
  };
  courseDistribution: {
    course: string;
    value: number;
    color: string;
  }[];
  yearCourseDistribution: {
    year: string;
    courseA: number;
    courseB: number;
  }[];
  upcomingEvents: {
    id: string;
    name: string;
    date: string;
  }[];
}
```

## API Integration Example

### 1. Fetch Dashboard Data

Replace the static data with an API call:

```typescript
"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!dashboardData) return null;

  // Rest of component...
}
```

### 2. Real-time Updates

For real-time attendance updates, use polling or WebSocket:

#### Option A: Polling (Simple)

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchDashboardData();
  }, 30000); // Refresh every 30 seconds

  return () => clearInterval(interval);
}, []);
```

#### Option B: WebSocket (Advanced)

```typescript
useEffect(() => {
  const ws = new WebSocket("wss://your-api.com/dashboard/live");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setDashboardData(data);
  };

  return () => ws.close();
}, []);
```

## API Endpoints

### GET `/api/dashboard`

Fetch complete dashboard data for the current or selected event.

**Headers:**

```
Authorization: Bearer {jwt-token}
```

**Query Parameters:**

- `eventId` (optional): Specific event ID. If not provided, returns current event.

**Response (200):**

```json
{
  "event": {
    "name": "University Pagirimaw 2025",
    "date": "September 12, 2025"
  },
  "stats": {
    "totalDepartmentStudents": 1000,
    "totalStudentsAttended": 800,
    "attendanceRate": 80
  },
  "courseDistribution": [
    { "course": "CS", "value": 30, "color": "#EF4444" },
    { "course": "IT", "value": 25, "color": "#06B6D4" },
    { "course": "IS", "value": 20, "color": "#A855F7" },
    { "course": "EMC", "value": 15, "color": "#22C55E" },
    { "course": "BLIS", "value": 10, "color": "#F97316" }
  ],
  "yearCourseDistribution": [
    { "year": "1st", "courseA": 34, "courseB": 21 },
    { "year": "2nd", "courseA": 29, "courseB": 31 },
    { "year": "3rd", "courseA": 26, "courseB": 29 },
    { "year": "4th", "courseA": 34, "courseB": 21 }
  ],
  "upcomingEvents": [
    {
      "id": "evt_001",
      "name": "University Pagirimaw",
      "date": "September 12, 2025"
    }
  ]
}
```

**Error Response (401):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### GET `/api/dashboard/events/upcoming`

Fetch upcoming events only.

**Response (200):**

```json
{
  "events": [
    {
      "id": "evt_001",
      "name": "University Pagirimaw",
      "date": "September 12, 2025",
      "location": "Main Auditorium",
      "expectedAttendees": 1000
    }
  ]
}
```

## Sidebar Integration

### User Information

The Sidebar component accepts user props:

```typescript
<Sidebar userName="CICTSC" userRole="Student Council Account" />
```

Fetch user data from authentication context or API:

```typescript
const [user, setUser] = useState(null);

useEffect(() => {
  async function fetchUserInfo() {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    const data = await response.json();
    setUser(data);
  }
  fetchUserInfo();
}, []);

// Pass to Sidebar
<Sidebar userName={user?.name} userRole={user?.role} />;
```

### Logout Functionality

The Sign Out button in the Sidebar triggers `handleSignOut()` (line 23-27 in `Sidebar.tsx`):

```typescript
const handleSignOut = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    localStorage.removeItem("token");
    window.location.href = "/";
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
```

## Navigation Routes

The sidebar links to these routes (create these pages):

- `/dashboard` - Main dashboard (✅ Created)
- `/dashboard/attendance` - Attendance management (❌ Not created)
- `/dashboard/request` - Request handling (❌ Not created)
- `/dashboard/past-events` - Historical events (❌ Not created)
- `/dashboard/reports` - Reports generation (❌ Not created)

## Chart Data Format

### Course Distribution (Donut Chart)

```typescript
courseDistribution: [
  { course: "CS", value: 30, color: "#EF4444" },
  { course: "IT", value: 25, color: "#06B6D4" },
  // ... more courses
];
```

- `value`: Percentage or count
- `color`: Hex color code for the chart segment

### Year & Course Distribution (Bar Chart)

```typescript
yearCourseDistribution: [
  { year: "1st", courseA: 34, courseB: 21 },
  { year: "2nd", courseA: 29, courseB: 31 },
  // ... more years
];
```

- `courseA`, `courseB`: Student counts for different course categories
- You can extend this to support more courses by modifying the component

## Adding Chart Libraries (Optional)

For production, consider using chart libraries:

### Option 1: Chart.js with react-chartjs-2

```bash
npm install chart.js react-chartjs-2
```

### Option 2: Recharts

```bash
npm install recharts
```

### Option 3: ApexCharts

```bash
npm install react-apexcharts apexcharts
```

Then replace the placeholder SVG charts with the library components.

## Mobile Responsiveness

The dashboard is fully responsive:

- **Desktop (lg)**: Sidebar always visible, content has left margin
- **Tablet/Mobile**: Sidebar hidden by default, hamburger menu to toggle
- **Breakpoints**: Uses Tailwind's default breakpoints (sm: 640px, md: 768px, lg: 1024px)

## Security Considerations

1. **Authentication**: Protect the dashboard route with authentication middleware
2. **Authorization**: Verify user has council/admin role
3. **API Security**: Use HTTPS and JWT tokens
4. **Data Validation**: Validate all API responses
5. **XSS Protection**: Sanitize any user-generated content

## Performance Optimization

1. **Data Caching**: Cache dashboard data for 30-60 seconds
2. **Lazy Loading**: Load charts only when visible
3. **Pagination**: For upcoming events, implement pagination if list is long
4. **Compression**: Use gzip/brotli compression for API responses

## Testing Checklist

- [ ] Load dashboard with valid token
- [ ] Handle expired token gracefully
- [ ] Display loading state during data fetch
- [ ] Show error message on API failure
- [ ] Verify stat calculations are correct
- [ ] Test chart rendering with various data sets
- [ ] Verify mobile menu works correctly
- [ ] Test logout functionality
- [ ] Verify real-time updates (if implemented)
- [ ] Check performance with large datasets

## Next Steps

1. Create authentication middleware for protected routes
2. Implement remaining navigation pages (Attendance, Request, Past Events, Reports)
3. Set up API endpoints for dashboard data
4. Integrate actual chart library for better visualizations
5. Add export/download functionality for reports
6. Implement event filtering and search
7. Add notification system for real-time alerts
