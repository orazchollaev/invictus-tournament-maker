// engine/periods.ts
//
// The shape of a football match in minutes, in one place. The event
// generator places minutes with it, the live match clock runs on it, and
// the extra-time simulator scales its goal rate by it — so a change to
// how long a match is cannot drift between them.

/** Normal time. */
export const REGULATION_MINUTES = 90

/** Extra time, played as two halves after 90. */
export const EXTRA_TIME_MINUTES = 30

/** The final whistle of a match that went the distance. */
export const FULL_TIME_MINUTES = REGULATION_MINUTES + EXTRA_TIME_MINUTES

/** Half time, and the break between the two extra-time halves. */
export const HALF_TIME_MINUTE = 45
export const EXTRA_TIME_HALF_MINUTE = REGULATION_MINUTES + EXTRA_TIME_MINUTES / 2

export type MatchPeriod = "regulation" | "extra"

/** How much stoppage each period can run to. */
export const MAX_STOPPAGE: Record<MatchPeriod, number> = { regulation: 5, extra: 3 }

/** The last scheduled minute of a period, before stoppage. */
export const PERIOD_END: Record<MatchPeriod, number> = {
  regulation: REGULATION_MINUTES,
  extra: FULL_TIME_MINUTES,
}

/** The first minute a period can be played in. */
export const PERIOD_START: Record<MatchPeriod, number> = {
  regulation: 1,
  extra: REGULATION_MINUTES + 1,
}
