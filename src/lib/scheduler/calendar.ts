/**
 * Working-time arithmetic.
 *
 * All scheduling math runs in **working days**: weekends + holidays are
 * skipped. The hot path here is `addWorkingDays` and `diffWorkingDays`,
 * both of which are O(d) on the requested duration. For typical project
 * scales (<10k working days = ~40 years) this is fine; if you push
 * further, swap in a precomputed prefix-sum of working days per Date.
 */

import type { Calendar, CalendarException } from "./types";

const MS_PER_DAY = 86_400_000;

/** Default Mon–Fri 8h calendar used when no calendar is provided. */
export const DEFAULT_CALENDAR: Calendar = {
  id: "__default__",
  name: "Standard (Mon-Fri 8h)",
  workingDays: [1, 2, 3, 4, 5],
  workingHoursPerDay: 8,
  exceptions: [],
};

/** Strip time-of-day → midnight UTC. Stable across DST. */
export function startOfDay(d: Date | string): Date {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Index calendar exceptions by ISO date for O(1) lookup.
 * Pre-compute this once per calendar before running the scheduler.
 */
export function indexExceptions(cal: Calendar): Map<string, CalendarException> {
  const map = new Map<string, CalendarException>();
  for (const ex of cal.exceptions ?? []) map.set(ex.date, ex);
  return map;
}

export interface IndexedCalendar extends Calendar {
  __exceptions: Map<string, CalendarException>;
}

export function indexCalendar(cal: Calendar): IndexedCalendar {
  return { ...cal, __exceptions: indexExceptions(cal) };
}

/** True iff the given date is a working day under this calendar. */
export function isWorkingDay(date: Date, cal: IndexedCalendar): boolean {
  const ex = cal.__exceptions.get(isoDate(date));
  if (ex) return ex.isWorking;
  return cal.workingDays.includes(date.getUTCDay());
}

/**
 * Move `date` forward (or backward, if `n` is negative) by `n` working days,
 * skipping any non-working days. `addWorkingDays(d, 0)` snaps `d` to the
 * next working day if it isn't one already (forward direction).
 */
/** Hard cap to prevent any infinite loop from a degenerate calendar (e.g. workingDays=[]). */
const MAX_ITERATIONS = 100_000; // ~270 years of daily steps; far beyond any real project.

export function addWorkingDays(date: Date, n: number, cal: IndexedCalendar): Date {
  let cur = startOfDay(date);
  if (n === 0) {
    let i = 0;
    while (!isWorkingDay(cur, cal) && i++ < MAX_ITERATIONS) cur = new Date(cur.getTime() + MS_PER_DAY);
    return cur;
  }
  const step = n > 0 ? MS_PER_DAY : -MS_PER_DAY;
  let remaining = Math.abs(n);
  let i = 0;
  while (!isWorkingDay(cur, cal) && i++ < MAX_ITERATIONS) cur = new Date(cur.getTime() + step);
  i = 0;
  while (remaining > 0 && i++ < MAX_ITERATIONS) {
    cur = new Date(cur.getTime() + step);
    if (isWorkingDay(cur, cal)) remaining--;
  }
  return cur;
}

/**
 * Compute working-day distance from `from` (inclusive) to `to` (inclusive of `from`,
 * exclusive of `to`). Result represents how many working days fall in [from, to).
 *
 * If `to` < `from`, returns a negative number with the same magnitude.
 */
export function diffWorkingDays(from: Date, to: Date, cal: IndexedCalendar): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (a.getTime() === b.getTime()) return 0;
  const forward = b.getTime() > a.getTime();
  let cur = forward ? a : b;
  const end = forward ? b : a;
  let count = 0;
  let i = 0;
  while (cur.getTime() < end.getTime() && i++ < MAX_ITERATIONS) {
    if (isWorkingDay(cur, cal)) count++;
    cur = new Date(cur.getTime() + MS_PER_DAY);
  }
  return forward ? count : -count;
}

/**
 * Translate a duration-in-working-days into a (start, finish) pair. The
 * scheduler convention: `finish` is the END of the last working day, expressed
 * as the start of the *next* working day (exclusive end). This makes
 * "finish - start = duration" hold cleanly in working-day arithmetic.
 *
 * For a 0-duration milestone, start == finish.
 */
export function computeFinish(start: Date, durationDays: number, cal: IndexedCalendar): Date {
  if (durationDays <= 0) return startOfDay(start);
  // First working day = start; advance (duration) working days forward.
  return addWorkingDays(start, durationDays, cal);
}

/** Inverse of `computeFinish`. */
export function computeStart(finish: Date, durationDays: number, cal: IndexedCalendar): Date {
  if (durationDays <= 0) return startOfDay(finish);
  return addWorkingDays(finish, -durationDays, cal);
}
