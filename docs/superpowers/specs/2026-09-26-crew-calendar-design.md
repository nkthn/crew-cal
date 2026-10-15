# Crew Calendar — Design

> **Revised 2026-10-15:** Google Calendar was dropped — busy time now comes only from
> "just me" blocks in Firestore. Blocks can repeat (daily / weekly / every 2 weeks / monthly,
> optional end date), and edits to a repeating block ask "only this one" or "all in the series".

Date: 2026-09-26
People: Nathan, Soohan, Ryan

## Goal

One link the three of us open on phone or laptop to see this week's schedules
overlaid, spot when we're all free at a glance, and add plans or extra busy
blocks. Success: open the link, see "Thursday after 6 we're all free."

## Non-goals

- No writing back to Google Calendar.
- No event titles from Google — busy/free only.
- No accounts or logins. No month view. No multi-timezone support.

## Architecture

- `index.html` (vanilla JS, no build step) plus `slots.js` holding the
  pure "all free" interval logic so it can be tested. Hosted on GitHub Pages.
- Config block at the top of the file: the three people (name, Google email,
  color), Google API key, Firebase config.
- **Busy times:** `POST https://www.googleapis.com/calendar/v3/freeBusy?key=…`
  with all three emails and the visible week as `timeMin`/`timeMax`. Requires
  each person to set their calendar to *Make available to public → See only
  free/busy*.
- **Added blocks:** Firebase Firestore collection `blocks`, loaded via the
  Firebase JS SDK from Google's CDN. Doc shape:
  `{ who: "nathan"|"soohan"|"ryan"|"group", title: string, start: Timestamp, end: Timestamp }`.
  Live updates via `onSnapshot` for the visible week.

## UI

- Week grid Mon–Sun, 8am–midnight, prev/next week arrows. Phones (<700px)
  show 3 days with arrows stepping by 3 days.
- Each person's busy time (Google + their personal added blocks) is a
  translucent layer in their color; overlaps read darker.
- Slots where all three are free are highlighted green.
- Group plans render as solid labeled blocks. Personal added blocks render in
  the person's color with a small title.
- First visit: "Who are you?" picker, remembered in `localStorage`.
- **+ Add** form: type (group / just me), title, date, start, end. Tap a block
  you created → delete (with confirm).

## Error handling

- Per-calendar errors from freeBusy (calendar not public) → banner
  "Soohan's calendar isn't shared yet"; everyone else still renders.
- Network / Firestore failures → visible banner, grid keeps last data.
- Add form validates end > start and non-empty title before writing.
- API key restricted by HTTP referrer to the GitHub Pages domain.
- Firestore rules: open read/write on `blocks`, but writes must match the doc
  shape above (valid `who`, string title ≤ 80 chars, `end > start`). No
  passcode — add one if the link leaks.

## Testing

- `test.mjs`: plain Node assert script over `slots.js` (merge busy
  intervals, invert within the visible hours). Run with `node test.mjs`.
- Manual check in the browser: grid renders, add/delete block, banner for an
  unshared calendar, phone width.

## One-time setup (documented in README)

1. Each person: Google Calendar → Settings → your calendar → Access
   permissions → Make available to public → *See only free/busy*.
2. Google Cloud: create project, enable Calendar API, create API key,
   restrict to Calendar API + the Pages domain.
3. Firebase: create project, add web app, enable Firestore, paste rules.
4. Paste keys into the config block, push to GitHub, enable Pages.
