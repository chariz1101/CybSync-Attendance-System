# Events and Attendance

How events are created, run and reviewed, and how the RFID scanner records attendance.

## The event lifecycle

```
Request (council) ──▶ Approve (admin) ──▶ Upcoming ──▶ Start ──▶ Running ──▶ End ──▶ Ended
                                             ▲                                       │
                     New Event (admin) ──────┘                       Reopen ◀────────┘
```

| Step | Who | Where |
| --- | --- | --- |
| **Request** an event | An organization account | **Request** page |
| **Approve / reject** a request | **Admin** | **Events → Requests** tab |
| **Create** an event directly, **edit** or **delete** one | **Admin** | **Events → New Event / Edit / Delete** (delete only before anyone is scanned) |
| **Start** an event (scanner starts accepting cards) | The organization running it, or admin | **Events → Start event** |
| **End** an event (scanner stops) | The organization running it, or admin | **Events → End event** |
| **Reopen** an ended event (to add late scans) | The organization running it, or admin | **Events → Reopen** |

**Who runs an event:** when the admin approves a request, the event is run by the **organization that requested it**. Events the admin creates directly can be assigned to an organization with **Run by**, or left to the admin, and can be reassigned later by editing them.

**Each organization only sees its own** requests, events, attendance records, past events and dashboard numbers. The admin sees everything, and sees which organization runs each event. See the root README for how accounts are created.

More than one event can run at the same time. The scanner page asks which one you're scanning for.

## Scanning attendance

1. Start the event on **Events**, then click **Open scanner** (or go to **Attendance** and pick the event).
2. Choose the **Session** (AM / PM) and **Scan** type (Sign In / Sign Out).
3. Students tap their card on the USB reader. The reader types the card number and presses Enter, and the scan is recorded immediately. You can also type a **Student ID** and press Enter, e.g. for a forgotten card.

After each scan, a green banner shows who was recorded, or a red one explains the problem:

| Message | What to do |
| --- | --- |
| *No student has card or ID "…"* | The card isn't linked yet. Link it on **Students**. |
| *… was already scanned for AM Sign In* | Nothing; each student is recorded once per session and scan type. |
| *… is marked inactive* | The student was set inactive on **Students**. |
| *This event isn't running* | Start (or reopen) the event first. |

The input box stays focused, so you can keep scanning without touching the mouse. **Export CSV** downloads the event's records.

### On time or late

A **Sign In** is marked **Late** when it happens after the session's start time plus the event's **grace period** (default **15 minutes**):

| Session | Start time used | Example (grace 15) |
| --- | --- | --- |
| AM | the event's **Start time** | starts 7:00 AM → late after 7:15 AM |
| PM | the event's **Afternoon start** (optional) | starts 1:00 PM → late after 1:15 PM |

- **Sign Outs** are never late.
- If a session has no start time, every scan counts as on time.
- Admins set the afternoon start and grace period in **Events → New Event / Edit**. The scanner page shows when sign-ins start counting as late, and late scans get a yellow **LATE** banner.
- Times are compared in the school's time zone, `SCHOOL_TIMEZONE` (default `Asia/Manila`), because Vercel's servers run on UTC.
- Students can send an **excuse letter** for a late scan; accepting it changes the record to **Excused** (see `docs/REPORTS.md`).

## Statistics

The **Dashboard** shows the running event (or, if none is running, the most recent ended one). **Past Events** shows each ended event. Both use the same numbers:

- **Total Department Students:** students with status *active* on the Students page.
- **Total Students Attended:** students scanned at least once (on time or late) for that event.
- **Attendance Rate:** attended ÷ department students.
- **By Course** (donut) and **By Year and Course** (bars): the attended students, grouped by their course and year level.
- Students who were only **excused** (accepted excuse letter) are counted separately, not as attended.

## API

All routes need an admin or organization login. Organizations only get their own events and requests; using another organization's event returns `403`.

| Route | What it does |
| --- | --- |
| `GET /api/events?status=upcoming,active,past` | List events (default: all) |
| `POST /api/events` | **Admin.** Create `{ name, date: "YYYY-MM-DD", startTime?: "HH:mm", endDate?, endTime?, pmStartTime?, graceMinutes? (default 15), location?, description?, ownerId? }`. `ownerId` = the organization account that runs it |
| `PATCH /api/events/:id` | `{ status: "active" }` start or reopen, `{ status: "past" }` end; any other fields edit the event (**admin**) |
| `DELETE /api/events/:id` | **Admin.** Only if the event has no attendance |
| `POST /api/events/request` | **Organizations.** Submit a request `{ eventTitle, dateStart, timeStart?, dateEnd?, timeEnd?, location?, shortDescription? }` |
| `GET /api/events/requests` | Requests, pending first (an organization's own; all for admins) |
| `POST /api/events/requests/:id` | **Admin.** `{ action: "approve" \| "reject", notes? }`; approving creates the event |
| `GET /api/events/past` | Ended events with their statistics |
| `GET /api/dashboard` | Current event, its statistics, and upcoming events |
| `POST /api/attendance/scan` | `{ rfid, eventId, type: "AM" \| "PM", action: "Sign In" \| "Sign Out" }`. `rfid` is a card number or Student ID; the event must be running |
| `GET /api/attendance/records?eventId=…` | An event's records (newest first) and statistics |

Dates are stored as `YYYY-MM-DD` and times as `HH:mm` in school time, so they never shift between time zones. Scan timestamps are stored in UTC and shown in the viewer's local time.
