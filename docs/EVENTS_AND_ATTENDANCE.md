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
| **Request** an event | Any council member | **Request** page |
| **Approve / reject** a request | **Admin** | **Events → Requests** tab |
| **Create** an event directly, **edit** or **delete** one | **Admin** | **Events → New Event / Edit / Delete** (delete only before anyone is scanned) |
| **Start** an event (scanner starts accepting cards) | Any council member | **Events → Start event** |
| **End** an event (scanner stops) | Any council member | **Events → End event** |
| **Reopen** an ended event (to add late scans) | Any council member | **Events → Reopen** |

Admin accounts are created with `npm run seed:admin` (choose role `admin`). Council accounts can do everything except approve requests and create, edit or delete events.

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

All scans are recorded as **On Time** for now. Marking late scans automatically is task 11 in `docs/README.md`.

## Statistics

The **Dashboard** shows the running event (or, if none is running, the most recent ended one). **Past Events** shows each ended event. Both use the same numbers:

- **Total Department Students:** students with status *active* on the Students page.
- **Total Students Attended:** students scanned at least once (on time or late) for that event.
- **Attendance Rate:** attended ÷ department students.
- **By Course** (donut) and **By Year and Course** (bars): the attended students, grouped by their course and year level.
- Students who were only **excused** (accepted excuse letter) are counted separately, not as attended.

## API

All routes need a council or admin login unless noted.

| Route | What it does |
| --- | --- |
| `GET /api/events?status=upcoming,active,past` | List events (default: all) |
| `POST /api/events` | **Admin.** Create `{ name, date: "YYYY-MM-DD", startTime?: "HH:mm", endDate?, endTime?, location?, description? }` |
| `PATCH /api/events/:id` | `{ status: "active" }` start or reopen, `{ status: "past" }` end; any other fields edit the event (**admin**) |
| `DELETE /api/events/:id` | **Admin.** Only if the event has no attendance |
| `POST /api/events/request` | Submit a request `{ eventTitle, dateStart, timeStart?, dateEnd?, timeEnd?, location?, shortDescription? }` |
| `GET /api/events/requests` | All requests, pending first |
| `POST /api/events/requests/:id` | **Admin.** `{ action: "approve" \| "reject", notes? }`; approving creates the event |
| `GET /api/events/past` | Ended events with their statistics |
| `GET /api/dashboard` | Current event, its statistics, and upcoming events |
| `POST /api/attendance/scan` | `{ rfid, eventId, type: "AM" \| "PM", action: "Sign In" \| "Sign Out" }`. `rfid` is a card number or Student ID; the event must be running |
| `GET /api/attendance/records?eventId=…` | An event's records (newest first) and statistics |

Dates are stored as `YYYY-MM-DD` and times as `HH:mm` in school time, so they never shift between time zones. Scan timestamps are stored in UTC and shown in the viewer's local time.
