# Students and RFID Cards

Council members manage students on **Dashboard → Students** (`/dashboard/students`). From there you can:

- **Import a class list** from a CSV file (adds new students, updates existing ones)
- **Add** or **edit** a student, or set them inactive
- **Link an RFID card** to a student by tapping it on the USB reader
- **Search** by name, Student ID, email, course, section or card number, and filter by students with or without a card

Students need a record here before they can log in (their **school email** must match their Google account) or be scanned at events (their **card** must be linked).

## First-time setup: run the database upgrade once

This feature makes RFID cards unique: one card per student. If your database was used before this update, run this once from your computer, with the production `MONGODB_URI` in `.env.local`:

```bash
npm run db:migrate
```

It clears blank card values, lowercases emails, and upgrades the database index so two students can never share a card. It's safe to run more than once. If two students already share a card, it lists them and stops. Unlink one of them on the Students page, then run it again.

## CSV template

[Download the template](../public/students-template.csv) (also on the import screen). It has these columns:

| Column | Required? | Example | Notes |
| --- | --- | --- | --- |
| **Student ID** | ✅ | `2023M1025` | Used to match existing students. Must be unique. |
| **Last Name** | ✅ * | `Dela Cruz` | |
| **First Name** | ✅ * | `Juan` | |
| **Middle Name** | | `Santos` | Shortened to an initial: "Juan S. Dela Cruz" |
| **Course** | | `BSCS` | Saved in capitals |
| **Year** | | `3` | Also accepts `3rd`, `3rd Year`, `Third Year`, `III` |
| **Section** | | `B` | Saved in capitals |
| **Email** | ✅ | `juan.delacruz@<school domain>` | Must be the student's **school Google account** (`ALLOWED_EMAIL_DOMAIN`), because that's how they log in |
| **RFID** | | `0012345678` | Leave blank and link cards later by tapping them |

\* Or use a single **Name** column instead of First/Last Name.

### Your own class list probably works as-is

You don't have to rename your columns. The import recognizes common variations (capitals, spaces, dots and underscores don't matter):

| Field | Also accepted |
| --- | --- |
| Student ID | Student No., Student Number, ID Number, ID No, ID, School ID |
| Name | Full Name, Student Name, Complete Name |
| First / Middle / Last Name | Given Name · Middle Initial, M.I. · Surname, Family Name |
| Course | Program, Degree, Degree Program, Program Code, Course Code |
| Year | Year Level, Level, Yr, Year Lvl |
| Section | Sec, Block, Class |
| Email | Email Address, School Email, Institutional Email, Google Email |
| RFID | RFID Tag, RFID No, Card Number, Card No, Card |

Other columns (e.g. "Contact No") are ignored and listed on the preview screen.

The importer also handles files saved from Excel or Google Sheets: commas, semicolons or tabs as separators, quoted names like `"Santos, Jr."`, and blank rows.

### How the import works

1. Choose the file. Nothing is saved yet; you see a **preview** showing how many students will be added, updated or left unchanged, which columns were used, and a list of rows with problems (wrong email domain, invalid year, duplicate Student ID, missing email, …).
2. Fix problem rows in your file and upload again, or click **Import N students** to save the valid rows and skip the rest.
3. Importing the same file again is safe. Students are matched by Student ID, and only fields that have a value in the file are updated.

Limits: 2 MB / 5,000 rows per file.

## Linking RFID cards

USB RFID readers act like a keyboard: when you tap a card, they "type" its number and press Enter.

1. Click **Link card** next to a student.
2. Tap their card on the reader. It links straight away.
3. With **"After linking, go to the next student without a card"** ticked (the default), the next student without a card opens automatically, so you can hand out a stack of cards quickly: tap, next, tap, next…

If a card is already linked to someone else, you'll see who it belongs to. To move a card, open the current owner and click **Unlink card** first.

The attendance scanner (`POST /api/attendance/scan`) finds students by card number, falling back to Student ID.

## API

All routes need an admin or organization login. The student list is shared by every organization.

| Route | What it does |
| --- | --- |
| `GET /api/students?q=&card=linked\|unlinked&page=` | List/search students (25 per page) plus totals |
| `POST /api/students` | Add one student |
| `PATCH /api/students/:id` | Edit a student. `{ "rfid": "123" }` links a card, `{ "rfid": "" }` unlinks it. |
| `POST /api/students/import?dryRun=1` | Body: the CSV file. With `dryRun=1` it only previews. |
