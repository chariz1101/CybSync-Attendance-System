# Request Event Page - Backend Integration Guide

## Overview

The Request Event page (`/dashboard/request`) allows council members to submit requests for new events to be added to their dashboard. The form includes validation and is ready for backend integration.

## Data Structure

### EventRequest Interface

```typescript
interface EventRequest {
  eventTitle: string; // Event name/title
  dateStart: string; // Start date (YYYY-MM-DD)
  timeStart: string; // Start time (HH:MM 24-hour format)
  dateEnd: string; // End date (YYYY-MM-DD)
  timeEnd: string; // End time (HH:MM 24-hour format)
  shortDescription: string; // Optional event description
}
```

## Form Validation

The form includes client-side validation for:

1. **Required Fields:**

   - Event Title (must not be empty)
   - Date Start
   - Time Start
   - Date End
   - Time End

2. **Business Logic:**

   - End date/time must be after start date/time
   - All dates must be valid
   - Event title must be trimmed and non-empty

3. **Optional Fields:**
   - Short Description (can be empty)

## API Integration

### Form Submission Handler

Located at **lines 78-139** in `src/app/dashboard/request/page.tsx`:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);

  try {
    const response = await fetch("/api/events/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Event request submitted successfully!");
      // Reset form
      setFormData({
        eventTitle: "",
        dateStart: "",
        timeStart: "",
        dateEnd: "",
        timeEnd: "",
        shortDescription: "",
      });
    } else {
      alert(data.message || "Failed to submit request");
    }
  } catch (error) {
    console.error("Failed to submit event request:", error);
    alert("An error occurred. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};
```

## API Endpoints

### POST `/api/events/request`

Submit a new event request.

**Request Headers:**

```
Content-Type: application/json
Authorization: Bearer {jwt-token}
```

**Request Body:**

```json
{
  "eventTitle": "University Pagirimaw 2025",
  "dateStart": "2025-09-12",
  "timeStart": "08:00",
  "dateEnd": "2025-09-12",
  "timeEnd": "17:00",
  "shortDescription": "Annual university celebration featuring cultural performances, competitions, and activities."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Event request submitted successfully",
  "requestId": "req_12345",
  "event": {
    "id": "evt_pending_001",
    "title": "University Pagirimaw 2025",
    "startDateTime": "2025-09-12T08:00:00Z",
    "endDateTime": "2025-09-12T17:00:00Z",
    "description": "Annual university celebration...",
    "status": "pending",
    "requestedBy": "CICTSC",
    "requestedAt": "2025-10-14T16:00:00Z"
  }
}
```

**Error Responses:**

**Validation Error (400):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "eventTitle": "Event title is required",
    "dateEnd": "End date/time must be after start date/time"
  }
}
```

**Unauthorized (401):**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Conflict - Duplicate Event (409):**

```json
{
  "success": false,
  "error": "Event already exists",
  "message": "An event with similar date and time already exists",
  "existingEventId": "evt_001"
}
```

**Server Error (500):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to process event request"
}
```

## Backend Validation

The backend should validate:

### 1. Required Fields

```javascript
// Example backend validation
const validateEventRequest = (data) => {
  const errors = {};

  if (!data.eventTitle?.trim()) {
    errors.eventTitle = "Event title is required";
  }

  if (!data.dateStart) {
    errors.dateStart = "Start date is required";
  }

  if (!data.timeStart) {
    errors.timeStart = "Start time is required";
  }

  if (!data.dateEnd) {
    errors.dateEnd = "End date is required";
  }

  if (!data.timeEnd) {
    errors.timeEnd = "End time is required";
  }

  return errors;
};
```

### 2. Date/Time Logic

```javascript
// Validate date range
const startDateTime = new Date(`${data.dateStart}T${data.timeStart}`);
const endDateTime = new Date(`${data.dateEnd}T${data.timeEnd}`);

if (endDateTime <= startDateTime) {
  return {
    error: "End date/time must be after start date/time",
  };
}

// Validate not in the past
const now = new Date();
if (startDateTime < now) {
  return {
    error: "Event cannot be scheduled in the past",
  };
}

// Validate reasonable duration (e.g., max 7 days)
const durationDays = (endDateTime - startDateTime) / (1000 * 60 * 60 * 24);
if (durationDays > 7) {
  return {
    error: "Event duration cannot exceed 7 days",
  };
}
```

### 3. Authorization

```javascript
// Verify user has permission to create events
const verifyPermission = async (userId) => {
  const user = await User.findById(userId);

  if (!user || user.role !== "council") {
    throw new Error("Only council members can request events");
  }

  return true;
};
```

### 4. Duplicate Detection

```javascript
// Check for overlapping events
const checkDuplicateEvent = async (startDateTime, endDateTime) => {
  const overlappingEvent = await Event.findOne({
    $or: [
      {
        startDateTime: { $lte: endDateTime },
        endDateTime: { $gte: startDateTime },
      },
    ],
  });

  if (overlappingEvent) {
    throw new Error("Event time conflicts with existing event");
  }
};
```

## Database Schema

### Event Request Model

```typescript
interface EventRequestModel {
  id: string;
  eventTitle: string;
  startDateTime: Date;
  endDateTime: Date;
  description?: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: {
    userId: string;
    userName: string;
    role: string;
  };
  requestedAt: Date;
  reviewedBy?: {
    userId: string;
    userName: string;
  };
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Example MongoDB Schema

```javascript
const eventRequestSchema = new Schema(
  {
    eventTitle: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    startDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startDateTime;
        },
        message: "End date must be after start date",
      },
    },
    description: {
      type: String,
      maxLength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      userName: String,
      role: String,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: String,
    },
    reviewedAt: Date,
    reviewNotes: String,
  },
  {
    timestamps: true,
  }
);
```

## Implementation Example

### Complete Backend Handler (Node.js/Express)

```javascript
const createEventRequest = async (req, res) => {
  try {
    // 1. Authenticate user
    const userId = req.user.id; // From auth middleware
    const user = await User.findById(userId);

    if (!user || user.role !== "council") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "Only council members can request events",
      });
    }

    // 2. Validate request body
    const {
      eventTitle,
      dateStart,
      timeStart,
      dateEnd,
      timeEnd,
      shortDescription,
    } = req.body;

    const errors = validateEventRequest(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors,
      });
    }

    // 3. Create datetime objects
    const startDateTime = new Date(`${dateStart}T${timeStart}`);
    const endDateTime = new Date(`${dateEnd}T${timeEnd}`);

    // 4. Additional business logic validation
    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        success: false,
        error: "Invalid date range",
        message: "End date/time must be after start date/time",
      });
    }

    if (startDateTime < new Date()) {
      return res.status(400).json({
        success: false,
        error: "Invalid date",
        message: "Event cannot be scheduled in the past",
      });
    }

    // 5. Check for conflicts
    const conflictingEvent = await EventRequest.findOne({
      startDateTime: { $lte: endDateTime },
      endDateTime: { $gte: startDateTime },
      status: { $ne: "rejected" },
    });

    if (conflictingEvent) {
      return res.status(409).json({
        success: false,
        error: "Event conflict",
        message: "An event with similar date and time already exists",
        existingEventId: conflictingEvent.id,
      });
    }

    // 6. Create event request
    const eventRequest = await EventRequest.create({
      eventTitle: eventTitle.trim(),
      startDateTime,
      endDateTime,
      description: shortDescription?.trim() || "",
      status: "pending",
      requestedBy: {
        userId: user.id,
        userName: user.name,
        role: user.role,
      },
      requestedAt: new Date(),
    });

    // 7. Send notification to admins (optional)
    await notifyAdmins({
      type: "new_event_request",
      requestId: eventRequest.id,
      eventTitle: eventRequest.eventTitle,
      requestedBy: user.name,
    });

    // 8. Return success response
    return res.status(200).json({
      success: true,
      message: "Event request submitted successfully",
      requestId: eventRequest.id,
      event: {
        id: eventRequest.id,
        title: eventRequest.eventTitle,
        startDateTime: eventRequest.startDateTime,
        endDateTime: eventRequest.endDateTime,
        description: eventRequest.description,
        status: eventRequest.status,
        requestedBy: user.name,
        requestedAt: eventRequest.requestedAt,
      },
    });
  } catch (error) {
    console.error("Event request error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to process event request",
    });
  }
};
```

## Email Notifications

### Notify Admins on New Request

```javascript
const notifyAdmins = async (eventRequest) => {
  const admins = await User.find({ role: "admin" });

  const emailTemplate = `
    New Event Request
    
    Title: ${eventRequest.eventTitle}
    Requested by: ${eventRequest.requestedBy.userName}
    Start: ${eventRequest.startDateTime}
    End: ${eventRequest.endDateTime}
    
    Review: ${process.env.APP_URL}/admin/requests/${eventRequest.id}
  `;

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: "New Event Request - Approval Needed",
      text: emailTemplate,
    });
  }
};
```

### Notify Requester on Status Change

```javascript
const notifyRequester = async (eventRequest, status) => {
  const user = await User.findById(eventRequest.requestedBy.userId);

  const statusMessages = {
    approved: "Your event request has been approved!",
    rejected: "Your event request has been rejected.",
  };

  await sendEmail({
    to: user.email,
    subject: `Event Request ${
      status.charAt(0).toUpperCase() + status.slice(1)
    }`,
    text: `${statusMessages[status]}\n\nEvent: ${eventRequest.eventTitle}`,
  });
};
```

## UI Improvements

### 1. Success/Error Notifications

Replace alerts with toast notifications:

```typescript
// Install react-hot-toast: npm install react-hot-toast
import toast from "react-hot-toast";

// Success
toast.success("Event request submitted successfully!");

// Error
toast.error("Failed to submit request. Please try again.");

// Loading
const toastId = toast.loading("Submitting request...");
// Later: toast.success('Done!', { id: toastId });
```

### 2. Loading State

The submit button already shows loading state:

```typescript
<button disabled={isSubmitting}>
  {isSubmitting ? "Submitting..." : "Submit"}
</button>
```

### 3. Form Reset Confirmation

```typescript
const handleReset = () => {
  if (confirm("Are you sure you want to clear the form?")) {
    setFormData({
      eventTitle: "",
      dateStart: "",
      timeStart: "",
      dateEnd: "",
      timeEnd: "",
      shortDescription: "",
    });
  }
};
```

## Mobile Responsiveness

The form is fully responsive:

- **Desktop**: Two-column layout for date/time fields
- **Mobile (< 768px)**: Single column, stacked fields
- **All fields**: Full width on mobile
- **Submit button**: Right-aligned on desktop, full-width option on mobile

## Security Considerations

1. **Authentication**: Require valid JWT token
2. **Authorization**: Only council members can submit requests
3. **Input Sanitization**: Sanitize all text inputs to prevent XSS
4. **SQL/NoSQL Injection**: Use parameterized queries
5. **Rate Limiting**: Max 5 requests per hour per user
6. **CSRF Protection**: Implement CSRF tokens
7. **Validation**: Always validate on backend (never trust client)

## Testing Checklist

- [ ] Form validates all required fields
- [ ] End date/time must be after start date/time
- [ ] Cannot submit past dates
- [ ] Submit button disabled during submission
- [ ] Form resets after successful submission
- [ ] Error messages display correctly
- [ ] API integration works
- [ ] Loading state shows during submission
- [ ] Mobile responsive (all breakpoints)
- [ ] Email link works correctly
- [ ] Form accessible (keyboard navigation, screen readers)

## Admin Approval Workflow

### GET `/api/events/requests`

List all pending event requests (admin only):

```json
{
  "requests": [
    {
      "id": "req_001",
      "eventTitle": "University Pagirimaw 2025",
      "startDateTime": "2025-09-12T08:00:00Z",
      "endDateTime": "2025-09-12T17:00:00Z",
      "description": "...",
      "status": "pending",
      "requestedBy": {
        "userId": "user_123",
        "userName": "CICTSC",
        "role": "council"
      },
      "requestedAt": "2025-10-14T16:00:00Z"
    }
  ]
}
```

### POST `/api/events/requests/:id/approve`

Approve an event request:

```json
{
  "reviewNotes": "Approved for September event"
}
```

### POST `/api/events/requests/:id/reject`

Reject an event request:

```json
{
  "reviewNotes": "Date conflicts with existing event"
}
```

## Next Steps

1. Create backend API endpoint `/api/events/request`
2. Set up database model for event requests
3. Implement admin approval workflow
4. Add email notifications
5. Create admin dashboard for request management
6. Add file upload for event posters (optional)
7. Implement event calendar view
8. Add request history/tracking for users
