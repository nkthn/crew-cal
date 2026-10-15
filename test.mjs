import assert from 'node:assert/strict';
import { mergeIntervals, clip, freeSlots, dayRange, moveInterval, resizeInterval, occurrences, shiftSeries, slotAt } from './slots.js';
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
const MIN = 60000, at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();
// drag 1 day right, 30 min later
assert.deepEqual(moveInterval(I(at(16,19), at(16,21)), 1, 30 * MIN), I(at(17,19,30), at(17,21,30)));
// moving across the Nov 1 DST change keeps wall-clock time
const s31 = new Date(2026, 9, 31, 19).getTime(), e31 = new Date(2026, 9, 31, 21).getTime();
const moved = moveInterval(I(s31, e31), 1, 0);
assert.equal(new Date(moved.start).getHours(), 19);
assert.equal(new Date(moved.end).getHours(), 21);
// resize keeps at least 15 minutes
assert.deepEqual(resizeInterval(I(at(16,19), at(16,21)), 30 * MIN), I(at(16,19), at(16,21,30)));
assert.deepEqual(resizeInterval(I(at(16,19), at(16,21)), -3 * 60 * MIN), I(at(16,19), at(16,19,15)));
// --- recurrence ---
const H = 3600000, wk = (d, h) => new Date(2026, 9, d, h).getTime();      // Oct 2026
const gym = { start: wk(5, 18), end: wk(5, 19) };                             // Mon Oct 5, 6-7pm
const starts = (b, f, t) => occurrences(b, f, t).map(o => new Date(o.start).getDate());
assert.deepEqual(starts(gym, wk(1, 0), wk(31, 0)), [5]);                      // no repeat
assert.deepEqual(starts({ ...gym, repeat: { every: 'week', n: 1 } }, wk(1, 0), wk(31, 0)), [5, 12, 19, 26]);
assert.deepEqual(starts({ ...gym, repeat: { every: 'week', n: 2 } }, wk(1, 0), wk(31, 0)), [5, 19]);
assert.deepEqual(starts({ ...gym, repeat: { every: 'day', n: 1 } }, wk(5, 0), wk(8, 0)), [5, 6, 7]);
assert.deepEqual(starts({ ...gym, repeat: { every: 'week', n: 1, until: wk(19, 23) } }, wk(1, 0), wk(31, 0)), [5, 12, 19]);
assert.deepEqual(starts({ ...gym, repeat: { every: 'week', n: 1 }, skip: [wk(12, 18)] }, wk(1, 0), wk(31, 0)), [5, 19, 26]);
assert.equal(occurrences({ ...gym, repeat: { every: 'month', n: 1 } }, wk(1, 0), new Date(2027, 0, 1).getTime()).length, 3); // Oct, Nov, Dec
// weekly across the Nov 1 DST change keeps 6pm wall clock
const nov = occurrences({ ...gym, repeat: { every: 'week', n: 1 } }, new Date(2026, 10, 1).getTime(), new Date(2026, 10, 10).getTime());
assert.equal(new Date(nov[0].start).getHours(), 18);
assert.equal(nov[0].end - nov[0].start, H);
// "all in series": edited the Oct 19 occurrence to Tue 7-8:30pm -> series start moves to Tue Oct 6, 7pm
assert.deepEqual(shiftSeries(gym, wk(19, 18), new Date(2026, 9, 20, 19).getTime(), new Date(2026, 9, 20, 20, 30).getTime()),
  { start: wk(6, 19), end: wk(6, 19) + 1.5 * H });
// click-to-add: 1h slot starting at the half hour clicked, clamped to the day
const day = dayRange(new Date(2026, 9, 20), 8, 24), HR = 3600000;
assert.deepEqual(slotAt(day, 0.5), I(day.start + 8 * HR, day.start + 9 * HR));            // 4:00pm
assert.deepEqual(slotAt(day, (6.4) / 16), I(day.start + 6 * HR, day.start + 7 * HR));      // 2:24pm -> 2:00pm
assert.deepEqual(slotAt(day, (6.6) / 16), I(day.start + 6.5 * HR, day.start + 7.5 * HR));  // 2:36pm -> 2:30pm
assert.deepEqual(slotAt(day, 0.999), I(day.start + 15.5 * HR, day.end));                   // 11:30pm -> midnight
console.log('ok');
