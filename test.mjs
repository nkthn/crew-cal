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
