# Past Events - Backend Integration Guide

This document describes how to integrate the Past Events page with your backend API.

## Overview

The Past Events page displays a list of historical events with detailed analytics for each event. Each event can be expanded to show:

- Attendance statistics (total students, attended, rate)
- Course distribution (donut chart)
- Year and course distribution (bar chart)

## Data Structure

### API Endpoint

```
GET /api/events/past
```

### Request Headers

```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

### Response Format

```typescript
interface CourseDistribution {
  course: string; // e.g., "CS", "IT", "IS", "EMC", "BLIS"
  value: number; // Percentage or count
  color: string; // Hex color code (e.g., "#EF4444")
}

interface YearCourseDistribution {
  year: string; // e.g., "1st", "2nd", "3rd", "4th"
  courseA: number; // Number of students in course section A
  courseB: number; // Number of students in course section B
}

interface EventStats {
  totalDepartmentStudents: number; // Total enrolled students
  totalStudentsAttended: number; // Students who attended
  attendanceRate: number; // Attendance percentage (0-100)
}

interface PastEvent {
  id: string; // Unique event identifier
  name: string; // Event name
  date: string; // Event date (formatted string)
  participants: number; // Total participants
  stats: EventStats;
  courseDistribution: CourseDistribution[];
  yearCourseDistribution: YearCourseDistribution[];
}

interface PastEventsResponse {
  events: PastEvent[];
}
```

### Example Response

```json
{
  "events": [
    {
      "id": "evt_001",
      "name": "University Pagirimaw",
      "date": "September 12, 2025",
      "participants": 800,
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
      ]
    }
  ]
}
```

## Implementation Steps

### 1. Update the Component

In `src/app/dashboard/past-events/page.tsx`, replace the mock data with an API call:

```typescript
import { useEffect } from "react";

export default function PastEvents() {
  const [pastEventsData, setPastEventsData] = useState<PastEventsData>({
    events: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPastEvents = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token"); // Or your auth method

        const response = await fetch("/api/events/past", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch past events");
        }

        const data = await response.json();
        setPastEventsData(data);
      } catch (error) {
        console.error("Error fetching past events:", error);
        setError("Failed to load past events");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPastEvents();
  }, []);

  // Add loading and error states to your render
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // ... rest of component
}
```

### 2. Backend Requirements

Your backend should:

1. **Authentication**: Verify the user's token
2. **Authorization**: Ensure the user has permission to view past events
3. **Data Retrieval**: Query your database for past events
4. **Data Processing**: Calculate statistics, distributions, and attendance rates
5. **Response Formatting**: Format the data according to the interface above

### 3. Database Schema Suggestions

```sql
-- Events table
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  date DATE NOT NULL,
  status VARCHAR NOT NULL, -- 'past', 'upcoming', 'active'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records
CREATE TABLE attendance (
  id VARCHAR PRIMARY KEY,
  event_id VARCHAR REFERENCES events(id),
  student_id VARCHAR REFERENCES students(id),
  attended BOOLEAN,
  course VARCHAR,
  year VARCHAR,
  section VARCHAR,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  course VARCHAR NOT NULL,
  year VARCHAR NOT NULL,
  section VARCHAR
);
```

### 4. Backend Logic Example (Pseudocode)

```python
@app.route('/api/events/past', methods=['GET'])
@require_auth
def get_past_events():
    # Get all past events
    events = db.query("SELECT * FROM events WHERE status = 'past' ORDER BY date DESC")

    result = []
    for event in events:
        # Calculate statistics
        total_students = db.query("SELECT COUNT(*) FROM students WHERE course IN ('CS', 'IT', 'IS', 'EMC', 'BLIS')")
        attended_students = db.query("SELECT COUNT(*) FROM attendance WHERE event_id = ? AND attended = true", event.id)

        # Calculate course distribution
        course_dist = db.query("""
            SELECT course, COUNT(*) as count
            FROM attendance
            WHERE event_id = ? AND attended = true
            GROUP BY course
        """, event.id)

        # Calculate year/section distribution
        year_dist = db.query("""
            SELECT year, section, COUNT(*) as count
            FROM attendance
            WHERE event_id = ? AND attended = true
            GROUP BY year, section
        """, event.id)

        # Format response
        result.append({
            'id': event.id,
            'name': event.name,
            'date': event.date.strftime('%B %d, %Y'),
            'participants': attended_students,
            'stats': {
                'totalDepartmentStudents': total_students,
                'totalStudentsAttended': attended_students,
                'attendanceRate': (attended_students / total_students) * 100
            },
            'courseDistribution': format_course_distribution(course_dist),
            'yearCourseDistribution': format_year_distribution(year_dist)
        })

    return jsonify({'events': result})
```

## Color Coding

Use these hex colors for courses in the donut chart:

- **CS**: `#EF4444` (Red)
- **IT**: `#06B6D4` (Cyan)
- **IS**: `#A855F7` (Purple)
- **EMC**: `#22C55E` (Green)
- **BLIS**: `#F97316` (Orange)

## Error Handling

Handle these common errors:

- **401 Unauthorized**: Token is invalid or expired
- **403 Forbidden**: User doesn't have permission to view past events
- **404 Not Found**: No past events found
- **500 Internal Server Error**: Database or server error

## Testing

Test with various scenarios:

1. Empty events list
2. Single event
3. Multiple events
4. Events with varying attendance rates
5. Missing or incomplete data

## Notes

- Events are displayed in reverse chronological order (most recent first)
- Only one event can be expanded at a time
- Charts are dynamically generated based on data
- All calculations are done on the backend to ensure accuracy
- Frontend handles display and user interaction only
