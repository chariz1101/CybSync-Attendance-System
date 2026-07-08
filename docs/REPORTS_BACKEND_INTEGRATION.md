# Reports - Backend Integration Guide

This document describes how to integrate the Reports page with your backend API.

## Overview

The Reports page displays two main sections:

1. **Pending Reports** - Reports that need review and response
2. **Previous Reports** - Reports that have been responded to

Each section is collapsible and will display report items when expanded.

## Data Structure

### API Endpoint

```
GET /api/reports
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
interface PendingReport {
  id: string; // Unique report identifier
  studentName: string; // Full name of the student (e.g., "Dela Cruz, Juan Felipe J.")
  studentId: string; // Student ID number (e.g., "2022M0000")
  course: string; // Course code (e.g., "BSCS")
  year: string; // Year level (e.g., "4A")
  section: string; // Section (e.g., "AI")
  eventName: string; // Event name (e.g., "University Hinampang [D1-SI-AM]")
  date: string; // Report submission date (formatted as "MM/DD/YYYY")
  time: string; // Report submission time (e.g., "10:59 PM")
  message: string; // Short message preview (truncated with ...)
  fullMessage: string; // Complete message/excuse from the student
  attachments?: string[]; // Array of URLs to uploaded files/images
}

interface PreviousReport {
  id: string; // Unique report identifier
  eventName: string; // Event name (e.g., "University Hinampang [D1-SI-AM]")
  date: string; // Report submission date (formatted as "MM/DD/YYYY")
  message: string; // Short message preview (truncated with ...)
  status: "resolved" | "rejected"; // Report status after action taken
}

interface ReportsResponse {
  pendingReports: PendingReport[];
  previousReports: PreviousReport[];
}
```

### Example Response

```json
{
  "pendingReports": [
    {
      "id": "1",
      "studentName": "Dela Cruz, Juan Felipe J.",
      "studentId": "2022M0000",
      "course": "BSCS",
      "year": "4A",
      "section": "AI",
      "eventName": "University Hinampang [D1-SI-AM]",
      "date": "10/01/2025",
      "time": "10:59 PM",
      "message": "I have submitted a photo proof that I was present during the...",
      "fullMessage": "I have submitted a photo proof that I was present during the University Hinampang.\n\nI sincerely apologize for any inconvenience my absence may cause to the proceedings of the Hinampang. I have already informed my team captain and coach and ensured that my position will be covered by my designated substitute, Anna Reyes.\n\nI understand the importance of the University Hinampang and fully support our school's participation. Thank you for your consideration and kind understanding regarding this matter.",
      "attachments": [
        "https://storage.example.com/uploads/medical_cert_001.jpg",
        "https://storage.example.com/uploads/photo_proof_001.jpg"
      ]
    },
    {
      "id": "2",
      "studentName": "Santos, Maria Clara B.",
      "studentId": "2022M0001",
      "course": "BSIT",
      "year": "3B",
      "section": "BI",
      "eventName": "University Pagirimaw 2025",
      "date": "09/28/2025",
      "time": "09:15 AM",
      "message": "I was unable to attend due to medical reasons. Attached is my...",
      "fullMessage": "I was unable to attend due to medical reasons. Attached is my medical certificate from the hospital.",
      "attachments": [
        "https://storage.example.com/uploads/medical_cert_002.jpg"
      ]
    }
  ],
  "previousReports": [
    {
      "id": "prev_1",
      "eventName": "University Hinampang [D1-SI-AM]",
      "date": "10/01/2025",
      "message": "I have submitted a photo proof that I was present during the...",
      "status": "resolved"
    },
    {
      "id": "prev_2",
      "eventName": "University Pagirimaw 2025",
      "date": "09/28/2025",
      "message": "I was unable to attend due to medical reasons. Attached is my...",
      "status": "rejected"
    }
  ]
}
```

## Implementation Steps

### 1. Update the Component

In `src/app/dashboard/reports/page.tsx`, replace the mock data with an API call:

```typescript
import { useEffect } from "react";

export default function Reports() {
  const [reportsData, setReportsData] = useState<ReportsData>({
    pendingReports: [],
    previousReports: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("token"); // Or your auth method

        const response = await fetch("/api/reports", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        const data = await response.json();
        setReportsData(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setError("Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
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
2. **Authorization**: Ensure the user has permission to view reports
3. **Data Retrieval**: Query your database for reports
4. **Data Filtering**: Separate reports into pending and responded categories
5. **Response Formatting**: Format the data according to the interface above

### 3. Database Schema Suggestions

```sql
-- Reports table
CREATE TABLE reports (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR NOT NULL REFERENCES students(id),
  event_id VARCHAR NOT NULL REFERENCES events(id),
  message TEXT NOT NULL,  -- Short preview message
  full_message TEXT NOT NULL,  -- Complete student excuse/reason
  status VARCHAR NOT NULL, -- 'pending', 'accepted', 'rejected'
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_by VARCHAR REFERENCES users(id),
  responded_at TIMESTAMP,
  rejection_reason TEXT,  -- Reason if rejected
  priority VARCHAR, -- 'low', 'medium', 'high'
  category VARCHAR, -- 'attendance', 'request', 'feedback', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report attachments table
CREATE TABLE report_attachments (
  id VARCHAR PRIMARY KEY,
  report_id VARCHAR NOT NULL REFERENCES reports(id),
  file_url VARCHAR NOT NULL,  -- URL to uploaded file (image, PDF, etc.)
  file_name VARCHAR,
  file_type VARCHAR,  -- 'image', 'pdf', 'document'
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  student_id VARCHAR NOT NULL UNIQUE,
  course VARCHAR NOT NULL,
  year VARCHAR NOT NULL,
  section VARCHAR,
  email VARCHAR NOT NULL UNIQUE
);

-- Events table
CREATE TABLE events (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  date DATE NOT NULL,
  status VARCHAR NOT NULL, -- 'past', 'upcoming', 'active'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (for administrators)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  role VARCHAR NOT NULL
);
```

### 4. Backend Logic Example (Pseudocode)

```python
@app.route('/api/reports', methods=['GET'])
@require_auth
def get_reports():
    user_id = get_current_user_id()

    # Get pending reports with student and event information
    pending = db.query("""
        SELECT
            r.id,
            s.name as student_name,
            s.student_id,
            s.course,
            s.year,
            s.section,
            e.name as event_name,
            r.submitted_at,
            r.message,
            r.full_message
        FROM reports r
        JOIN students s ON r.student_id = s.id
        JOIN events e ON r.event_id = e.id
        WHERE r.status = 'pending'
        ORDER BY r.submitted_at DESC
    """)

    # Get previous reports (responded - either accepted or rejected)
    previous = db.query("""
        SELECT
            r.id,
            e.name as event_name,
            r.submitted_at,
            r.message,
            r.status
        FROM reports r
        JOIN events e ON r.event_id = e.id
        WHERE r.status IN ('accepted', 'rejected')
        ORDER BY r.responded_at DESC
    """)

    # Format response
    return jsonify({
        'pendingReports': [
            {
                'id': str(r.id),
                'studentName': r.student_name,
                'studentId': r.student_id,
                'course': r.course,
                'year': r.year,
                'section': r.section,
                'eventName': r.event_name,
                'date': r.submitted_at.strftime('%m/%d/%Y'),
                'time': r.submitted_at.strftime('%I:%M %p'),
                'message': truncate_message(r.message, 60),  # Truncate for preview
                'fullMessage': r.full_message,
                'attachments': get_report_attachments(r.id)  # Get URLs of uploaded files
            }
            for r in pending
        ],
        'previousReports': [
            {
                'id': str(r.id),
                'eventName': r.event_name,
                'date': r.submitted_at.strftime('%m/%d/%Y'),
                'message': truncate_message(r.message, 60),
                'status': 'resolved' if r.status == 'accepted' else 'rejected'
            }
            for r in previous
        ]
    })

def truncate_message(message, length):
    """Truncate message with ellipsis"""
    if len(message) > length:
        return message[:length] + '...'
    return message

def get_report_attachments(report_id):
    """Get URLs of all attachments for a report"""
    attachments = db.query("""
        SELECT file_url FROM report_attachments
        WHERE report_id = ?
        ORDER BY uploaded_at
    """, report_id)
    return [a.file_url for a in attachments]
```

### 5. Accept a Report

**Endpoint:**

```
POST /api/reports/{reportId}/accept
```

**Request Headers:**

```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Report accepted successfully",
  "reportId": "1"
}
```

**Backend Logic:**

```python
@app.route('/api/reports/<report_id>/accept', methods=['POST'])
@require_auth
def accept_report(report_id):
    user_id = get_current_user_id()

    # Update report status
    db.execute("""
        UPDATE reports
        SET status = 'accepted',
            responded_by = ?,
            responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
    """, user_id, report_id)

    # Optional: Send notification to student
    notify_student(report_id, 'accepted')

    return jsonify({
        'success': True,
        'message': 'Report accepted successfully',
        'reportId': report_id
    })
```

### 6. Reject a Report

**Endpoint:**

```
POST /api/reports/{reportId}/reject
```

**Request Headers:**

```json
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}
```

**Optional Request Body:**

```json
{
  "reason": "Insufficient evidence provided"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Report rejected successfully",
  "reportId": "1"
}
```

**Backend Logic:**

```python
@app.route('/api/reports/<report_id>/reject', methods=['POST'])
@require_auth
def reject_report(report_id):
    user_id = get_current_user_id()
    data = request.get_json()
    reason = data.get('reason', '')

    # Update report status
    db.execute("""
        UPDATE reports
        SET status = 'rejected',
            responded_by = ?,
            responded_at = CURRENT_TIMESTAMP,
            rejection_reason = ?
        WHERE id = ?
    """, user_id, reason, report_id)

    # Optional: Send notification to student
    notify_student(report_id, 'rejected', reason)

    return jsonify({
        'success': True,
        'message': 'Report rejected successfully',
        'reportId': report_id
    })
```

### 7. Creating a Report (Optional)

If you want to add functionality for users to submit reports:

```
POST /api/reports
```

**Request Body:**

```json
{
  "title": "Report Title",
  "description": "Report description",
  "category": "technical",
  "priority": "medium"
}
```

**Response:**

```json
{
  "id": "rpt_004",
  "message": "Report submitted successfully",
  "status": "pending"
}
```

### 6. Responding to a Report (Optional)

For administrators to respond to reports:

```
PUT /api/reports/{reportId}/respond
```

**Request Body:**

```json
{
  "response": "Response message",
  "status": "responded"
}
```

## Error Handling

Handle these common errors:

- **401 Unauthorized**: Token is invalid or expired
- **403 Forbidden**: User doesn't have permission to view reports
- **404 Not Found**: Report not found
- **500 Internal Server Error**: Database or server error

## Testing

Test with various scenarios:

1. Empty pending reports list
2. Empty previous reports list
3. Multiple reports in each category
4. Reports with varying priorities
5. Missing or incomplete data

## Future Enhancements

Consider adding these features:

1. **Search and Filter**: Search reports by title, date, or category
2. **Sorting**: Sort by date, priority, or status
3. **Pagination**: For large numbers of reports
4. **Report Details Modal**: Click to view full report details
5. **Report Actions**: Respond, delete, or archive reports
6. **Notifications**: Alert users when reports are responded to
7. **Export**: Download reports as PDF or CSV

## UI Implementation

### Pending Reports Display

Each pending report is displayed in a two-column grid layout:

- **Left Column**: Student Information
  - Student full name (bold, gray-900)
  - Student ID, Course, Year, and Section (smaller text, gray-500)
- **Right Column**: Event Information
  - Event name (bold, gray-900)
  - Date and message preview (smaller text, gray-500)

Reports are:

- Separated by horizontal borders
- Hoverable (background changes to gray-50)
- Clickable (cursor pointer) - expands to show full details
- Responsive (stacks on mobile, side-by-side on desktop)

### Previous Reports Display

Each previous report is displayed in a single row:

- **Left Side**: Event Information
  - Event name (bold, gray-900)
  - Date in brackets and message preview (smaller text, gray-500)
- **Right Side**: Status
  - "Status: Resolved" (green, bold) - for accepted reports
  - "Status: Rejected" (red, bold) - for rejected reports

Reports are:

- Separated by horizontal borders
- Hoverable (background changes to gray-50)
- Display the final status of the report
- Sorted by response date (most recent first)

### Expanded Pending Report View

When a pending report is clicked, it expands to show:

1. **Header Section**:

   - Student name and details
   - Back button (left arrow icon)

2. **Event Details**:

   - Event name, date, and time

3. **Full Message**:

   - Complete student excuse/reason (preserves line breaks)

4. **Attachments** (if any):

   - Images displayed in a 2-column grid
   - Medical certificates, photo proofs, etc.

5. **Action Buttons**:
   - **Accept** button (outlined, blue border)
   - **Reject** button (filled, blue background)
   - Centered at the bottom

## Notes

- Reports are displayed in reverse chronological order (most recent first)
- Only one section (Pending/Previous) can be expanded at a time
- Only one pending report can be expanded at a time for detailed view
- Empty states are shown when no reports are available
- **Pending Reports**: Show student name, ID, course details, event name, date, and message preview
- **Previous Reports**: Show event name, date, message preview, and status (Resolved/Rejected)
- Message text is truncated with ellipsis (...) for preview
- Full message and attachments are shown when pending report is expanded
- Previous reports are read-only (no expansion, just status display)
- All data fetching and processing is done on the backend
- Frontend handles display and user interaction only
- Accept/Reject actions trigger API calls to update report status
- Accepted reports show as "Resolved" in Previous Reports
- Rejected reports show as "Rejected" in Previous Reports
- Consider adding email notifications when reports are accepted/rejected
