// engine/morale.ts
//
// A team's mood, not its form. form.ts already reads points across the last
// five matches — a team that ground out four 1-0 wins and drew the fifth
// scores well there whether or not it *feels* like a team on a run. Morale
// is the streak itself: how many matches in a row have gone the same way,
// right up to now. A draw does not extend a run in either direction — it is
// not a bad result, just not the kind that builds momentum — so it caps
// whatever streak preceded it at neutral.
//
// Team level only, exactly like discipline.ts: no player data involved, so
// it rides the same `{homeId, awayId, result}` channel every simulator
// already passes through form.ts.
import type { MatchResult } from "../modules/tournament/types"

/** Power swing per match in the current streak. */
export const MORALE_STEP = 4

/** Cap on the swing, win or lose. */
export const MORALE_MAX = 12

/** How far back a streak is allowed to run. */
export const MORALE_STREAK_WINDOW = 5

interface MoraleMatch {
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
}

type StreakResult = "win" | "draw" | "loss"

function resultFor(id: string, m: MoraleMatch): StreakResult {
  const isHome = m.homeId === id
  const own = isHome ? m.result!.home : m.result!.away
  const opp = isHome ? m.result!.away : m.result!.home
  if (own > opp) return "win"
  if (own < opp) return "loss"
  return "draw"
}

/**
 * The power swing each team carries from its own current streak — positive
 * for a run of wins, negative for a run of losses, zero fresh off a draw or
 * with nothing played yet. `matches` is expected in playing order.
 */
export function computeMoraleAdjustments(
  teamIds: string[],
  matches: MoraleMatch[]
): Map<string, number> {
  const map = new Map<string, number>()

  for (const id of teamIds) {
    const relevant = matches
      .filter((m) => m.result != null && (m.homeId === id || m.awayId === id))
      .slice(-MORALE_STREAK_WINDOW)

    let streak = 0
    for (let i = relevant.length - 1; i >= 0; i--) {
      const outcome = resultFor(id, relevant[i])
      if (outcome === "draw") break
      if (streak === 0) {
        streak = outcome === "win" ? 1 : -1
        continue
      }
      const sameDirection = (streak > 0 && outcome === "win") || (streak < 0 && outcome === "loss")
      if (!sameDirection) break
      streak += streak > 0 ? 1 : -1
    }

    const adjustment = Math.max(-MORALE_MAX, Math.min(MORALE_MAX, streak * MORALE_STEP))
    map.set(id, adjustment)
  }

  return map
}
