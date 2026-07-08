# Student Attendance - Backend Integration Guide

This document describes how to integrate the Student Attendance page with your backend API.

## Overview

The Student Attendance page provides:

- Detailed attendance statistics (total events, late count, on-time count)
- Complete attendance history with status
- Event check-in functionality using event codes

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

### 2. Event Check-In

#### API Endpoint

```
POST /api/student/check-in
```

#### Request Headers

```json
{
  "Authorization": "Bearer {studentToken}",
  "Content-Type": "application/json"
}
```

#### Request Body

```typescript
interface CheckInRequest {
  eventCode: string; // Unique event code provided by organizers
}
```

#### Example Request

```json
{
  "eventCode": "UNI2026-DAY1-AM"
}
```

#### Success Response (200 OK)

```typescript
interface CheckInResponse {
  success: true;
  message: string;
  eventName: string;
  checkInTime: string;
  status: "on-time" | "late";
}
```

#### Example Success Response

```json
{
  "success": true,
  "message": "Successfully checked in",
  "eventName": "University Days 2026 - Day 1",
  "checkInTime": "07:15",
  "status": "on-time"
}
```

#### Error Responses

**Invalid Event Code (404):**

```json
{
  "success": false,
  "message": "Event code not found or expired"
}
```

**Already Checked In (409):**

```json
{
  "success": false,
  "message": "You have already checked in to this event"
}
```

**Event Not Active (400):**

```json
{
  "success": false,
  "message": "This event is not currently accepting check-ins"
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

### 2. Event Check-In

```typescript
const handleCheckIn = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!eventCode.trim()) {
    alert("Please enter an event code");
    return;
  }

  setIsSubmitting(true);

  try {
    const token =
      localStorage.getItem("studentToken") ||
      sessionStorage.getItem("studentToken");
    const response = await fetch("/api/student/check-in", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventCode }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Successfully checked in to ${data.eventName}!`);
      setEventCode("");
      // Refresh attendance data
      fetchAttendanceData();
    } else {
      alert(
        data.message || "Failed to check in. Please verify the event code."
      );
    }
  } catch (error) {
    console.error("Check-in error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
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

### 2. Event Check-In (Python/Flask)

```python
from datetime import datetime, timedelta

@app.route('/api/student/check-in', methods=['POST'])
@require_student_auth
def student_check_in():
    student_id = request.student_id
    data = request.get_json()
    event_code = data.get('eventCode')

    # Validate event code
    if not event_code:
        return jsonify({
            'success': False,
            'message': 'Event code is required'
        }), 400

    # Find event by code
    event = db.query("""
        SELECT id, name, event_date, start_time, status, grace_period_minutes
        FROM events
        WHERE code = ? AND status = 'active'
    """, event_code)

    if not event:
        return jsonify({
            'success': False,
            'message': 'Event code not found or expired'
        }), 404

    # Check if already checked in
    existing_attendance = db.query("""
        SELECT id FROM attendance
        WHERE student_id = ? AND event_id = ?
    """, student_id, event.id)

    if existing_attendance:
        return jsonify({
            'success': False,
            'message': 'You have already checked in to this event'
        }), 409

    # Determine status (on-time or late)
    check_in_time = datetime.now()
    event_start = datetime.combine(event.event_date, event.start_time)
    grace_period = timedelta(minutes=event.grace_period_minutes or 15)
    cutoff_time = event_start + grace_period

    status = 'on-time' if check_in_time <= cutoff_time else 'late'

    # Record attendance
    db.execute("""
        INSERT INTO attendance (student_id, event_id, check_in_time, status, type, action)
        VALUES (?, ?, ?, ?, 'AM', 'Sign In')
    """, student_id, event.id, check_in_time, status)

    return jsonify({
        'success': True,
        'message': 'Successfully checked in',
        'eventName': event.name,
        'checkInTime': check_in_time.strftime('%H:%M'),
        'status': status
    }), 200
```

### 3. Event Check-In (Node.js/Express)

```javascript
app.post("/api/student/check-in", requireStudentAuth, async (req, res) => {
  const studentId = req.studentId;
  const { eventCode } = req.body;

  // Validate event code
  if (!eventCode) {
    return res.status(400).json({
      success: false,
      message: "Event code is required",
    });
  }

  try {
    // Find event by code
    const event = await db.query(
      `SELECT id, name, event_date, start_time, status, grace_period_minutes
       FROM events
       WHERE code = ? AND status = 'active'`,
      [eventCode]
    );

    if (!event || event.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event code not found or expired",
      });
    }

    const eventData = event[0];

    // Check if already checked in
    const existingAttendance = await db.query(
      "SELECT id FROM attendance WHERE student_id = ? AND event_id = ?",
      [studentId, eventData.id]
    );

    if (existingAttendance.length > 0) {
      return res.status(409).json({
        success: false,
        message: "You have already checked in to this event",
      });
    }

    // Determine status (on-time or late)
    const checkInTime = new Date();
    const eventStart = new Date(
      `${eventData.event_date} ${eventData.start_time}`
    );
    const gracePeriod = (eventData.grace_period_minutes || 15) * 60 * 1000; // Convert to ms
    const cutoffTime = new Date(eventStart.getTime() + gracePeriod);

    const status = checkInTime <= cutoffTime ? "on-time" : "late";

    // Record attendance
    await db.execute(
      `INSERT INTO attendance (student_id, event_id, check_in_time, status, type, action)
       VALUES (?, ?, ?, ?, 'AM', 'Sign In')`,
      [studentId, eventData.id, checkInTime, status]
    );

    res.status(200).json({
      success: true,
      message: "Successfully checked in",
      eventName: eventData.name,
      checkInTime: checkInTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      status: status,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during check-in",
    });
  }
});
```

## Database Schema

```sql
-- Events table with check-in codes
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  code VARCHAR UNIQUE NOT NULL, -- Unique check-in code
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
  UNIQUE(student_id, event_id) -- Prevent duplicate check-ins
);
```

## Event Code Generation

Event codes should be:

- Unique and easy to type
- Time-limited (expire after event)
- Format example: `UNI2026-DAY1-AM`, `TECH-SUM-2026`

```python
import random
import string

def generate_event_code(event_name, event_date):
    """Generate a unique event code"""
    # Extract abbreviation from event name
    words = event_name.upper().split()[:3]
    abbrev = ''.join(word[:3] for word in words)

    # Add date component
    date_str = event_date.strftime('%y%m%d')

    # Add random component for uniqueness
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

    return f"{abbrev}-{date_str}-{random_str}"
```

## Status Types

### 1. On Time

- Student checked in before or within grace period of event start time
- Color: Green

### 2. Late

- Student checked in after grace period
- Color: Red

### 3. Excused

- Student was absent but submitted valid excuse
- Requires admin approval
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

### Event Check-In

- Text input for event code
- Blue "Enter" button
- Disabled state during submission
- Success/error messages

## Error Handling

- **400 Bad Request**: Invalid or missing event code
- **401 Unauthorized**: Invalid or expired token
- **404 Not Found**: Event code doesn't exist
- **409 Conflict**: Already checked in to event
- **500 Internal Server Error**: Database or server error

## Notes

- Event codes are case-insensitive
- Grace period is configurable per event (default: 15 minutes)
- Check-in is only allowed when event status is 'active'
- Duplicate check-ins are prevented at database level
- Attendance data refreshes after successful check-in
- Students can only check in to their own attendance (enforced by token)
