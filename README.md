# weekplanner

weekplanner is a next.js app for planning your week by turning event drafts into an editable calendar and exporting/importing `.ics` files (for google calendar).

## what you can do

- create event drafts as either:
  - fixed-slot events (you provide 1+ candidate date/time slots)
  - flexible events (you provide a duration; ai picks a date/time)
- optionally use ai scheduling to choose the best slots based on your preferences
- review results in either list view or a drag-and-drop calendar view
- export the generated week as `weekly-planner.ics`
- import events from a google calendar `.ics` file (filtered to the selected week)

## tech stack

- next (app router)
- fullcalendar (drag-and-drop week view)
- ical-generator (ics export)
- openai (optional ai scheduling)

## getting started

1. install dependencies:
   - `npm install`
2. run the dev server:
   - `npm run dev`
3. open: `http://localhost:3000`

## environment variables

- `OPENAI_API_KEY` (optional)
  - if set, and if you provide non-empty `preferences`, the app will use openai to schedule events
  - if missing (or if `preferences` is empty/whitespace), the app falls back to a deterministic flattening behavior (see api docs below)

## ui workflow

1. choose the week start (sun or mon)
2. add drafts:
   - fixed-slot: uncheck `flexible`, then enter one or more candidate date/time slots
   - flexible: check `flexible`, then set the duration in minutes (slots are not used)
   - set notes and pick a color
3. (optional) paste your scheduling preferences into the `preferences` box
4. click `generate calendar`
   - without ai: all candidate slots for fixed-slot drafts are included; flexible drafts are returned as unscheduled placeholders (use list view; calendar view expects concrete dates/times)
   - with ai: openai is asked to pick exactly one slot per fixed-slot event, and assign date/time for flexible events within the selected week
5. review and adjust:
   - list view shows grouped events
   - calendar view uses fullcalendar; you can drag events to change times
6. export:
   - click `Download .ics` (or `Export to Google Calendar`) to download `weekly-planner.ics`
7. import:
   - upload a `.ics` file from google calendar via `Upload .ics file`
   - imported events are filtered to the selected week and shown as imported items

## api

### `POST /api/parse-events`

body:

```json
{
  "drafts": [
    {
      "id": "string",
      "name": "string",
      "color": "string",
      "notes": "string",
      "flexible": false,
      "durationMinutes": 60,
      "slots": [{ "date": "yyyy-mm-dd", "startTime": "hh:mm", "endTime": "hh:mm" }]
    }
  ],
  "preferences": "string (optional)",
  "weekStart": "yyyy-mm-dd"
}
```

response:

```json
{ "events": [ { "title": "string", "date": "yyyy-mm-dd", "startTime": "hh:mm", "endTime": "hh:mm" } ] }
```

behavior:

- if `preferences` is empty/whitespace OR `OPENAI_API_KEY` is not set, the route flattens drafts into calendar events and sorts them
- otherwise, it calls openai (`gpt-4o`) and expects a json array where:
  - fixed-slot drafts get exactly one chosen candidate slot
  - flexible drafts get assigned a concrete date/time within the week

### `POST /api/import-ics`

content-type: `multipart/form-data`

fields:

- `file`: the uploaded `.ics`
- `weekStart`: `yyyy-mm-dd` (used to filter events to the chosen week)

response:

```json
{ "events": [ { "id": "string", "name": "string", "date": "yyyy-mm-dd", "startTime": "hh:mm", "endTime": "hh:mm", "allDay": false, "imported": true } ] }
```

### `POST /api/export-ics`

body:

```json
{
  "events": [
    {
      "title": "string",
      "date": "yyyy-mm-dd",
      "startTime": "hh:mm",
      "endTime": "hh:mm",
      "description": "string (optional)",
      "color": "string (optional)"
    }
  ]
}
```

response:

- returns a `text/calendar` payload with an attachment header:
  - filename: `weekly-planner.ics`

## scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

