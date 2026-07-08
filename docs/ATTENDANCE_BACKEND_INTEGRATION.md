# Attendance Page - Backend Integration Guide

## Overview

The Attendance page (`/dashboard/attendance`) is designed for real-time RFID-based attendance tracking. It supports both manual RFID entry and automatic scanning via RFID card readers.

## Data Structure

### AttendanceData Interface

```typescript
interface AttendanceRecord {
  id: string; // Unique record ID
  studentId: string; // Student ID (from RFID)
  name: string; // Student full name
  course: string; // Course code (e.g., BSCS, BSIT)
  year: number; // Year level (1-4)
  section: string; // Section (A, B, C, etc.)
  timestamp: string; // Time of scan (HH:MM format)
}

interface AttendanceData {
  event: {
    name: string;
    date: string;
  };
  stats: {
    totalDepartmentStudents: number;
    totalStudentsAttended: number;
    attendanceRate: number;
  };
  records: AttendanceRecord[];
}
```

## RFID Scanner Integration

### Hardware Connection

The page supports two modes of RFID scanning:

#### Mode 1: Manual Entry

Users can manually type the RFID and press Enter or click the Enter button.

#### Mode 2: Automatic Scanning

When "Start" is clicked, the system connects to an RFID reader and automatically processes scanned cards.

### Integration Options

#### Option A: WebSocket Connection (Recommended)

For real-time RFID scanning with dedicated hardware:

```typescript
// In the component
const [ws, setWs] = useState<WebSocket | null>(null);

const handleStartScanning = () => {
  setIsScanning(true);

  // Connect to RFID reader WebSocket server
  const websocket = new WebSocket("ws://localhost:8080/rfid-scanner");

  websocket.onopen = () => {
    console.log("Connected to RFID scanner");
  };

  websocket.onmessage = async (event) => {
    const rfid = event.data;
    console.log("RFID Scanned:", rfid);

    // Process the scanned RFID
    await handleRfidScan(rfid);
  };

  websocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    alert("Failed to connect to RFID scanner");
    setIsScanning(false);
  };

  websocket.onclose = () => {
    console.log("Disconnected from RFID scanner");
    setIsScanning(false);
  };

  setWs(websocket);
};

const handleStopScanning = () => {
  if (ws) {
    ws.close();
    setWs(null);
  }
  setIsScanning(false);
};

// Clean up on unmount
useEffect(() => {
  return () => {
    if (ws) ws.close();
  };
}, [ws]);
```

#### Option B: Serial Port Connection (Browser-based)

Using Web Serial API for direct USB RFID reader connection:

```typescript
const handleStartScanning = async () => {
  try {
    // Request access to serial port
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    setIsScanning(true);

    const reader = port.readable.getReader();

    // Read loop
    while (isScanning) {
      const { value, done } = await reader.read();
      if (done) break;

      // Decode the RFID data
      const rfid = new TextDecoder().decode(value).trim();
      if (rfid) {
        await handleRfidScan(rfid);
      }
    }

    reader.releaseLock();
  } catch (error) {
    console.error("Serial port error:", error);
    alert("Failed to access RFID scanner");
    setIsScanning(false);
  }
};
```

#### Option C: HTTP Polling

For RFID readers with HTTP interface:

```typescript
const handleStartScanning = () => {
  setIsScanning(true);

  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch("http://your-rfid-reader-ip/latest-scan");
      const data = await response.json();

      if (data.rfid) {
        await handleRfidScan(data.rfid);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, 500); // Poll every 500ms

  // Store interval ID to clear later
  (window as any).scanInterval = pollInterval;
};

const handleStopScanning = () => {
  if ((window as any).scanInterval) {
    clearInterval((window as any).scanInterval);
  }
  setIsScanning(false);
};
```

## API Endpoints

### POST `/api/attendance/scan`

Record a new attendance entry from RFID scan.

**Request Body:**

```json
{
  "rfid": "2023M1025",
  "eventId": "evt_001",
  "timestamp": "2025-09-12T15:00:00Z"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "record": {
    "id": "att_12345",
    "studentId": "2023M1025",
    "name": "Zuriel Eliazar D. Calix",
    "course": "BSCS",
    "year": 3,
    "section": "B",
    "timestamp": "15:00"
  },
  "stats": {
    "totalDepartmentStudents": 1000,
    "totalStudentsAttended": 801,
    "attendanceRate": 80.1
  }
}
```

**Error Responses:**

**Student Not Found (404):**

```json
{
  "success": false,
  "error": "Student not found",
  "rfid": "2023M1025"
}
```

**Duplicate Entry (409):**

```json
{
  "success": false,
  "error": "Student already recorded attendance",
  "rfid": "2023M1025",
  "previousTimestamp": "14:30"
}
```

**Invalid RFID (400):**

```json
{
  "success": false,
  "error": "Invalid RFID format",
  "rfid": "invalid"
}
```

### GET `/api/attendance/records?eventId={eventId}`

Fetch all attendance records for an event.

**Query Parameters:**

- `eventId` (required): Event ID
- `limit` (optional): Number of records per page (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**

```json
{
  "event": {
    "id": "evt_001",
    "name": "University Pagirimaw 2025",
    "date": "September 12, 2025"
  },
  "stats": {
    "totalDepartmentStudents": 1000,
    "totalStudentsAttended": 800,
    "attendanceRate": 80
  },
  "records": [
    {
      "id": "att_001",
      "studentId": "2023M1025",
      "name": "Zuriel Eliazar D. Calix",
      "course": "BSCS",
      "year": 3,
      "section": "B",
      "timestamp": "15:00"
    }
  ],
  "pagination": {
    "total": 800,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

### DELETE `/api/attendance/records/{recordId}`

Remove an attendance record (for corrections).

**Response (200):**

```json
{
  "success": true,
  "message": "Attendance record deleted"
}
```

## Implementation Example

### Complete RFID Scan Handler

```typescript
const handleRfidScan = async (rfid: string) => {
  try {
    const response = await fetch("/api/attendance/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        rfid: rfid.trim(),
        eventId: "current", // Or get from context
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Success - update UI
      setAttendanceData((prev) => ({
        ...prev,
        stats: data.stats,
        records: [data.record, ...prev.records],
      }));

      // Optional: Show success notification
      showNotification("success", `${data.record.name} recorded`);

      // Optional: Play success sound
      playSuccessSound();
    } else {
      // Handle errors
      if (response.status === 409) {
        showNotification("warning", "Student already recorded");
      } else if (response.status === 404) {
        showNotification("error", "Student not found");
      } else {
        showNotification("error", data.error || "Failed to record attendance");
      }

      // Optional: Play error sound
      playErrorSound();
    }
  } catch (error) {
    console.error("Failed to record attendance:", error);
    showNotification("error", "Network error. Please try again.");
  }
};
```

### Real-time Updates (WebSocket)

For live updates across multiple devices:

```typescript
useEffect(() => {
  const ws = new WebSocket("ws://your-api.com/attendance/live?eventId=evt_001");

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "new_attendance") {
      // Add new record to the top of the list
      setAttendanceData((prev) => ({
        ...prev,
        stats: data.stats,
        records: [data.record, ...prev.records],
      }));
    }
  };

  return () => ws.close();
}, []);
```

## RFID Reader Setup

### Supported Devices

The system can work with various RFID readers:

1. **USB HID Keyboard Emulation** - Reader acts as keyboard, types RFID directly into input field
2. **Serial/COM Port Readers** - Direct serial communication
3. **Network-based Readers** - HTTP/WebSocket API
4. **Bluetooth Readers** - Web Bluetooth API

### Configuration

#### USB Keyboard Emulation (Easiest)

1. Configure RFID reader to output in keyboard mode
2. Set suffix to "Enter" key
3. When Start is clicked, focus on input field
4. Reader types RFID and presses Enter automatically
5. Form submission handler processes the entry

```typescript
// Auto-submit on keyboard emulation
const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter" && isScanning) {
    handleRfidSubmit();
  }
};
```

## Features & Enhancements

### 1. Duplicate Prevention

```typescript
const handleRfidScan = async (rfid: string) => {
  // Check if student already scanned
  const existingRecord = attendanceData.records.find(
    (r) => r.studentId === rfid
  );

  if (existingRecord) {
    const allowDuplicate = confirm(
      `${existingRecord.name} already recorded at ${existingRecord.timestamp}. Record again?`
    );

    if (!allowDuplicate) return;
  }

  // Proceed with API call...
};
```

### 2. Sound Feedback

```typescript
const playSuccessSound = () => {
  const audio = new Audio("/sounds/success-beep.mp3");
  audio.play();
};

const playErrorSound = () => {
  const audio = new Audio("/sounds/error-beep.mp3");
  audio.play();
};
```

### 3. Visual Feedback

```typescript
const [lastScannedId, setLastScannedId] = useState<string | null>(null);

// Highlight newly added row
<tr
  key={record.id}
  className={`hover:bg-gray-50 transition-colors ${
    record.id === lastScannedId ? 'bg-green-50 animate-pulse' : ''
  }`}
>
```

### 4. Export to CSV

```typescript
const exportToCSV = () => {
  const headers = ["ID", "Name", "Course", "Year", "Section", "Time"];
  const rows = attendanceData.records.map((r) => [
    r.studentId,
    r.name,
    r.course,
    r.year,
    r.section,
    r.timestamp,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${new Date().toISOString()}.csv`;
  link.click();
};
```

### 5. Search & Filter

```typescript
const [searchTerm, setSearchTerm] = useState("");

const filteredRecords = attendanceData.records.filter(
  (record) =>
    record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.studentId.includes(searchTerm) ||
    record.course.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## Mobile Responsiveness

The table is wrapped in a horizontally scrollable container:

```tsx
<div className="overflow-x-auto">
  <table className="w-full">{/* Table content */}</table>
</div>
```

On mobile:

- Stats cards stack vertically
- Table scrolls horizontally
- Scanner controls stack vertically
- All buttons full-width on small screens

## Security Considerations

1. **Authentication**: Require valid JWT token for all API calls
2. **Authorization**: Verify user has permission to record attendance
3. **Rate Limiting**: Prevent spam/abuse (max 1 scan per second per student)
4. **RFID Validation**: Validate RFID format before processing
5. **Event Validation**: Ensure event is active and accepting attendance
6. **Audit Logging**: Log all attendance modifications
7. **Input Sanitization**: Sanitize RFID input to prevent injection attacks

## Testing Checklist

- [ ] Manual RFID entry works
- [ ] Enter button submits correctly
- [ ] Enter key submits correctly
- [ ] Start button activates scanner
- [ ] Stop button deactivates scanner
- [ ] Scanner auto-focus works
- [ ] Real-time record updates
- [ ] Stats update after new entry
- [ ] Duplicate detection works
- [ ] Error handling displays properly
- [ ] Table scrolls on mobile
- [ ] Controls responsive on mobile
- [ ] Network error handling
- [ ] WebSocket reconnection
- [ ] CSV export functionality

## Performance Optimization

1. **Pagination**: Load records in batches (50-100 at a time)
2. **Virtual Scrolling**: For large datasets, use react-window
3. **Debouncing**: Debounce search input
4. **Optimistic Updates**: Update UI immediately, sync with backend
5. **Caching**: Cache student info to reduce API calls

## Next Steps

1. Set up RFID reader hardware connection
2. Implement backend API endpoints
3. Add notification system for scan feedback
4. Implement export functionality
5. Add search and filter capabilities
6. Set up WebSocket for real-time updates
7. Add attendance verification/correction features
8. Implement attendance reports
