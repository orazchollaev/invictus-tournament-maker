// engine/fatigue.ts
//
// How tired a player is, read back out of his team's own match history —
// never stored as mutable state on the player, the same way form.ts and
// injuries.ts work. A player who starts every match climbs toward the cap;
// one who is rested sheds half of it every match he sits out, so a couple
// of matches on the bench clears most of it, but never all at once — a
// touch of yesterday's tiredness always carries into the next fixture.
//
// One computation (`computeFatigueByPlayer`) feeds every consumer: the match
// rating (a tired man plays worse), the AI's lineup draw (a tired man is
// picked less often, which is what "rotation" looks like without any
// persisted "usual XI"), and the injury roll (a tired man goes down more
// often).
import type { PlayerPosition } from "../modules/players/types"
import type { MatchResult } from "../modules/tournament/types"
import { REGULATION_MINUTES } from "./periods"

/** Fraction of a player's fatigue that survives one match to the next. */
export const FATIGUE_DECAY_PER_MATCH = 0.5

/**
 * Fatigue added by a full ninety minutes on the pitch.
 *
 * Chosen so a run of nineties climbs toward `FATIGUE_MAX` rather than hitting
 * it after a single match: an every-match ever-green settles at
 * `load / (1 - decay) = 0.4 / 0.5 = 0.8`, comfortably into "exhausted" but
 * never past it, and a single match's rest already sheds half of whatever
 * he carried in.
 */
export const FATIGUE_FULL_MATCH_LOAD = 0.4

/**
 * How much harder a position works a ninety than `FATIGUE_FULL_MATCH_LOAD`
 * alone assumes — a winger or a striker's game is mostly sprinting, a
 * keeper's is mostly standing, and a center-back sits somewhere in between.
 * `MID` is the reference the base load was tuned against, so it stays at 1.
 */
export const FATIGUE_POSITION_LOAD: Record<PlayerPosition, number> = {
  GK: 0.3,
  DEF: 0.75,
  MID: 1,
  FWD: 0.9,
}

/** 1.0 = fully cooked. Nothing pushes a player past it. */
export const FATIGUE_MAX = 1.0

/** Matches back a player's fatigue still owes anything to — beyond this, decay has already erased it. */
export const FATIGUE_HISTORY_WINDOW = 8

/** How much a full point of fatigue shaves off a match rating. */
const FATIGUE_RATING_SCALE = 0.5

/** How much power a fully fatigued starting XI costs its team. */
const FATIGUE_TEAM_POWER_SCALE = 8

/** How much of an AI lineup draw's weight a fully fatigued player loses. */
const FATIGUE_SAMPLE_PENALTY_SCALE = 0.7

/** How much more likely a fully fatigued player is to pick up an injury. */
const INJURY_FATIGUE_SCALE = 1.5

interface FatigueHistoryMatch {
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
}

/** Exported for liveMatch.ts's own, in-match fatigue reading — see `liveFatigueByPlayer`. */
export function clampFatigue(value: number): number {
  return Math.max(0, Math.min(FATIGUE_MAX, value))
}

/**
 * A team's players, and how tired each of them is after `matches` — its own
 * played fixtures, oldest first, the order every fixture list is already
 * stored in.
 *
 * Only the last `FATIGUE_HISTORY_WINDOW` of them matter: further back, decay
 * has already worn a contribution down to a couple of percent.
 */
export function computeFatigueByPlayer(
  teamId: string,
  matches: FatigueHistoryMatch[]
): Map<string, number> {
  const relevant = matches
    .filter((m) => m.result != null && (m.homeId === teamId || m.awayId === teamId))
    .slice(-FATIGUE_HISTORY_WINDOW)

  const fatigue = new Map<string, number>()

  for (const m of relevant) {
    const side = m.homeId === teamId ? "home" : "away"
    const lines = m.result?.stats?.lines ?? []
    const loadByPlayer = new Map<string, number>()
    for (const line of lines) {
      if (!line.playerId || line.side !== side) continue
      const minutes = line.minutesPlayed ?? REGULATION_MINUTES
      const load = matchLoad(minutes, line.position)
      loadByPlayer.set(line.playerId, (loadByPlayer.get(line.playerId) ?? 0) + load)
    }

    const ids = new Set([...fatigue.keys(), ...loadByPlayer.keys()])
    for (const id of ids) {
      const prev = fatigue.get(id) ?? 0
      const load = loadByPlayer.get(id) ?? 0
      fatigue.set(id, clampFatigue(prev * FATIGUE_DECAY_PER_MATCH + load))
    }
  }

  return fatigue
}

/** How much fatigue `minutes` on the pitch adds, at `position`'s own pace. */
function matchLoad(minutes: number, position?: PlayerPosition): number {
  const scale = position ? FATIGUE_POSITION_LOAD[position] : 1
  return (minutes / REGULATION_MINUTES) * FATIGUE_FULL_MATCH_LOAD * scale
}

/**
 * A player's fatigue after playing `minutes` more on top of `baseline` — the
 * in-match reading both a live match (every minute, see engine/liveMatch.ts)
 * and a finished one's report (once, at full time, see
 * engine/events/generate.ts) need, so it lives here once rather than twice.
 */
export function fatigueAfterMinutes(
  baseline: number,
  minutes: number,
  position?: PlayerPosition
): number {
  return clampFatigue(baseline + matchLoad(minutes, position))
}

/** Rating points lost to fatigue — a negative number, added straight into the total. */
export function fatigueRatingPenalty(fatigue: number): number {
  return 0 - FATIGUE_RATING_SCALE * clampFatigue(fatigue)
}

/** Mean fatigue over whichever of `playerIds` have an entry. 0 when none do. */
export function averageFatigue(
  fatigueByPlayer: Map<string, number>,
  playerIds: Iterable<string>
): number {
  const known = [...playerIds].filter((id) => fatigueByPlayer.has(id))
  if (!known.length) return 0
  return known.reduce((sum, id) => sum + (fatigueByPlayer.get(id) ?? 0), 0) / known.length
}

/**
 * Power a team loses for fielding a tired eleven — the mean fatigue of
 * `playerIds` (typically whoever it lined up last time out, the closest
 * thing to a "usual XI" an AI side has), scaled and turned negative so it
 * drops straight into an adjustments map.
 */
export function fatigueTeamPowerMalus(
  fatigueByPlayer: Map<string, number>,
  playerIds: string[]
): number {
  const mean = averageFatigue(fatigueByPlayer, playerIds)
  return 0 - FATIGUE_TEAM_POWER_SCALE * clampFatigue(mean)
}

/**
 * Weight multiplier for a tired player in the AI's power-weighted lineup
 * draw. 1 = no penalty; a fully fatigued player loses most of his weight,
 * but never all of it — an AI squad with nobody else fit still fields him.
 */
export function fatigueSampleWeightMultiplier(fatigue: number): number {
  return Math.max(0, 1 - FATIGUE_SAMPLE_PENALTY_SCALE * clampFatigue(fatigue))
}

/** How much a player's current fatigue multiplies his injury chance by. */
export function fatigueInjuryMultiplier(fatigue: number): number {
  return 1 + INJURY_FATIGUE_SCALE * clampFatigue(fatigue)
}

/**
 * The power malus each team carries into its next match from its own
 * fatigue — the mean tiredness of whoever it lined up last time out. Rides
 * the same `{homeId, awayId, result}` channel `computeFormAdjustments` and
 * `computeDisciplineAdjustments` already take, so it merges into the same
 * adjustments map in form.ts.
 *
 * There is no lineup yet for the match about to be played — `resolveSides`
 * runs before any side is picked — so the *last played* XI stands in for
 * "who is likely to start again." A live match, which does know its actual
 * XI up front, reads `computeFatigueByPlayer` directly instead (see
 * liveMatch.ts).
 */
export function computeFatigueTeamAdjustments(
  teamIds: string[],
  matches: FatigueHistoryMatch[]
): Map<string, number> {
  const map = new Map<string, number>()

  for (const id of teamIds) {
    const relevant = matches.filter((m) => m.result != null && (m.homeId === id || m.awayId === id))
    const fatigueByPlayer = computeFatigueByPlayer(id, relevant)

    const last = relevant[relevant.length - 1]
    const side = last?.homeId === id ? "home" : "away"
    const lastXI = (last?.result?.stats?.lines ?? [])
      .filter((l) => l.side === side && l.playerId)
      .map((l) => l.playerId as string)

    map.set(id, fatigueTeamPowerMalus(fatigueByPlayer, lastXI))
  }

  return map
}
