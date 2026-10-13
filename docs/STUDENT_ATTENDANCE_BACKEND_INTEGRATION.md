# Student Attendance - Backend Integration Guide

This document describes how to integrate the Student Attendance page with your backend API.

## Overview

The Student Attendance page provides:

- Detailed attendance statistics (total events, late count, on-time count)
- Complete attendance history with status
- A link to the Reports page for excuse letters and attendance discrepancies

> **Students can't check themselves in.** Attendance is recorded only by the council's RFID scanner (`POST /api/attendance/scan`). The old student check-in endpoint (`POST /api/student/check-in`) and the event-code box were removed.

## Data Structure

### 1. Get Attendance Data

#### API Endpoint

```
GET /api/student/attendance
```

#### Request Headers

```json
{
  "Authorization": "Bearer {studentToken}",
  "Content-Type": "application/json"
}
```

#### Response Format

```typescript
interface AttendanceRecord {
  id: string;
  type: string; // e.g., "[AM, Sign In]", "[PM, Sign Out]"
  event: string; // Event name
  date: string; // Formatted date (e.g., "January 23, 2026")
  time: string; // Time of check-in (e.g., "7:01")
  status: "on-time" | "late" | "excused";
}

interface StudentAttendanceResponse {
  stats: {
    totalEvents: number; // Total events attended
    lateAttendance: number; // Count of late attendances
    onTimeAttendance: number; // Count of on-time attendances
  };
  attendanceHistory: AttendanceRecord[];
}
```

#### Example Response

```json
{
  "stats": {
    "totalEvents": 12,
    "lateAttendance": 4,
    "onTimeAttendance": 5
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
    },
    {
      "id": "att_003",
      "type": "[PM, Sign Out]",
      "event": "Tech Summit 2026",
      "date": "March 15, 2026",
      "time": "16:30",
      "status": "excused"
    }
  ]
}
```

## Implementation Steps

### 1. Get Attendance Data

```typescript
import { useEffect, useState } from "react";

export default function StudentAttendance() {
  const [attendanceData, setAttendanceData] =
    useState<StudentAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setIsLoading(true);
        const token =
          localStorage.getItem("studentToken") ||
          sessionStorage.getItem("studentToken");

        const response = await fetch("/api/student/attendance", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }

        const data = await response.json();
        setAttendanceData(data);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);
}
```

## Backend Logic Examples

### 1. Get Attendance Data (Python/Flask)

```python
from flask import request, jsonify
from datetime import datetime

@app.route('/api/student/attendance', methods=['GET'])
@require_student_auth
def get_student_attendance():
    student_id = request.student_id

    # Get total events attended
    total_events = db.query("""
        SELECT COUNT(DISTINCT event_id)
        FROM attendance
        WHERE student_id = ?
    """, student_id).scalar()

    # Get attendance counts by status
    stats = db.query("""
        SELECT
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
            COUNT(CASE WHEN status = 'on-time' THEN 1 END) as on_time_count
        FROM attendance
        WHERE student_id = ?
    """, student_id).first()

    # Get attendance history
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
    """, student_id)

    return jsonify({
        'stats': {
            'totalEvents': total_events,
            'lateAttendance': stats.late_count,
            'onTimeAttendance': stats.on_time_count
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
        ]
    })
```

## Database Schema

```sql
-- Events table
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  grace_period_minutes INT DEFAULT 15,
  status VARCHAR, -- 'upcoming', 'active', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records
CREATE TABLE attendance (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR REFERENCES students(id),
  event_id VARCHAR REFERENCES events(id),
  check_in_time TIMESTAMP NOT NULL,
  check_out_time TIMESTAMP,
  status VARCHAR, -- 'on-time', 'late', 'excused'
  type VARCHAR, -- 'AM', 'PM'
  action VARCHAR, -- 'Sign In', 'Sign Out'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, event_id, type, action) -- Prevent duplicate scans
);
```

## Status Types

### 1. On Time

- Student was scanned in before or within the grace period of event start time
- Color: Green

### 2. Late

- Student was scanned in after the grace period
- Color: Red

### 3. Excused

- Student was absent but submitted an excuse letter through the Reports page
- Requires council approval
- Color: Blue

## UI Features

### Stats Cards

- **Total Number of Events**: Blue icon, count of all events attended
- **Late Attendance**: Red icon, count of late check-ins
- **On Time Attendance**: Green icon, count of on-time check-ins

### Attendance Table

- Scrollable list of all attendance records
- Color-coded status indicators
- Sorted by most recent first

### Report a Problem

- Short note that attendance comes from the council's RFID scanner
- "Submit a Report" button linking to `/student-dashboard/reports`

## Error Handling

- **401 Unauthorized**: Missing, invalid or expired token
- **403 Forbidden**: Token isn't a student token
- **500 Internal Server Error**: Database or server error

## Notes

- Students only ever see their own records. The student is identified from the login token, never from the request.
- If a record is wrong or missing, the student submits a report and the council fixes it.
