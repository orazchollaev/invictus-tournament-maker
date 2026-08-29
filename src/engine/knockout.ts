// engine/knockout.ts
//
// How a tie that must produce a winner is decided, in one place.
//
// The rule — play ninety, then extra time, then kicks — used to be written
// out at six separate call sites in the bracket and third-place slices,
// each of them a slightly different paraphrase of "if the score is level,
// take penalties". Extra time would have made that seven paraphrases, so
// the rule moved here instead and the call sites now ask for a decision.
import type { Team } from "../modules/teams/types"
import type { GroupMatch, Match, MatchResult } from "../modules/tournament/types"
import { simulateMatch, simulateExtraTime, simulateShootoutOutcome } from "./simulation"
import type { ShootoutOutcome } from "./shootout"

/** The other leg's score, in *this* leg's home/away frame. */
export interface AggregateOffset {
  home: number
  away: number
}

export interface KnockoutDecision {
  /** The score to record, carrying `ft` and the shootout tally where they apply. */
  result: MatchResult
  /** Present only when kicks were needed — the sequence that was actually rolled. */
  shootout?: ShootoutOutcome
  /** Goals scored in 91-120, already included in `result`. */
  extraTimeGoals?: { home: number; away: number }
}

/** Level on aggregate when an offset is given, level on this leg alone otherwise. */
function isLevel(home: number, away: number, offset?: AggregateOffset | null): boolean {
  if (!offset) return home === away
  return home + offset.home === away + offset.away
}

/**
 * Play a knockout tie out and report how it ended.
 *
 * Extra time is only reached when the tie is level *at the point the rule
 * applies* — on aggregate for the second leg of a two-legged tie, on the
 * scoreline alone for a one-off. Goals scored in extra time are folded into
 * `home`/`away` (that is the final score, and the one standings-style code
 * reads), with `ft` preserving the score at ninety so the a.e.t. marker and
 * the event generator both know what happened when.
 */
export function decideKnockoutResult(
  match: Match | GroupMatch,
  teams: Team[],
  opts?: { form?: Map<string, number>; aggregateOffset?: AggregateOffset | null }
): KnockoutDecision {
  const offset = opts?.aggregateOffset ?? null
  const ninety = simulateMatch(match, teams, opts?.form)

  if (!isLevel(ninety.home, ninety.away, offset)) {
    return { result: { ...ninety } }
  }

  const extra = simulateExtraTime(match, teams, opts?.form)
  const afterExtra = { home: ninety.home + extra.home, away: ninety.away + extra.away }

  if (!isLevel(afterExtra.home, afterExtra.away, offset)) {
    return {
      result: { ...afterExtra, ft: { ...ninety } },
      extraTimeGoals: extra,
    }
  }

  const shootout = simulateShootoutOutcome(match, teams)
  return {
    result: {
      ...afterExtra,
      // A goalless extra time still happened, and the timeline should say so.
      ft: { ...ninety },
      penHome: shootout.penHome,
      penAway: shootout.penAway,
    },
    shootout,
    extraTimeGoals: extra,
  }
}

/** Extra-time goals implied by a stored result — the inverse of the fold above. */
export function extraTimeGoalsOf(result: MatchResult): { home: number; away: number } | undefined {
  if (!result.ft) return undefined
  return { home: result.home - result.ft.home, away: result.away - result.ft.away }
}
