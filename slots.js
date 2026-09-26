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
