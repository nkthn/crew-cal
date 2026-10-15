// Pure interval math. Interval = { start, end } in epoch ms.

export function mergeIntervals(list) {
  const out = [];
  for (const { start, end } of [...list].sort((a, b) => a.start - b.start)) {
    const last = out[out.length - 1];
    if (last && start <= last.end) last.end = Math.max(last.end, end);
    else out.push({ start, end });
  }
  return out;
}

export function clip(list, from, to) {
  return list
    .map(({ start, end }) => ({ start: Math.max(start, from), end: Math.min(end, to) }))
    .filter(i => i.end > i.start);
}

// Gaps in [from, to] where nobody is busy. A null entry means that person's
// schedule is unknown, and unknown is not free.
export function freeSlots(busyByPerson, from, to) {
  if (busyByPerson.some(b => b === null)) return [];
  const free = [];
  let cursor = from;
  for (const b of mergeIntervals(clip(busyByPerson.flat(), from, to))) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = b.end;
  }
  if (cursor < to) free.push({ start: cursor, end: to });
  return free;
}

// Local-time window for a calendar day; Date rolls hour 24 to next midnight,
// which keeps DST days correct (no fixed 86400000 math).
export function dayRange(date, startHour, endHour) {
  const [y, m, d] = [date.getFullYear(), date.getMonth(), date.getDate()];
  return { start: new Date(y, m, d, startHour).getTime(), end: new Date(y, m, d, endHour).getTime() };
}

// Shift by whole local days (DST-safe) plus a millisecond offset; duration kept.
export function moveInterval({ start, end }, days, ms) {
  const s = new Date(start);
  s.setDate(s.getDate() + days);
  const newStart = s.getTime() + ms;
  return { start: newStart, end: newStart + (end - start) };
}

// Move the end by ms, never shorter than minMs.
export function resizeInterval({ start, end }, ms, minMs = 15 * 60000) {
  return { start, end: Math.max(start + minMs, end + ms) };
}

// Expand a block into the occurrences overlapping [from, to).
// block.repeat = { every: 'day' | 'week' | 'month', n, until? } ; block.skip = [occurrence start ms]
// Each occurrence is computed from the original start with local Date math, so wall-clock time survives DST.
// ponytail: monthly on the 29th-31st rolls into the next month (Date overflow); clamp if anyone books those
export function occurrences(block, from, to) {
  const dur = block.end - block.start;
  if (!block.repeat) return block.end > from && block.start < to ? [{ start: block.start, end: block.end, occ: block.start }] : [];
  const { every, n = 1, until = Infinity } = block.repeat, skip = new Set(block.skip ?? []), out = [];
  for (let k = 0; k < 5000; k++) {
    const d = new Date(block.start);
    if (every === 'day') d.setDate(d.getDate() + k * n);
    else if (every === 'week') d.setDate(d.getDate() + 7 * k * n);
    else d.setMonth(d.getMonth() + k * n);
    const s = d.getTime();
    if (s >= to || s > until) break;
    if (s + dur > from && !skip.has(s)) out.push({ start: s, end: s + dur, occ: s });
  }
  return out;
}

// "Edit all in series": one occurrence moved from occStart to newStart..newEnd;
// shift the series' first start by the same days + time-of-day change.
export function shiftSeries(series, occStart, newStart, newEnd) {
  const midnight = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const days = Math.round((midnight(newStart) - midnight(occStart)) / 86400000);
  const ms = (newStart - midnight(newStart)) - (occStart - midnight(occStart));
  const start = moveInterval({ start: series.start, end: series.start }, days, ms).start;
  return { start, end: start + (newEnd - newStart) };
}

// Click-to-add: `fraction` (0..1) down a day column -> a block starting on that
// step boundary, `lenMs` long, clamped to the end of the visible day.
export function slotAt(range, fraction, stepMs = 30 * 60000, lenMs = 60 * 60000) {
  const start = range.start + Math.floor(fraction * (range.end - range.start) / stepMs) * stepMs;
  return { start, end: Math.min(start + lenMs, range.end) };
}
