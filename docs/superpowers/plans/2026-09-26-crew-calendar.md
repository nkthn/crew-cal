# Crew Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single static page showing Nathan, Soohan and Ryan's Google free/busy overlaid on a week grid, highlighting when all three are free, with shared add/delete blocks.

**Architecture:** `index.html` (vanilla JS module, no build) fetches Google Calendar freeBusy with an API key and reads/writes Firestore `blocks` live. Pure interval math lives in `slots.js` so Node can test it.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Google Calendar API v3 freeBusy, Firebase JS SDK v10 (modular, from `https://www.gstatic.com/firebasejs/10.12.2/`), Node ≥18 for `test.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-26-crew-calendar-design.md`

## Global Constraints

- No build step, no npm dependencies. Only files: `index.html`, `slots.js`, `test.mjs`, `firestore.rules`, `README.md`.
- Grid hours 8am–midnight (08:00–24:00 local). Week starts Monday.
- Phones (<700px wide): 3 visible days, arrows step 3 days. Desktop: 7 days, arrows step 1 week.
- `who` ∈ `"nathan" | "soohan" | "ryan" | "group"`. Title non-empty, ≤ 80 chars. `end > start`.
- Google event titles are never requested or shown — freeBusy only.
- Single timezone: the viewer's local time.
- Current user stored in `localStorage` key `crewcal.me`; wrap access in try/catch.

## Review Focus

1. Busy interval that starts before 08:00 or ends after midnight (overnight/all-day events) — clipped to the visible hours, not dropped or overflowing. Test in Task 1.
2. Overlapping and touching busy intervals across people (e.g. 10–11 and 11–12) — produce no zero-length "free" slot between them. Test in Task 1.
3. A person with no busy time at all — day is free except others' busy time. Test in Task 1.
4. freeBusy returns `errors` for one calendar (not public) — banner names that person, the other two still render and "all free" is **not** shown (unknown ≠ free). Test in Task 1 via `freeSlots` taking `null` for unknown.
5. DST change inside the visible week (early November) — day boundaries computed with local `Date` setters, not `+ 86400000`. Test in Task 1 via `dayRange`.

---

### Task 1: Interval logic (`slots.js`)

**Files:**
- Create: `slots.js`
- Test: `test.mjs`

**Interfaces:**
- Produces:
  - `type Interval = { start: number, end: number }` (epoch ms)
  - `mergeIntervals(list: Interval[]) -> Interval[]` — sorted, overlapping/touching merged.
  - `clip(list: Interval[], from: number, to: number) -> Interval[]` — trimmed to `[from,to]`, empties removed.
  - `freeSlots(busyByPerson: (Interval[] | null)[], from: number, to: number) -> Interval[]` — gaps where everyone is free; returns `[]` if any entry is `null`.
  - `dayRange(date: Date, startHour: number, endHour: number) -> Interval` — local-time window for that calendar day (`endHour` 24 = next midnight).

- [ ] **Step 1: Write the failing tests in `test.mjs`**

```js
import assert from 'node:assert/strict';
import { mergeIntervals, clip, freeSlots, dayRange } from './slots.js';
const I = (s, e) => ({ start: s, end: e });

assert.deepEqual(mergeIntervals([I(5,7), I(1,3), I(3,4)]), [I(1,4), I(5,7)]);   // touching merges
assert.deepEqual(clip([I(0,10), I(20,30), I(40,50)], 5, 25), [I(5,10), I(20,25)]);
assert.deepEqual(freeSlots([[I(10,11)], [I(11,12)], []], 8, 24), [I(8,10), I(12,24)]);
assert.deepEqual(freeSlots([[], [], []], 8, 24), [I(8,24)]);
assert.deepEqual(freeSlots([[I(0,100)], [], []], 8, 24), []);                   // all-day busy
assert.deepEqual(freeSlots([[I(9,10)], null, []], 8, 24), []);                   // unknown ≠ free
const nov1 = dayRange(new Date(2026, 10, 1), 8, 24);                            // DST day (America/*)
assert.equal(new Date(nov1.start).getHours(), 8);
assert.equal(new Date(nov1.end).getDate(), 2);
assert.equal(new Date(nov1.end).getHours(), 0);
console.log('ok');
```

- [ ] **Step 2: Run `node test.mjs`** — Expected: fails with module not found.
- [ ] **Step 3: Implement `slots.js`** exporting the four functions above. `freeSlots` = merge all people's clipped intervals, then invert within `[from,to]`. `dayRange` uses `new Date(y, m, d, startHour)` and `new Date(y, m, d, endHour)` (JS rolls hour 24 to next midnight).
- [ ] **Step 4: Run `TZ=America/Vancouver node test.mjs`** — Expected: `ok`.
- [ ] **Step 5: Commit** — `git add slots.js test.mjs && git commit -m "feat: free-slot interval logic"`

---

### Task 2: Week grid with Google free/busy (`index.html`)

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: `clip`, `freeSlots`, `dayRange`, `mergeIntervals` from `./slots.js`.
- Produces (module-scope in `index.html`, used by Task 3):
  - `const PEOPLE = [{ id: 'nathan', name: 'Nathan', email: '', color: '#e4572e' }, { id: 'soohan', name: 'Soohan', email: '', color: '#2e86de' }, { id: 'ryan', name: 'Ryan', email: '', color: '#8e44ad' }]`
  - `const GOOGLE_API_KEY = ''`, `const FIREBASE_CONFIG = {}` in one config block at the top of the script.
  - `state = { me: string|null, viewStart: Date, googleBusy: {[id]: Interval[] | null}, blocks: Block[] }`
  - `render()` — redraws the grid from `state`; Task 3 calls it after block changes.
  - `visibleRange() -> Interval` — first visible day 08:00 to last visible day 24:00.

- [ ] **Step 1: Build the page shell** — header (title, ‹ › arrows, date range label, **+ Add** button placeholder, "You: Nathan" switcher), banner area, grid. CSS grid: time column + N day columns, one row per 30 min from 08:00 to 24:00. Colors as CSS custom properties; dark mode via `prefers-color-scheme`. No horizontal scroll at 375px.
- [ ] **Step 2: Who-are-you picker** — modal with three buttons on first visit; stores `crewcal.me`; header switcher reopens it.
- [ ] **Step 3: `fetchBusy(range: Interval) -> Promise<void>`** — `POST https://www.googleapis.com/calendar/v3/freeBusy?key=${GOOGLE_API_KEY}` with body `{ timeMin, timeMax, items: PEOPLE.map(p => ({ id: p.email })) }`. For each person: `calendars[email].errors` present → `googleBusy[id] = null`; else map `busy` to epoch-ms intervals. Whole request fails → all `null` + banner "Couldn't reach Google Calendar".
- [ ] **Step 4: Render layers** — per day column, per person: `clip(merge(google + that person's own blocks), dayRange)` drawn as absolutely positioned divs with the person's color at 35% opacity (overlaps darken). Per day: `freeSlots` result drawn as green background strips behind the layers. Banner per `null` person: "{Name}'s calendar isn't shared yet".
- [ ] **Step 5: Navigation** — arrows move `viewStart` by 7 days (desktop) or 3 days (`matchMedia('(max-width: 699px)')`), refetch, re-render; re-render on media-query change. Default `viewStart` = Monday of this week (desktop) / today (phone).
- [ ] **Step 6: Manual check** — serve with `python3 -m http.server 8000`, fill in real emails + a test API key, open `http://localhost:8000`. Expected: three colored layers for this week, green where all free; set one email to a bogus address → banner appears, no green.
- [ ] **Step 7: Commit** — `git add index.html && git commit -m "feat: week grid with Google free/busy overlay"`

---

### Task 3: Shared blocks via Firestore

**Files:**
- Modify: `index.html`
- Create: `firestore.rules`

**Interfaces:**
- Consumes: `state`, `render()`, `visibleRange()`, `PEOPLE`, `FIREBASE_CONFIG` from Task 2.
- Produces: `type Block = { id: string, who: 'nathan'|'soohan'|'ryan'|'group', title: string, start: number, end: number }` in `state.blocks`.

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /blocks/{id} {
      allow read, delete: if true;
      allow create: if request.resource.data.keys().hasOnly(['who','title','start','end'])
        && request.resource.data.who in ['nathan','soohan','ryan','group']
        && request.resource.data.title is string
        && request.resource.data.title.size() > 0
        && request.resource.data.title.size() <= 80
        && request.resource.data.start is timestamp
        && request.resource.data.end is timestamp
        && request.resource.data.end > request.resource.data.start;
      allow update: if false;
    }
  }
}
```

- [ ] **Step 2: Live subscription** — import `initializeApp`, `getFirestore`, `collection`, `query`, `where`, `onSnapshot`, `addDoc`, `deleteDoc`, `doc`, `Timestamp` from the gstatic CDN. Subscribe to `blocks` where `start < visibleRange().end` (filter `end > range.start` client-side); resubscribe on navigation; unsubscribe the previous listener. Snapshot → `state.blocks` → `render()`. Error → banner "Couldn't load plans".
- [ ] **Step 3: Render blocks** — `group` blocks: solid, labeled, full column width, above layers. Personal blocks are already in the person's layer (Task 2 Step 4); add their title as a small label.
- [ ] **Step 4: Add form** — `<dialog>` with type (Group plan / Just me), title (`maxlength=80`, required), `<input type="date">`, two `<input type="time">`. Reject end ≤ start with inline message. `addDoc` with `who = type === 'group' ? 'group' : state.me`.
- [ ] **Step 5: Delete** — clicking a block opens `confirm("Delete “{title}”?")` → `deleteDoc`. Only offered on group blocks and on your own personal blocks.
- [ ] **Step 6: Manual check** — with a test Firebase project and rules pasted in: add a group plan in one tab, it appears in a second tab without reload; add a "Just me" block, your layer darkens and green shrinks; delete it; try a 81-char title via console `addDoc` → rejected by rules.
- [ ] **Step 7: Commit** — `git add index.html firestore.rules && git commit -m "feat: shared plans and personal blocks via Firestore"`

---

### Task 4: Setup guide and deploy

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** — the four setup steps from the spec's "One-time setup" section, with exact Google UI paths; how to restrict the API key (Application restrictions → Websites → `https://<user>.github.io/*`, API restrictions → Google Calendar API); where to paste emails/keys; `node test.mjs` to run the check; `python3 -m http.server` for local use.
- [ ] **Step 2: Verify** — `node test.mjs` prints `ok`; page loads at 375px width with no horizontal scroll.
- [ ] **Step 3: Commit** — `git add README.md && git commit -m "docs: setup guide"`
- [ ] **Step 4: Deploy (with Nathan)** — create GitHub repo `crew-cal`, push, Settings → Pages → deploy from `main` root. Needs Nathan's GitHub login; confirm before pushing.
