# Luumilo Internal Agenda (Activity Schedule) — API & Integration Guide

This module lets **logged-in parents** schedule activities in an **internal Luumilo agenda** (not Google/Apple calendar).
It supports:
- Creating schedule items (date/time + duration)
- Listing schedule items by date range (weekly/monthly calendar UI)
- Updating / marking completed / cancelling schedule items
- Reminder notifications using your existing `notifyUser()` system

---

## Base

- Base path: `/api/activity-schedule`
- Auth: **Required** (Bearer token / your existing `authenticate` middleware)
- Timezone: send `user-timezone` header (IANA string) when possible

Examples:
- `Authorization: Bearer <token>`
- `user-timezone: Asia/Karachi`
- `user-timezone: Europe/Amsterdam`

> Notes about timezones:
> - Backend stores dates as UTC timestamps.
> - Frontend should render in the user’s local timezone.
> - Backend also stores the timezone string for reference.

---

## Endpoints Summary

### Schedule CRUD
- `POST   /api/activity-schedule` — create schedule item
- `GET    /api/activity-schedule/me?from=&to=&status=&page=&limit=&includeActivity=1` — list my schedule items (range-based)
- `GET    /api/activity-schedule/:id` — get single schedule item
- `PATCH  /api/activity-schedule/:id` — update schedule time/duration/reminders/note/status
- `DELETE /api/activity-schedule/:id` — cancel schedule item (soft cancel)

### Reminder Runner (server cron / worker)
- `POST /api/activity-schedule/_internal/run-reminders` — sends due reminders (protected by secret)

---

## Access / Lock Rules

Scheduling must respect your existing access rules:
- Use `resolveAccessContext(req)` + `assertActivityAllowed({ activityId, ctx, req })`
- If the activity is locked for the user, **do not allow** scheduling.

---

## Data Model (returned to frontend)

### Schedule object
- `_id` string
- `activityId` string
- `activity` optional (when `includeActivity=1`)
- `startAt` ISO date string
- `endAt` ISO date string
- `timezone` string (IANA)
- `durationMinutes` number
- `note` string
- `source` `"playweek" | "library" | "shared" | "manual"`
- `status` `"scheduled" | "completed" | "cancelled"`
- `reminders` array of `{ minutesBefore, at, sentAt }`
- `nextReminderAt` ISO date string or `null`
- `completedAt` ISO date string or `null`
- `cancelledAt` ISO date string or `null`

### Example schedule item
```json
{
  "_id": "65fdc8d0d0b3c2b3c1a99999",
  "activityId": "65f1c8d0d0b3c2b3c1a11111",
  "activity": {
    "_id": "65f1c8d0d0b3c2b3c1a11111",
    "title": "Balloon Keep-Up Challenge",
    "learningDomain": "Motor skills",
    "ageGroup": "3 - 6",
    "estimatedDuration": "30 min",
    "coverImage": { "url": "..." },
    "averageRating": 4.7,
    "ratingCount": 21
  },
  "startAt": "2026-02-14T18:00:00.000Z",
  "endAt": "2026-02-14T18:45:00.000Z",
  "timezone": "Europe/Amsterdam",
  "durationMinutes": 45,
  "note": "Do this after dinner",
  "source": "playweek",
  "status": "scheduled",
  "reminders": [
    { "minutesBefore": 60, "at": "2026-02-14T17:00:00.000Z", "sentAt": null },
    { "minutesBefore": 10, "at": "2026-02-14T17:50:00.000Z", "sentAt": null }
  ],
  "nextReminderAt": "2026-02-14T17:00:00.000Z",
  "completedAt": null,
  "cancelledAt": null
}
```

---

## 1) Create schedule item

### `POST /api/activity-schedule`

Creates a schedule item for an approved activity.

#### Headers
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `user-timezone: <IANA>` (optional but recommended)

#### Body
```json
{
  "activityId": "65f1c8d0d0b3c2b3c1a11111",
  "startAt": "2026-02-14T18:00:00.000Z",
  "durationMinutes": 45,
  "reminderMinutesBefore": [60, 10],
  "note": "Do this after dinner",
  "source": "playweek",
  "timezone": "Europe/Amsterdam"
}
```

#### Behavior
- `durationMinutes` is optional:
  - backend may infer from `activity.estimatedDuration` if present
  - otherwise default to 30
- `reminderMinutesBefore` is optional:
  - default: `[60]`
- Valid reminder values:
  - integers in minutes (recommended range: `0..10080` = 7 days)
- `startAt` should be now or in the future (backend may reject far past times)
- Access rules enforced (locked activities cannot be scheduled)

#### Response (201)
```json
{
  "success": true,
  "schedule": { "...": "..." },
  "activity": { "_id": "65f1...", "title": "Balloon Keep-Up Challenge" }
}
```

#### Errors
- `400` invalid input (`activityId`, `startAt`)
- `401` unauthorized
- `403/4xx` access blocked (locked activity)
- `404` activity not found or not approved
- `409` duplicate schedule at same time for same activity
- `500` server error

---

## 2) List schedule items (agenda / calendar view)

### `GET /api/activity-schedule/me`

Used by:
- Weekly calendar grid
- Monthly calendar grid
- Upcoming list
- History list (completed/cancelled)

#### Headers
- `Authorization: Bearer <token>`

#### Query parameters
- `from` ISO datetime (default: now - 7 days)
- `to` ISO datetime (default: now + 30 days)
- `status` one of: `all | scheduled | completed | cancelled` (default: `all`)
- `includeActivity=1` to populate activity summary
- `page` default `1`
- `limit` default `200` (max `500`)

#### Example (weekly view)
```
GET /api/activity-schedule/me?from=2026-02-14T00:00:00.000Z&to=2026-02-21T00:00:00.000Z&includeActivity=1
```

#### Response (200)
```json
{
  "success": true,
  "schedules": [ { "...": "..." } ],
  "pagination": {
    "totalCount": 12,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 200
  },
  "range": {
    "from": "2026-02-14T00:00:00.000Z",
    "to": "2026-02-21T00:00:00.000Z"
  }
}
```

#### Notes
- Backend should clamp max date range to avoid heavy queries (recommended: 180 days max).
- Frontend should compute weekly ranges in local timezone then convert to ISO.

---

## 3) Get single schedule item

### `GET /api/activity-schedule/:id`

Returns a single schedule item (must be owned by the user).

#### Response (200)
```json
{ "success": true, "schedule": { "...": "..." } }
```

#### Errors
- `401` unauthorized
- `404` not found (or not owned)

---

## 4) Update schedule item

### `PATCH /api/activity-schedule/:id`

Update time, duration, reminders, note, or status.

#### Body (any subset)
```json
{
  "startAt": "2026-02-14T19:00:00.000Z",
  "durationMinutes": 30,
  "reminderMinutesBefore": [30, 10],
  "note": "Moved 1 hour later"
}
```

#### Optional: mark as completed
```json
{ "status": "completed" }
```

#### Behavior
- If `startAt` changes, backend recomputes `endAt`
- If reminders are provided, backend rebuilds reminder times and `nextReminderAt`
- Cancelled schedules should not be updatable

#### Response (200)
```json
{ "success": true, "schedule": { "...": "..." } }
```

#### Errors
- `400` invalid input
- `401` unauthorized
- `404` not found (or not owned)
- `409` cannot update cancelled schedule / duplicates
- `500` server error

---

## 5) Cancel schedule item (soft cancel)

### `DELETE /api/activity-schedule/:id`

Cancels the schedule item and prevents future reminders.

#### Response (200)
```json
{ "success": true, "message": "Schedule cancelled." }
```

#### Errors
- `401` unauthorized
- `404` not found (or not owned)
- `500` server error

---

## 6) Reminder System (Internal Notifications)

Reminders are stored per schedule item:
- `reminders[]`: each has `minutesBefore`, `at`, and `sentAt`
- `nextReminderAt`: denormalized field used for fast “due reminder” queries

### Reminder notification payload (recommended)
- `type`: `activity_schedule_reminder`
- `title`: `Activity reminder` / `Activity time!`
- `message`: e.g. “Your scheduled activity starts in 10 min.”
- `data`: `{ scheduleId, activityId, startAt, minutesBefore }`
- `dedupeKey`: `schedule:<scheduleId>:reminder:<minutesBefore>`

---

## 7) Reminder Runner (Cron/Worker Only)

### `POST /api/activity-schedule/_internal/run-reminders`

This endpoint is called by cron/worker every 1–5 minutes.
It:
- Finds schedule items where `status=scheduled` and `nextReminderAt <= now`
- Sends a notification using `notifyUser()`
- Marks the reminder as sent (`sentAt`)
- Updates `nextReminderAt` to the next pending reminder or `null`

### Security
Use header:
- `x-cron-secret: <CRON_SECRET>`

Env:
- `CRON_SECRET=your-strong-secret`

### Response (200)
```json
{ "success": true, "processed": 7 }
```

---

## 8) Frontend Integration (What to Build)

### A) Activity Details → Schedule
1. Add “Schedule” button.
2. Open modal:
   - date/time picker (required)
   - duration (default 30 or infer from `estimatedDuration`)
   - reminders (default 60 min)
   - optional note
3. Call:
   - `POST /api/activity-schedule`
4. Show success toast and optionally link to Agenda screen.

### B) Agenda Screen (Weekly view)
1. Compute `from` (start of week) and `to` (end of week) in local timezone.
2. Call:
   - `GET /api/activity-schedule/me?from&to&includeActivity=1`
3. Render cards in a grid (Mon–Sun) or list.

### C) Edit schedule item
- Open edit modal prefilled with schedule data
- Call `PATCH /api/activity-schedule/:id`

### D) Cancel schedule item
- Confirm dialog
- Call `DELETE /api/activity-schedule/:id`
- Remove from UI or move to history tab

---

## 9) UI/UX Recommendations

- Default duration: 30 minutes
- Default reminder: 60 minutes before
- Quick reminder chips: `60m`, `30m`, `10m`, `0m`
- Status tabs in Agenda:
  - Upcoming (scheduled, startAt >= now)
  - Past (scheduled, startAt < now)
  - Completed
  - Cancelled (optional)

---

## 10) FAQ

### Is this Google Calendar?
No. This is internal scheduling inside Luumilo.

### Can guests schedule activities?
Recommended: No (keep agenda tied to a user account).  
If needed later, implement guest schedules in session storage.

### Does scheduling mark activity as completed?
No. Completion remains your existing flow (`mark-activity-as-completed/:id`).  
Optionally you can also allow `PATCH schedule status=completed`.

### Why store timezone if dates are UTC?
Timezone helps UI display and future export/sync features.

---

## 11) Implementation Checklist

### Backend
- [ ] Add `ActivitySchedule` model
- [ ] Add controller endpoints
- [ ] Add routes under `/api/activity-schedule`
- [ ] Configure `CRON_SECRET`
- [ ] Add cron job calling `/_internal/run-reminders`

### Frontend
- [ ] Schedule modal (create)
- [ ] Agenda screen (list range)
- [ ] Edit schedule (patch)
- [ ] Cancel schedule (delete)
- [ ] Show reminder info + status badges
- [ ] Notifications inbox supports `activity_schedule_reminder`
