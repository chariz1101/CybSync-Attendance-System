# Backend Integration Guide - Council Login

## Overview

The Council Login page is located at `src/app/page.tsx` and is ready for backend integration.

## Form Data Structure

The login form collects the following data:

```typescript
{
  username: string,    // User's council username
  password: string,    // User's password
  rememberMe: boolean  // Remember me checkbox state
}
```

## Integration Points

### 1. Form Submission Handler

Located at **line 11-16** in `src/app/page.tsx`:

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // Backend integration point
  console.log("Login attempt:", { username, password, rememberMe });
  // Add your API call here
};
```

### 2. Example API Integration

Replace the `handleSubmit` function with your API call:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const response = await fetch("/api/auth/council-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        rememberMe,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Success - redirect to dashboard
      window.location.href = "/council/dashboard";
    } else {
      // Handle error - show error message
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("An error occurred. Please try again.");
  }
};
```

### 3. State Management

Current state variables (lines 7-9):

```typescript
const [username, setUsername] = useState(""); // Username input
const [password, setPassword] = useState(""); // Password input
const [rememberMe, setRememberMe] = useState(false); // Remember me checkbox
```

### 4. Adding Loading State

To add a loading indicator during login:

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // Your API call here
  } finally {
    setIsLoading(false);
  }
};

// Update button to show loading state:
<button
  type="submit"
  disabled={isLoading}
  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg"
>
  {isLoading ? "Signing In..." : "Sign In"}
</button>;
```

### 5. Error Handling

To display errors in the UI:

```typescript
const [error, setError] = useState("");

// Add error display above the form:
{
  error && (
    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
      {error}
    </div>
  );
}
```

## API Endpoint Recommendations

### POST `/api/auth/council-login`

**Request Body:**

```json
{
  "username": "string",
  "password": "string",
  "rememberMe": boolean
}
```

**Success Response (200):**

```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "username": "username",
    "role": "council",
    "name": "Full Name"
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

## Student Login Link

The "Student? Login Here" link currently points to `/student-login`. Create a similar page for student authentication.

## Security Recommendations

1. **HTTPS Only**: Always use HTTPS in production
2. **CSRF Protection**: Implement CSRF tokens
3. **Rate Limiting**: Limit login attempts per IP
4. **Password Requirements**: Enforce strong passwords
5. **Session Management**: Implement secure session handling
6. **Token Storage**: Store JWT in httpOnly cookies or secure localStorage

## Next Steps for Backend Team

1. Create API endpoint `/api/auth/council-login`
2. Implement authentication logic
3. Set up JWT token generation
4. Configure session management
5. Create protected routes for council dashboard
6. Implement logout functionality
7. Add password reset functionality (if needed)

## Testing

Test the form with these scenarios:

- ✅ Valid credentials
- ❌ Invalid username
- ❌ Invalid password
- ❌ Empty fields
- ✅ Remember me functionality
- ❌ Network errors
