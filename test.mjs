import assert from 'node:assert/strict';
import { mergeIntervals, clip, freeSlots, dayRange, moveInterval, resizeInterval } from './slots.js';
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
console.log('ok');
