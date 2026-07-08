# Student Report Form - Backend Integration Guide

This document provides comprehensive guidance for integrating the Student Report Form with your backend.

## Data Structure

### TypeScript Interfaces

```typescript
interface ReportFormData {
  eventTitle: string;
  description: string;
  attachments: File[];
}
```

## API Endpoints

### 1. Submit Report

**Endpoint:** `POST /api/student/reports`

**Description:** Allows a student to submit a report/excuse for an event absence.

**Request Headers:**

```
Content-Type: multipart/form-data
Authorization: Bearer <student_jwt_token>
```

**Request Body (FormData):**

```
eventTitle: string (required) - The title/name of the event
description: string (required) - Student's explanation/grievance
attachment_0: File (optional) - First supporting document
attachment_1: File (optional) - Second supporting document
... (multiple attachments allowed)
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "reportId": "RPT-2026-001",
  "data": {
    "id": "rpt_12345",
    "studentId": "2024M1025",
    "eventTitle": "University Days 2026 - Day 1",
    "description": "I was unable to attend due to...",
    "status": "pending",
    "submittedAt": "2026-01-15T10:30:00Z",
    "attachmentCount": 2
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "eventTitle": "Event title is required",
    "description": "Description is required"
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "message": "Invalid or missing authentication token"
}
```

**Error Response (413 Payload Too Large):**

```json
{
  "success": false,
  "message": "File size exceeds maximum allowed (5MB per file)"
}
```

### 2. Get Previous Reports

**Endpoint:** `GET /api/student/reports/history`

**Description:** Retrieves the history of all reports submitted by the authenticated student.

**Request Headers:**

```
Authorization: Bearer <student_jwt_token>
Content-Type: application/json
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "reports": [
    {
      "id": "rpt_12345",
      "eventTitle": "University Hinampang [D1-SI-AM]",
      "date": "10/01/2025",
      "message": "I have submitted a photo proof that I was present during the...",
      "status": "resolved"
    },
    {
      "id": "rpt_12346",
      "eventTitle": "University Hinampang [D1-SI-AM]",
      "date": "10/01/2025",
      "message": "I have submitted a photo proof that I was present during the...",
      "status": "pending"
    },
    {
      "id": "rpt_12347",
      "eventTitle": "University Hinampang [D1-SI-AM]",
      "date": "10/01/2025",
      "message": "I have submitted a photo proof that I was present during the...",
      "status": "rejected"
    }
  ],
  "total": 3
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "message": "Invalid or missing authentication token"
}
```

## Frontend Implementation

### Current Implementation

The form is already implemented in `src/app/student-dashboard/reports/page.tsx` with the following features:

1. **Form State Management:**

   - Event title (dropdown selection)
   - Description (textarea)
   - File attachments (multiple files)
   - Form validation
   - Loading states

2. **File Upload:**

   - Multiple file selection
   - Display uploaded files with sizes
   - Remove individual files
   - Accept images and PDFs

3. **Form Submission:**
   The commented code shows how to integrate with your backend:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);

  try {
    const token =
      localStorage.getItem("studentToken") ||
      sessionStorage.getItem("studentToken");
    const formDataToSend = new FormData();
    formDataToSend.append("eventTitle", formData.eventTitle);
    formDataToSend.append("description", formData.description);
    formData.attachments.forEach((file, index) => {
      formDataToSend.append(`attachment_${index}`, file);
    });

    const response = await fetch("/api/student/reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formDataToSend,
    });

    const data = await response.json();

    if (response.ok) {
      alert("Report submitted successfully!");
      // Reset form
      setFormData({
        eventTitle: "",
        description: "",
        attachments: [],
      });
    } else {
      alert(data.message || "Failed to submit report");
    }
  } catch (error) {
    console.error("Report submission error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
```

### Previous Reports Display

The previous reports section is already implemented in `src/app/student-dashboard/reports/page.tsx` with the following features:

1. **State Management:**

   - Loading state for reports
   - Display reports with color-coded status badges
   - Empty state when no reports found

2. **Report History Fetching:**
   The commented code shows how to integrate with your backend:

```typescript
// Load previous reports when section is expanded
useEffect(() => {
  if (expandedSection === "previous" && previousReports.length === 0) {
    fetchPreviousReports();
  }
}, [expandedSection]);

const fetchPreviousReports = async () => {
  setIsLoadingReports(true);
  try {
    const token =
      localStorage.getItem("studentToken") ||
      sessionStorage.getItem("studentToken");
    const response = await fetch("/api/student/reports/history", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      setPreviousReports(data.reports);
    } else {
      console.error("Failed to fetch reports:", data.message);
    }
  } catch (error) {
    console.error("Error fetching reports:", error);
  } finally {
    setIsLoadingReports(false);
  }
};
```

### To Enable Backend Integration:

**For Report Submission:**

1. Uncomment the API call code in `handleSubmit` function
2. Remove or comment out the temporary success message code
3. Update the API endpoint URL if needed (`/api/student/reports`)
4. Ensure student authentication token is available in localStorage or sessionStorage

**For Previous Reports:**

1. Uncomment the `useEffect` and `fetchPreviousReports` function
2. Import `useEffect` from React at the top of the file
3. Replace `mockPreviousReports` with `previousReports` in the render section
4. Update the API endpoint URL if needed (`/api/student/reports/history`)

## Backend Requirements

### Database Schema

#### `reports` Table

```sql
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  report_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "RPT-2026-001"
  student_id VARCHAR(20) NOT NULL,
  event_id VARCHAR(36),  -- NULL if event not found/matched
  event_title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  reviewed_by VARCHAR(36),  -- council_member_id who reviewed
  reviewed_at TIMESTAMP NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES council_members(id) ON DELETE SET NULL,
  INDEX idx_student_id (student_id),
  INDEX idx_event_id (event_id),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at)
);
```

#### `report_attachments` Table

```sql
CREATE TABLE report_attachments (
  id VARCHAR(36) PRIMARY KEY,
  report_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,  -- or URL if using cloud storage
  file_type VARCHAR(50) NOT NULL,  -- e.g., "image/jpeg", "application/pdf"
  file_size INT NOT NULL,  -- in bytes
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  INDEX idx_report_id (report_id)
);
```

### Backend Logic (Python/Flask Example)

```python
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime

reports_bp = Blueprint('reports', __name__)

# Configuration
UPLOAD_FOLDER = '/path/to/uploads/reports'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@reports_bp.route('/api/student/reports', methods=['POST'])
@require_student_auth  # Custom decorator for student authentication
def submit_report(current_student):
    try:
        # Get form data
        event_title = request.form.get('eventTitle')
        description = request.form.get('description')

        # Validate required fields
        errors = {}
        if not event_title or not event_title.strip():
            errors['eventTitle'] = 'Event title is required'
        if not description or not description.strip():
            errors['description'] = 'Description is required'

        if errors:
            return jsonify({
                'success': False,
                'message': 'Validation error',
                'errors': errors
            }), 400

        # Generate unique report ID and number
        report_id = str(uuid.uuid4())
        report_number = generate_report_number()  # e.g., "RPT-2026-001"

        # Try to match event by title
        event = db.session.query(Event).filter(
            Event.title == event_title
        ).first()
        event_id = event.id if event else None

        # Create report record
        new_report = Report(
            id=report_id,
            report_number=report_number,
            student_id=current_student.student_id,
            event_id=event_id,
            event_title=event_title,
            description=description,
            status='pending',
            submitted_at=datetime.utcnow()
        )
        db.session.add(new_report)

        # Handle file attachments
        attachment_count = 0
        files = request.files

        for key in files:
            file = files[key]
            if file and file.filename and allowed_file(file.filename):
                # Check file size
                file.seek(0, os.SEEK_END)
                file_size = file.tell()
                file.seek(0)

                if file_size > MAX_FILE_SIZE:
                    return jsonify({
                        'success': False,
                        'message': f'File {file.filename} exceeds maximum size (5MB)'
                    }), 413

                # Save file
                filename = secure_filename(file.filename)
                unique_filename = f"{report_id}_{attachment_count}_{filename}"
                file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
                file.save(file_path)

                # Create attachment record
                attachment = ReportAttachment(
                    id=str(uuid.uuid4()),
                    report_id=report_id,
                    file_name=filename,
                    file_path=file_path,
                    file_type=file.content_type,
                    file_size=file_size
                )
                db.session.add(attachment)
                attachment_count += 1

        db.session.commit()

        # Send notification to council (optional)
        # notify_council_new_report(report_id)

        return jsonify({
            'success': True,
            'message': 'Report submitted successfully',
            'reportId': report_number,
            'data': {
                'id': report_id,
                'studentId': current_student.student_id,
                'eventTitle': event_title,
                'description': description,
                'status': 'pending',
                'submittedAt': new_report.submitted_at.isoformat() + 'Z',
                'attachmentCount': attachment_count
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting report: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while submitting the report'
        }), 500

def generate_report_number():
    """Generate unique report number like RPT-2026-001"""
    current_year = datetime.utcnow().year
    last_report = db.session.query(Report).filter(
        Report.report_number.like(f'RPT-{current_year}-%')
    ).order_by(Report.created_at.desc()).first()

    if last_report:
        last_number = int(last_report.report_number.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1

    return f"RPT-{current_year}-{new_number:03d}"
```

### Backend Logic (Node.js/Express Example)

```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/reports/");
  },
  filename: (req, file, cb) => {
    const reportId = req.reportId || uuidv4();
    const uniqueName = `${reportId}_${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post(
  "/api/student/reports",
  requireStudentAuth,
  upload.any(),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { eventTitle, description } = req.body;
      const studentId = req.student.student_id;

      // Validate
      const errors = {};
      if (!eventTitle || !eventTitle.trim()) {
        errors.eventTitle = "Event title is required";
      }
      if (!description || !description.trim()) {
        errors.description = "Description is required";
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors,
        });
      }

      // Generate report ID and number
      const reportId = uuidv4();
      const reportNumber = await generateReportNumber(connection);

      // Try to find matching event
      const [events] = await connection.query(
        "SELECT id FROM events WHERE title = ?",
        [eventTitle]
      );
      const eventId = events.length > 0 ? events[0].id : null;

      // Insert report
      await connection.query(
        `INSERT INTO reports 
       (id, report_number, student_id, event_id, event_title, description, status, submitted_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [reportId, reportNumber, studentId, eventId, eventTitle, description]
      );

      // Handle attachments
      let attachmentCount = 0;
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await connection.query(
            `INSERT INTO report_attachments 
           (id, report_id, file_name, file_path, file_type, file_size) 
           VALUES (?, ?, ?, ?, ?, ?)`,
            [
              uuidv4(),
              reportId,
              file.originalname,
              file.path,
              file.mimetype,
              file.size,
            ]
          );
          attachmentCount++;
        }
      }

      await connection.commit();

      // Optional: Notify council
      // await notifyCouncilNewReport(reportId);

      res.status(200).json({
        success: true,
        message: "Report submitted successfully",
        reportId: reportNumber,
        data: {
          id: reportId,
          studentId,
          eventTitle,
          description,
          status: "pending",
          submittedAt: new Date().toISOString(),
          attachmentCount,
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error submitting report:", error);

      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
        });
      }

      res.status(500).json({
        success: false,
        message: "An error occurred while submitting the report",
      });
    } finally {
      connection.release();
    }
  }
);

async function generateReportNumber(connection) {
  const currentYear = new Date().getFullYear();
  const [results] = await connection.query(
    `SELECT report_number FROM reports 
     WHERE report_number LIKE ? 
     ORDER BY created_at DESC LIMIT 1`,
    [`RPT-${currentYear}-%`]
  );

  let newNumber = 1;
  if (results.length > 0) {
    const lastNumber = parseInt(results[0].report_number.split("-")[2]);
    newNumber = lastNumber + 1;
  }

  return `RPT-${currentYear}-${String(newNumber).padStart(3, "0")}`;
}

module.exports = router;
```

### Backend Logic for Getting Previous Reports (Python/Flask Example)

```python
@reports_bp.route('/api/student/reports/history', methods=['GET'])
@require_student_auth  # Custom decorator for student authentication
def get_report_history(current_student):
    try:
        # Get all reports for this student
        reports = db.session.query(Report).filter(
            Report.student_id == current_student.student_id
        ).order_by(Report.submitted_at.desc()).all()

        # Format reports for response
        report_list = []
        for report in reports:
            # Truncate message for preview (first 100 characters)
            message_preview = report.description[:100] + '...' if len(report.description) > 100 else report.description

            report_list.append({
                'id': report.id,
                'eventTitle': report.event_title,
                'date': report.submitted_at.strftime('%m/%d/%Y'),
                'message': message_preview,
                'status': report.status  # 'pending', 'resolved' (accepted), or 'rejected'
            })

        return jsonify({
            'success': True,
            'reports': report_list,
            'total': len(report_list)
        }), 200

    except Exception as e:
        print(f"Error fetching report history: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching reports'
        }), 500
```

### Backend Logic for Getting Previous Reports (Node.js/Express Example)

```javascript
router.get(
  "/api/student/reports/history",
  requireStudentAuth,
  async (req, res) => {
    try {
      const studentId = req.student.student_id;

      // Get all reports for this student
      const [reports] = await db.query(
        `SELECT 
        id,
        event_title,
        description,
        status,
        submitted_at
       FROM reports
       WHERE student_id = ?
       ORDER BY submitted_at DESC`,
        [studentId]
      );

      // Format reports for response
      const reportList = reports.map((report) => {
        // Truncate message for preview (first 100 characters)
        const messagePreview =
          report.description.length > 100
            ? report.description.substring(0, 100) + "..."
            : report.description;

        // Format date as MM/DD/YYYY
        const date = new Date(report.submitted_at);
        const formattedDate = `${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

        return {
          id: report.id,
          eventTitle: report.event_title,
          date: formattedDate,
          message: messagePreview,
          status: report.status, // 'pending', 'resolved' (accepted), or 'rejected'
        };
      });

      res.status(200).json({
        success: true,
        reports: reportList,
        total: reportList.length,
      });
    } catch (error) {
      console.error("Error fetching report history:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching reports",
      });
    }
  }
);
```

## File Storage Options

### Option 1: Local File System

- Store files in server's file system
- Path stored in database: `/uploads/reports/abc123_0_evidence.jpg`
- Pros: Simple, no additional services needed
- Cons: Difficult to scale, no CDN benefits

### Option 2: Cloud Storage (Recommended)

- Use AWS S3, Google Cloud Storage, or Azure Blob Storage
- Store URL in database: `https://cdn.example.com/reports/abc123_0_evidence.jpg`
- Pros: Scalable, CDN delivery, better performance
- Cons: Additional service costs

## Security Considerations

1. **File Validation:**

   - Validate file types (only allow images and PDFs)
   - Check file sizes (limit to 5MB per file)
   - Scan files for malware (recommended)

2. **Authentication:**

   - Verify student token before accepting submission
   - Ensure student can only submit reports for themselves

3. **Rate Limiting:**

   - Limit number of reports per student per day
   - Prevent spam submissions

4. **Sanitization:**

   - Sanitize text inputs to prevent XSS attacks
   - Use secure_filename for file names

5. **File Access:**
   - Implement proper access control for file downloads
   - Only allow student and council to view attachments

## Error Handling

The backend should handle these scenarios:

1. **Missing required fields** → 400 Bad Request
2. **Invalid file types** → 400 Bad Request
3. **File too large** → 413 Payload Too Large
4. **Invalid/expired token** → 401 Unauthorized
5. **Database errors** → 500 Internal Server Error
6. **File system errors** → 500 Internal Server Error

## Status Mapping

The `status` field in the database should use one of these values:

- `'pending'` - Report is awaiting review
- `'accepted'` or `'resolved'` - Report was accepted by council (display as "Resolved")
- `'rejected'` - Report was rejected by council

When a council member accepts a report via the council dashboard (`POST /api/reports/{reportId}/accept`), update the status to `'accepted'` or `'resolved'`.

## Testing Scenarios

### Report Submission Tests

1. **Valid Submission:**

   - Submit with all required fields and valid attachments
   - Verify report is created with correct status
   - Verify files are saved correctly

2. **Validation Errors:**

   - Submit without event title → Should show error
   - Submit without description → Should show error

3. **File Upload:**

   - Upload image files → Should succeed
   - Upload PDF files → Should succeed
   - Upload invalid file types → Should fail
   - Upload oversized files → Should fail

4. **Authentication:**

   - Submit without token → Should return 401
   - Submit with invalid token → Should return 401

5. **Multiple Attachments:**
   - Upload multiple files → Should save all files
   - Verify attachment count is correct

### Previous Reports Tests

1. **Fetching Reports:**

   - Student with reports → Should return list
   - Student with no reports → Should return empty array
   - Verify reports are ordered by date (newest first)

2. **Status Display:**

   - Resolved reports → Should show green badge
   - Pending reports → Should show blue badge
   - Rejected reports → Should show red badge

3. **Authentication:**
   - Request without token → Should return 401
   - Request with invalid token → Should return 401
   - Student should only see their own reports

## UI Features Implemented

### Report Form

1. ✅ Event title dropdown with preset options
2. ✅ Large textarea for description
3. ✅ Multiple file upload support
4. ✅ Display uploaded files with file names and sizes
5. ✅ Remove individual attachments
6. ✅ Form validation with error messages
7. ✅ Loading state during submission
8. ✅ Success/error feedback
9. ✅ Form reset after successful submission
10. ✅ Responsive design matching mockup styling

### Previous Reports

1. ✅ Collapsible section for report history
2. ✅ Display report cards with event title, date, and message preview
3. ✅ Color-coded status badges (Resolved, Pending, Rejected)
4. ✅ Loading state while fetching reports
5. ✅ Empty state when no reports exist
6. ✅ Hover effects on report cards
7. ✅ Responsive layout
8. ✅ Ordered by submission date (newest first)
