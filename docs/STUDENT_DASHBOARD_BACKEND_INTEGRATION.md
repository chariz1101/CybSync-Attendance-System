# Student Dashboard - Backend Integration Guide

This document describes how to integrate the Student Dashboard page with your backend API.

## Overview

The Student Dashboard displays personalized attendance statistics and history for individual students, including:

- Total number of events attended
- Late attendance rate
- On-time attendance rate
- Complete attendance history with status
- Upcoming events

## Data Structure

### API Endpoint

```
GET /api/student/dashboard
```

### Request Headers

```json
{
  "Authorization": "Bearer {studentToken}",
  "Content-Type": "application/json"
}
```

### Response Format

```typescript
interface AttendanceRecord {
  id: string;
  type: string; // e.g., "[AM, Sign In]", "[PM, Sign Out]"
  event: string; // Event name
  date: string; // Formatted date (e.g., "January 23, 2026")
  time: string; // Time of check-in (e.g., "7:01")
  status: "on-time" | "late";
}

interface UpcomingEvent {
  id: string;
  name: string;
  date: string; // Formatted date
}

interface StudentDashboardResponse {
  stats: {
    totalEvents: number; // Total events student has attended
    lateAttendanceRate: number; // Percentage (0-100)
    onTimeAttendanceRate: number; // Percentage (0-100)
  };
  attendanceHistory: AttendanceRecord[];
  upcomingEvents: UpcomingEvent[];
}
```

### Example Response

```json
{
  "stats": {
    "totalEvents": 12,
    "lateAttendanceRate": 20,
    "onTimeAttendanceRate": 80
  },
  "attendanceHistory": [
    {
      "id": "att_001",
      "type": "[AM, Sign In]",
      "event": "University Days 2026 - Day 1",
      "date": "January 23, 2026",
      "time": "7:01",
      "status": "on-time"
    },
    {
      "id": "att_002",
      "type": "[AM, Sign In]",
      "event": "University Pagirimaw 2025",
      "date": "September 12, 2025",
      "time": "8:15",
      "status": "late"
    }
  ],
  "upcomingEvents": [
    {
      "id": "evt_001",
      "name": "University Pagirimaw",
      "date": "September 12, 2025"
    },
    {
      "id": "evt_002",
      "name": "Tech Summit 2026",
      "date": "March 15, 2026"
    }
  ]
}
```

## Implementation Steps

### 1. Update the Component

In `src/app/student-dashboard/page.tsx`, uncomment and configure the API call:

```typescript
import { useEffect } from "react";

export default function StudentDashboard() {
  const [dashboardData, setDashboardData] =
    useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const token =
          localStorage.getItem("studentToken") ||
          sessionStorage.getItem("studentToken");

        if (!token) {
          window.location.href = "/student-login";
          return;
        }

        const response = await fetch("/api/student/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem("studentToken");
          sessionStorage.removeItem("studentToken");
          window.location.href = "/student-login";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // ... rest of component
}
```

### 2. Backend Requirements

Your backend should:

1. **Authenticate**: Verify the JWT token from the Authorization header
2. **Extract Student ID**: Get student ID from the decoded token
3. **Fetch Attendance Data**: Query attendance records for the student
4. **Calculate Statistics**: Compute late/on-time rates
5. **Get Upcoming Events**: Fetch future events the student is expected to attend
6. **Format Response**: Return data in the specified format

### 3. Database Schema

```sql
-- Attendance records table
CREATE TABLE attendance (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR REFERENCES students(id),
  event_id VARCHAR REFERENCES events(id),
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  status VARCHAR, -- 'on-time', 'late', 'absent'
  type VARCHAR, -- 'AM', 'PM'
  action VARCHAR, -- 'Sign In', 'Sign Out'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR, -- 'upcoming', 'active', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table (reference)
CREATE TABLE students (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  course VARCHAR,
  year VARCHAR,
  section VARCHAR
);
```

### 4. Backend Logic Example (Python/Flask)

```python
from flask import request, jsonify
from functools import wraps
import jwt
from datetime import datetime

@app.route('/api/student/dashboard', methods=['GET'])
@require_student_auth
def get_student_dashboard():
    student_id = request.student_id

    # Get total events attended
    total_events = db.query("""
        SELECT COUNT(DISTINCT event_id)
        FROM attendance
        WHERE student_id = ? AND status IN ('on-time', 'late')
    """, student_id).scalar()

    # Get attendance statistics
    attendance_stats = db.query("""
        SELECT
            COUNT(CASE WHEN status = 'on-time' THEN 1 END) as on_time_count,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
            COUNT(*) as total_count
        FROM attendance
        WHERE student_id = ? AND status IN ('on-time', 'late')
    """, student_id).first()

    # Calculate percentages
    total_count = attendance_stats.total_count or 1  # Avoid division by zero
    on_time_rate = round((attendance_stats.on_time_count / total_count) * 100, 1)
    late_rate = round((attendance_stats.late_count / total_count) * 100, 1)

    # Get attendance history (most recent first)
    attendance_history = db.query("""
        SELECT
            a.id,
            CONCAT('[', a.type, ', ', a.action, ']') as type,
            e.name as event,
            a.check_in_time,
            a.status
        FROM attendance a
        JOIN events e ON a.event_id = e.id
        WHERE a.student_id = ?
        ORDER BY a.check_in_time DESC
        LIMIT 20
    """, student_id)

    # Get upcoming events
    upcoming_events = db.query("""
        SELECT id, name, event_date
        FROM events
        WHERE status = 'upcoming'
        AND event_date >= CURRENT_DATE
        ORDER BY event_date ASC
        LIMIT 10
    """)

    # Format response
    return jsonify({
        'stats': {
            'totalEvents': total_events,
            'lateAttendanceRate': late_rate,
            'onTimeAttendanceRate': on_time_rate
        },
        'attendanceHistory': [
            {
                'id': str(record.id),
                'type': record.type,
                'event': record.event,
                'date': record.check_in_time.strftime('%B %d, %Y'),
                'time': record.check_in_time.strftime('%H:%M'),
                'status': record.status
            }
            for record in attendance_history
        ],
        'upcomingEvents': [
            {
                'id': str(event.id),
                'name': event.name,
                'date': event.event_date.strftime('%B %d, %Y')
            }
            for event in upcoming_events
        ]
    })
```

### 5. Backend Logic Example (Node.js/Express)

```javascript
const jwt = require("jsonwebtoken");

// Middleware to verify student token
const requireStudentAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Token is missing" });
  }

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);

    if (payload.role !== "student") {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.studentId = payload.student_id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

app.get("/api/student/dashboard", requireStudentAuth, async (req, res) => {
  const studentId = req.studentId;

  try {
    // Get total events attended
    const totalEventsResult = await db.query(
      `SELECT COUNT(DISTINCT event_id) as total 
       FROM attendance 
       WHERE student_id = ? AND status IN ('on-time', 'late')`,
      [studentId]
    );
    const totalEvents = totalEventsResult[0].total;

    // Get attendance statistics
    const statsResult = await db.query(
      `SELECT 
        SUM(CASE WHEN status = 'on-time' THEN 1 ELSE 0 END) as on_time_count,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
        COUNT(*) as total_count
       FROM attendance
       WHERE student_id = ? AND status IN ('on-time', 'late')`,
      [studentId]
    );

    const stats = statsResult[0];
    const totalCount = stats.total_count || 1;
    const onTimeRate = Math.round((stats.on_time_count / totalCount) * 100);
    const lateRate = Math.round((stats.late_count / totalCount) * 100);

    // Get attendance history
    const attendanceHistory = await db.query(
      `SELECT 
        a.id,
        CONCAT('[', a.type, ', ', a.action, ']') as type,
        e.name as event,
        a.check_in_time,
        a.status
       FROM attendance a
       JOIN events e ON a.event_id = e.id
       WHERE a.student_id = ?
       ORDER BY a.check_in_time DESC
       LIMIT 20`,
      [studentId]
    );

    // Get upcoming events
    const upcomingEvents = await db.query(
      `SELECT id, name, event_date
       FROM events
       WHERE status = 'upcoming' 
       AND event_date >= CURDATE()
       ORDER BY event_date ASC
       LIMIT 10`
    );

    // Format response
    res.json({
      stats: {
        totalEvents: totalEvents,
        lateAttendanceRate: lateRate,
        onTimeAttendanceRate: onTimeRate,
      },
      attendanceHistory: attendanceHistory.map((record) => ({
        id: record.id.toString(),
        type: record.type,
        event: record.event,
        date: new Date(record.check_in_time).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: new Date(record.check_in_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        }),
        status: record.status,
      })),
      upcomingEvents: upcomingEvents.map((event) => ({
        id: event.id.toString(),
        name: event.name,
        date: new Date(event.event_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "An error occurred" });
  }
});
```

## Status Determination Logic

The attendance status ("on-time" or "late") should be determined based on:

1. **Event Start Time**: Compare check-in time with event start time
2. **Grace Period**: Optional grace period (e.g., 15 minutes) for on-time status
3. **Cutoff Time**: Time after which attendance is marked as late

Example logic:

```python
def determine_attendance_status(check_in_time, event_start_time, grace_period_minutes=15):
    """
    Determine if attendance is on-time or late

    Args:
        check_in_time: Timestamp when student checked in
        event_start_time: Timestamp when event starts
        grace_period_minutes: Minutes after start time still considered on-time

    Returns:
        'on-time' or 'late'
    """
    grace_period = timedelta(minutes=grace_period_minutes)
    cutoff_time = event_start_time + grace_period

    if check_in_time <= cutoff_time:
        return 'on-time'
    else:
        return 'late'
```

## Error Handling

Handle these common errors:

- **401 Unauthorized**: Token is missing, invalid, or expired
- **403 Forbidden**: Student doesn't have permission to access data
- **404 Not Found**: Student or attendance records not found
- **500 Internal Server Error**: Database or server error

## UI Implementation

### Stats Cards

- **Total Number of Events**: Count of unique events attended
- **Late Attendance Rate**: Red icon, percentage of late check-ins
- **On Time Attendance Rate**: Green icon, percentage of on-time check-ins

### Attendance Overview Table

- **Type**: Shows check-in/check-out type (e.g., "[AM, Sign In]")
- **Event**: Event name
- **Date**: Formatted date
- **Time**: Check-in time
- **Status**: Color-coded (Green for "On Time", Red for "Late")

### Upcoming Events

- Simple card list
- Event name and date
- Clickable/hoverable for more details

## Notes

- Attendance history is sorted by most recent first
- Only shows last 20 attendance records (pagination recommended for full history)
- Statistics are calculated in real-time based on attendance records
- On-time rate + Late rate should equal 100% (excluding absences)
- Upcoming events show only future events the student is expected to attend
- Consider implementing pagination for attendance history if there are many records
- Token should be verified on every request for security
- Dashboard should auto-redirect to login if token is invalid/expired
