# Student Login - Backend Integration Guide

This document describes how to integrate the Student Login page with your backend API.

## Overview

The Student Login page allows students to authenticate using only their Student ID (no password required). This simplified authentication is designed for quick access to attendance tracking and event check-in features.

## Data Structure

### API Endpoint

```
POST /api/auth/student-login
```

### Request Headers

```json
{
  "Content-Type": "application/json"
}
```

### Request Body

```typescript
interface StudentLoginRequest {
  studentId: string; // Student ID (e.g., "2022M0000")
}
```

### Example Request

```json
{
  "studentId": "2022M0000"
}
```

### Response Format

**Success Response (200 OK):**

```typescript
interface StudentLoginResponse {
  success: true;
  token: string; // JWT token for authentication
  student: {
    id: string;
    studentId: string;
    name: string;
    course: string;
    year: string;
    section: string;
    email: string;
  };
  message: string;
}
```

**Example Success Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "id": "student_123",
    "studentId": "2022M0000",
    "name": "Dela Cruz, Juan Felipe J.",
    "course": "BSCS",
    "year": "4A",
    "section": "AI",
    "email": "juan.delacruz@example.edu"
  },
  "message": "Login successful"
}
```

**Error Response (401 Unauthorized):**

```json
{
  "success": false,
  "message": "Student ID not found"
}
```

**Error Response (403 Forbidden):**

```json
{
  "success": false,
  "message": "Student account is inactive or suspended"
}
```

## Implementation Steps

### 1. Update the Component

In `src/app/student-login/page.tsx`, uncomment and configure the API call:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch("/api/auth/student-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentId }),
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and student info
      if (rememberMe) {
        localStorage.setItem("studentToken", data.token);
        localStorage.setItem("studentInfo", JSON.stringify(data.student));
      } else {
        sessionStorage.setItem("studentToken", data.token);
        sessionStorage.setItem("studentInfo", JSON.stringify(data.student));
      }

      // Redirect to student dashboard
      window.location.href = "/student-dashboard";
    } else {
      alert(data.message || "Invalid Student ID");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Backend Requirements

Your backend should:

1. **Validate Student ID**: Check if the student ID exists in the database
2. **Verify Status**: Ensure the student account is active
3. **Generate Token**: Create a JWT token with student information
4. **Log Activity**: Record the login attempt for security monitoring
5. **Response**: Return student data and authentication token

### 3. Database Schema

```sql
-- Students table
CREATE TABLE students (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  course VARCHAR NOT NULL,
  year VARCHAR NOT NULL,
  section VARCHAR,
  email VARCHAR NOT NULL UNIQUE,
  status VARCHAR DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student login logs table (optional, for security)
CREATE TABLE student_login_logs (
  id VARCHAR PRIMARY KEY,
  student_id VARCHAR REFERENCES students(id),
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR,
  user_agent TEXT
);
```

### 4. Backend Logic Example (Python/Flask)

```python
import jwt
from datetime import datetime, timedelta
from flask import request, jsonify

@app.route('/api/auth/student-login', methods=['POST'])
def student_login():
    data = request.get_json()
    student_id = data.get('studentId')

    # Validate input
    if not student_id:
        return jsonify({
            'success': False,
            'message': 'Student ID is required'
        }), 400

    # Find student in database
    student = db.query("""
        SELECT id, student_id, name, course, year, section, email, status
        FROM students
        WHERE student_id = ?
    """, student_id)

    if not student:
        return jsonify({
            'success': False,
            'message': 'Student ID not found'
        }), 401

    # Check if account is active
    if student.status != 'active':
        return jsonify({
            'success': False,
            'message': 'Student account is inactive or suspended'
        }), 403

    # Generate JWT token
    token_payload = {
        'student_id': student.id,
        'studentId': student.student_id,
        'role': 'student',
        'exp': datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm='HS256')

    # Log the login attempt (optional)
    db.execute("""
        INSERT INTO student_login_logs (student_id, ip_address, user_agent)
        VALUES (?, ?, ?)
    """, student.id, request.remote_addr, request.headers.get('User-Agent'))

    # Return success response
    return jsonify({
        'success': True,
        'token': token,
        'student': {
            'id': student.id,
            'studentId': student.student_id,
            'name': student.name,
            'course': student.course,
            'year': student.year,
            'section': student.section,
            'email': student.email
        },
        'message': 'Login successful'
    }), 200
```

### 5. Backend Logic Example (Node.js/Express)

```javascript
const jwt = require("jsonwebtoken");

app.post("/api/auth/student-login", async (req, res) => {
  const { studentId } = req.body;

  // Validate input
  if (!studentId) {
    return res.status(400).json({
      success: false,
      message: "Student ID is required",
    });
  }

  try {
    // Find student in database
    const student = await db.query(
      "SELECT id, student_id, name, course, year, section, email, status FROM students WHERE student_id = ?",
      [studentId]
    );

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Student ID not found",
      });
    }

    // Check if account is active
    if (student.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Student account is inactive or suspended",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        student_id: student.id,
        studentId: student.student_id,
        role: "student",
      },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    // Log the login attempt (optional)
    await db.execute(
      "INSERT INTO student_login_logs (student_id, ip_address, user_agent) VALUES (?, ?, ?)",
      [student.id, req.ip, req.headers["user-agent"]]
    );

    // Return success response
    res.status(200).json({
      success: true,
      token: token,
      student: {
        id: student.id,
        studentId: student.student_id,
        name: student.name,
        course: student.course,
        year: student.year,
        section: student.section,
        email: student.email,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
    });
  }
});
```

## Security Considerations

### 1. Student ID Format Validation

```python
import re

def validate_student_id(student_id):
    # Example format: 2022M0000 (Year + M + 4 digits)
    pattern = r'^\d{4}M\d{4}$'
    return bool(re.match(pattern, student_id))
```

### 2. Rate Limiting

Implement rate limiting to prevent brute force attacks:

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/auth/student-login', methods=['POST'])
@limiter.limit("5 per minute")  # Max 5 login attempts per minute
def student_login():
    # ... login logic
```

### 3. Account Lockout

Lock accounts after multiple failed login attempts:

```python
# Track failed attempts
failed_attempts = db.query(
    "SELECT COUNT(*) FROM student_login_logs WHERE student_id = ? AND success = FALSE AND login_at > ?",
    student.id,
    datetime.now() - timedelta(minutes=15)
)

if failed_attempts >= 5:
    return jsonify({
        'success': False,
        'message': 'Account temporarily locked due to multiple failed attempts'
    }), 403
```

## Session Management

### Token Storage

- **Remember Me Checked**: Store in `localStorage` (persists across browser sessions)
- **Remember Me Unchecked**: Store in `sessionStorage` (cleared when browser closes)

### Token Validation

For subsequent API requests, include the token in headers:

```typescript
const token =
  localStorage.getItem("studentToken") ||
  sessionStorage.getItem("studentToken");

fetch("/api/student/attendance", {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
});
```

### Backend Token Verification

```python
from functools import wraps
import jwt

def require_student_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({'message': 'Token is missing'}), 401

        try:
            payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])

            # Verify role is student
            if payload.get('role') != 'student':
                return jsonify({'message': 'Invalid token'}), 401

            # Attach student info to request
            request.student_id = payload.get('student_id')
            request.studentId = payload.get('studentId')

        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated_function

# Usage
@app.route('/api/student/attendance', methods=['GET'])
@require_student_auth
def get_student_attendance():
    student_id = request.student_id
    # ... fetch attendance data
```

## Error Handling

Handle these common errors:

- **400 Bad Request**: Missing or invalid Student ID format
- **401 Unauthorized**: Student ID not found
- **403 Forbidden**: Account inactive, suspended, or locked
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Database or server error

## Testing

Test with various scenarios:

1. Valid Student ID
2. Invalid Student ID
3. Inactive student account
4. Suspended student account
5. Malformed Student ID format
6. Missing Student ID
7. Rate limit exceeded
8. Remember me checked/unchecked

## Notes

- Student login uses only Student ID (no password)
- Implement additional security measures (rate limiting, account lockout)
- JWT tokens should have reasonable expiration times (recommended: 24 hours)
- Consider implementing 2FA or email verification for sensitive operations
- Log all login attempts for security auditing
- Student ID format should match your institution's format
- Token should include minimal information (ID, role, expiration)
- Frontend validates Student ID format before sending to backend
