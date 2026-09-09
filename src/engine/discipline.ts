// engine/discipline.ts
//
// What a sending-off actually costs.
//
// Everywhere else in the engine the score comes first and the timeline is
// reconstructed to fit it (see events/generate.ts). A red card cannot work
// that way: a team down to ten men has to be weaker *in the match that is
// being simulated*, so the dismissal has to exist before the scoreline does.
// So it is rolled here, handed to the simulator as an input, stored on the
// result, and only then replayed by the event generator — which means the
// red on the timeline is the same red that shaped the score.
//
// Two effects, both at team level so they apply whether the shirt belongs to
// a registered player or to one of the anonymous slots a short squad leaves
// unfilled (see events/lineup.ts):
//
//   in-match  — the side plays the rest of the match a man down
//   next match — a small residual penalty, standing in for the suspension
//                and the reshuffled side that follows a dismissal
import type { MatchResult, RedCard } from "../modules/tournament/types"
import { REGULATION_MINUTES } from "./periods"

/** Chance of a side finishing a match with ten men. Matches the pre-v2.7.0 event rate. */
export const RED_CHANCE = 0.06

/** Earliest minute a dismissal is rolled for — a 3rd-minute red is a freak, not a model. */
const RED_MIN_MINUTE = 15

/**
 * Power a side loses for a *whole* match played a man down. Scaled by how
 * much of the match is left, so a 88th-minute red barely moves the score and
 * a 20th-minute one is close to decisive.
 */
export const RED_IN_MATCH_POWER_COST = 22

/** Residual penalty carried into the next match, per red card in the last one. */
export const RED_NEXT_MATCH_POWER_COST = 3

/** Cap on the residual, so a two-red match does not gut the following one. */
export const RED_NEXT_MATCH_POWER_CAP = 6

/**
 * Roll the dismissals for one match, before its score is simulated.
 *
 * Regulation only. Extra time is not known about at this point — a tie that
 * goes the distance can still pick up an extra-time red in the generated
 * timeline, but that one is cosmetic and never reaches a scoreline.
 */
export function rollMatchReds(rng: () => number = Math.random): RedCard[] {
  const reds: RedCard[] = []
  for (const side of ["home", "away"] as const) {
    if (rng() >= RED_CHANCE) continue
    const span = REGULATION_MINUTES - RED_MIN_MINUTE + 1
    reds.push({ side, minute: RED_MIN_MINUTE + Math.floor(rng() * span) })
  }
  return reds
}

/**
 * Power lost by each side for the remainder of the ninety.
 *
 * A red in the 45th costs half of `RED_IN_MATCH_POWER_COST`, one in the 90th
 * costs nothing — the match is already over by the time it happens.
 */
export function inMatchRedPenalty(reds: RedCard[] | undefined): { home: number; away: number } {
  const penalty = { home: 0, away: 0 }
  for (const red of reds ?? []) {
    const remaining = Math.max(0, REGULATION_MINUTES - red.minute) / REGULATION_MINUTES
    penalty[red.side] += RED_IN_MATCH_POWER_COST * remaining
  }
  return penalty
}

/**
 * Power lost in extra time by a side that was reduced in regulation. The
 * whole thirty minutes are played a man down, so the cost is not scaled.
 */
export function extraTimeRedPenalty(reds: RedCard[] | undefined): { home: number; away: number } {
  const penalty = { home: 0, away: 0 }
  for (const red of reds ?? []) penalty[red.side] += RED_IN_MATCH_POWER_COST
  return penalty
}

/**
 * The dismissals a stored result carries.
 *
 * `reds` is the authoritative record and is what a simulated result always
 * has. A hand-entered score has none, so the generated timeline is read
 * instead — that keeps a typed-in 0-0 with a red on it costing the team its
 * next match too, rather than silently doing nothing.
 */
export function redsOf(result: MatchResult | null | undefined): RedCard[] {
  if (!result) return []
  if (result.reds) return result.reds
  const events = result.stats?.events
  if (!events) return []
  return events
    .filter((e) => e.type === "red")
    .map((e) => ({ side: e.side, minute: e.minute }) satisfies RedCard)
}

interface DisciplineMatch {
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
}

/**
 * The residual penalty each team carries into its next match, keyed by team id.
 *
 * Only the team's most recent played match counts: a red card is served once,
 * not for the rest of the season. `matches` is expected in playing order, the
 * order every fixture list is already stored in.
 */
export function computeDisciplineAdjustments(
  teamIds: string[],
  matches: DisciplineMatch[]
): Map<string, number> {
  const lastReds = new Map<string, number>()

  for (const match of matches) {
    if (!match.result) continue
    const reds = redsOf(match.result)
    for (const id of [match.homeId, match.awayId]) {
      if (!id) continue
      const side = id === match.homeId ? "home" : "away"
      lastReds.set(id, reds.filter((r) => r.side === side).length)
    }
  }

  const map = new Map<string, number>()
  for (const id of teamIds) {
    const count = lastReds.get(id) ?? 0
    const cost = Math.min(count * RED_NEXT_MATCH_POWER_COST, RED_NEXT_MATCH_POWER_CAP)
    map.set(id, cost === 0 ? 0 : -cost)
  }
  return map
}
