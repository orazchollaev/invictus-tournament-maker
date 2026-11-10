/**
 * Market weeks: Monday 00:00 UTC to Sunday 23:59 UTC, numbered from the first
 * Monday after the Unix epoch (1970-01-05, as 1970-01-01 was a Thursday).
 *
 * firestore.rules computes the same number from the server clock — keep the
 * two constants below in sync with `marketWeek()` there.
 */
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
export const FIRST_MONDAY_MS = 4 * 24 * 60 * 60 * 1000

export function weekOf(ms: number): number {
  return Math.floor((ms - FIRST_MONDAY_MS) / WEEK_MS)
}

/** First moment of a week, epoch ms. */
export function weekStart(week: number): number {
  return FIRST_MONDAY_MS + week * WEEK_MS
}
