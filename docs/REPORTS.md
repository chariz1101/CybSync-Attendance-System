# Student Reports

Students use reports to tell the council about their attendance. There are two kinds:

- **Excuse letter:** they missed an event, or were late, for a valid reason.
- **Attendance discrepancy:** their record is wrong or missing (e.g. they were scanned but it doesn't show).

## For students (**Reports** page)

1. Choose the kind of report and the **event** (only events that have started are listed).
2. Describe what happened (up to 2,000 characters).
3. Optionally attach up to **3 files**: photos (JPG, PNG, WebP) or PDFs, **2 MB each**. For example, a photo of the signed excuse letter or a medical certificate.
4. Send. The report appears under **Your reports** as *Pending*, then *Accepted* or *Rejected*, with the council's reply if they wrote one.

## For the council (**Reports** page)

**Pending** lists reports oldest first. Click one to read it and open attachments (they open full size in a new tab). Optionally write a reply to the student, then:

- **Accept an excuse letter:** the student is marked **Excused** for that event:
  - their **late** scans for the event become *excused*;
  - if they had **no record at all** (absent), an *Excused* record is added.

  On-time scans are left as they are.
- **Accept a discrepancy:** the report is marked resolved. Fix the record itself if needed, e.g. reopen the event on **Events** and scan or type the student's ID on **Attendance**.
- **Reject:** the reply is shown to the student as the reason.

**Reviewed** shows the latest 100 reviewed reports, who reviewed them and when.

## Attachments

Files are stored in MongoDB (`reportattachments` collection), so no extra storage service is needed. On upload, each file's **contents** are checked (not just its name), so only real JPG, PNG, WebP or PDF files are accepted. Only council and admin accounts can open attachments.

The limits (3 files, 2 MB each, 4 MB in total) keep uploads under Vercel's 4.5 MB request limit and the database small. On MongoDB Atlas's free tier (512 MB), that's roughly a few hundred reports with photos.

## API

| Route | Who | What it does |
| --- | --- | --- |
| `GET /api/student/reports` | student | Their reports, plus events they can report about |
| `POST /api/student/reports` | student | Multipart form: `type` (`excuse` \| `discrepancy`), `eventId`, `message`, `files` (0–3) |
| `GET /api/reports` | council/admin | `{ pendingReports, previousReports }` |
| `POST /api/reports/:id/accept` | council/admin | `{ response? }` |
| `POST /api/reports/:id/reject` | council/admin | `{ reason? }` |
| `GET /api/reports/attachments/:id` | council/admin | The file |

Student pages also use `GET /api/student/dashboard` (stats, 10 latest records, upcoming events) and `GET /api/student/attendance` (stats and full history).
