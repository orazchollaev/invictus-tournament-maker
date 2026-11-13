// engine/promotion.ts
//
// Who goes up and who goes down at the end of a season.
//
// Multi-tier league: between every pair of adjacent divisions, the top
// `promotionCount` of the lower one swap with the bottom of the upper one.
// Optionally, the next `promotionPlayoffSize` places of the lower division play
// a knockout, and its winner goes up as well — which sends one more team of the
// division above down, so every division keeps its size.
//
// The play-off is stored as an ordinary knockout phase in `t.phases`, tagged
// with `promotionTier`. That is the whole trick: the custom format's phase
// plumbing already handles result entry, simulation, fixtures, manager mode and
// stats for a knockout phase, so a play-off gets all of it without a container
// of its own.
//
// Custom format: a league phase can relegate its bottom N out of the tournament
// (`PhaseLeagueConfig.relegationCount`). Who replaces them is picked when the
// new season starts — the tournament has no division below to take them from.
import type { Team } from "../modules/teams/types"
import type { Tournament, TournamentPhase } from "../modules/tournament/types"
import { isTierDone } from "./league"
import { buildPhase, isPhaseComplete, phaseStandingIds } from "./customPhases"
import { createPhase } from "./phaseFactory"
import { isCustomFormat } from "./formats"

/** The play-off sizes the settings offer. 0 = no play-off. */
export const PROMOTION_PLAYOFF_SIZES = [0, 2, 4, 6, 8] as const

function tierSize(t: Tournament, tierIdx: number): number {
  return t.tiers?.[tierIdx]?.teamIds.length ?? 0
}

/** Direct promotion places out of each lower division. */
function directCount(t: Tournament): number {
  return Math.max(0, t.promotionCount ?? 0)
}

/**
 * The 1-based, inclusive places of `tierIdx`'s table that play its promotion
 * play-off, or null when it has none. Never for the top division, and never
 * reaching into the places that go down from this division themselves.
 */
export function promotionPlayoffRange(
  t: Pick<Tournament, "tiers" | "promotionCount" | "promotionPlayoffSize">,
  tierIdx: number
): { fromRank: number; toRank: number } | null {
  const tiers = t.tiers ?? []
  const size = t.promotionPlayoffSize ?? 0
  if (tierIdx < 1 || tierIdx >= tiers.length || size < 2) return null
  const direct = directCount(t as Tournament)
  const len = tierSize(t as Tournament, tierIdx)
  const isBottom = tierIdx === tiers.length - 1
  // The division's own relegation places are off limits: direct ones, plus the
  // extra one its own play-off below sends up.
  const below = isBottom ? 0 : direct + (promotionPlayoffRange(t, tierIdx + 1) ? 1 : 0)
  const fromRank = direct + 1
  const toRank = Math.min(direct + size, len - below)
  return toRank - fromRank + 1 >= 2 ? { fromRank, toRank } : null
}

/** How many of division `tierIdx` go down at season end. */
export function relegationCountFor(t: Tournament, tierIdx: number): number {
  const tiers = t.tiers ?? []
  if (tierIdx >= tiers.length - 1) return 0
  return directCount(t) + (promotionPlayoffRange(t, tierIdx + 1) ? 1 : 0)
}

/** How many of division `tierIdx` go up directly (play-off winners not included). */
export function directPromotionCountFor(t: Tournament, tierIdx: number): number {
  return tierIdx > 0 ? directCount(t) : 0
}

export function promotionPlayoffOf(t: Tournament, tierIdx: number): TournamentPhase | undefined {
  return t.phases?.find((p) => p.promotionTier === tierIdx)
}

function hasPlayedMatch(phase: TournamentPhase): boolean {
  return (phase.rounds ?? []).some((r) =>
    r.matches.some((m) => !!m.homeId && !!m.awayId && m.result !== null)
  )
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

/**
 * Brings every division's play-off in step with its table: drawn once the
 * division has finished, from the places the range names, best-placed seeded
 * first. A play-off nobody has kicked a ball in yet is redrawn (or removed)
 * when the table or the settings move under it; one already underway stays
 * as it is — its results are real and throwing them away would be worse than
 * a slightly stale field.
 *
 * Call after any change to a division's results or to the promotion settings.
 */
export function syncPromotionPlayoffs(t: Tournament, teams: Team[]) {
  if (isCustomFormat(t) || !t.tiers?.length) return
  for (let ti = 1; ti < t.tiers.length; ti++) {
    const range = promotionPlayoffRange(t, ti)
    const existing = promotionPlayoffOf(t, ti)
    const want = !!range && isTierDone(t, ti)
    const ids = want
      ? t.tiers[ti].league.standings.slice(range.fromRank - 1, range.toRank).map((s) => s.teamId)
      : []

    if (existing) {
      if (hasPlayedMatch(existing)) continue
      if (want && sameIds(existing.teamIds, ids)) continue
      t.phases = t.phases!.filter((p) => p !== existing)
    }
    if (!want) continue

    const phase = createPhase("knockout", {
      name: `${t.tiers[ti].name} Play-off`,
      config: {
        kind: "knockout",
        knockout: {
          seedMode: "seeded",
          hasThirdPlace: false,
          knockoutLegMode: "single",
          roundLegModes: {},
          finalLegMode: "single",
          thirdPlaceLegMode: "single",
          neutralFinal: true,
        },
      },
    })
    phase.promotionTier = ti
    buildPhase(phase, ids, teams, undefined, true)
    t.phases = [...(t.phases ?? []), phase]
  }
  if (t.phases && !t.phases.length) t.phases = undefined
}

/** Every play-off the settings call for has been drawn and played out. */
export function promotionPlayoffsDone(t: Tournament): boolean {
  if (isCustomFormat(t) || !t.tiers?.length) return true
  for (let ti = 1; ti < t.tiers.length; ti++) {
    if (!promotionPlayoffRange(t, ti)) continue
    const phase = promotionPlayoffOf(t, ti)
    if (!phase || !isPhaseComplete(phase)) return false
  }
  return true
}

export interface SeasonMoves {
  /** Each division's line-up for next season, top division first. */
  nextTierTeamIds: string[][]
  promoted: Set<string>
  relegated: Set<string>
  /** Promoted through a play-off rather than directly. */
  playoffWinners: Set<string>
}

/**
 * Next season's divisions from this season's tables and play-offs. A play-off
 * that has not finished promotes nobody, and then sends nobody down either, so
 * the divisions keep their sizes whatever state the season was left in.
 */
export function computeSeasonMoves(t: Tournament): SeasonMoves {
  const tiers = t.tiers ?? []
  const promoted = new Set<string>()
  const relegated = new Set<string>()
  const playoffWinners = new Set<string>()
  const up: string[][] = []
  const down: string[][] = []

  for (let i = 0; i < tiers.length - 1; i++) {
    const upper = tiers[i].league.standings
    const lower = tiers[i + 1].league.standings
    const goingUp = lower.slice(0, directCount(t)).map((s) => s.teamId)
    const playoff = promotionPlayoffOf(t, i + 1)
    if (playoff && isPhaseComplete(playoff)) {
      const winner = phaseStandingIds(playoff)[0]
      if (winner && !goingUp.includes(winner)) {
        goingUp.push(winner)
        playoffWinners.add(winner)
      }
    }
    const count = Math.min(goingUp.length, upper.length)
    const goingDown = upper.slice(upper.length - count).map((s) => s.teamId)
    up[i] = goingUp.slice(0, count)
    down[i] = goingDown
    up[i].forEach((id) => promoted.add(id))
    goingDown.forEach((id) => relegated.add(id))
  }

  const nextTierTeamIds = tiers.map((tier, i) => {
    const leaving = new Set([...(up[i - 1] ?? []), ...(down[i] ?? [])])
    const staying = tier.league.standings.map((s) => s.teamId).filter((id) => !leaving.has(id))
    return [...staying, ...(down[i - 1] ?? []), ...(up[i] ?? [])]
  })

  return { nextTierTeamIds, promoted, relegated, playoffWinners }
}

// ─── Custom format ───────────────────────────────────────────────

/**
 * The teams a custom tournament relegates this season: the bottom
 * `relegationCount` of every finished league phase that has one, in table
 * order. Empty until those phases have finished.
 */
export function customRelegatedIds(t: Tournament): string[] {
  if (!isCustomFormat(t)) return []
  const out: string[] = []
  for (const phase of t.phases ?? []) {
    if (phase.config.kind !== "league" || !phase.league) continue
    const n = Math.max(0, phase.config.league.relegationCount ?? 0)
    if (!n || !isPhaseComplete(phase)) continue
    const standings = phase.league.standings
    for (const s of standings.slice(Math.max(0, standings.length - n))) {
      if (!out.includes(s.teamId)) out.push(s.teamId)
    }
  }
  return out
}

/**
 * Who would come up to replace `count` relegated sides by default: the
 * strongest teams not already in the tournament.
 */
export function suggestReplacements(t: Tournament, allTeams: Team[], count: number): string[] {
  const inside = new Set(t.teamIds)
  return allTeams
    .filter((tm) => !inside.has(tm.id))
    .sort((a, b) => b.power - a.power)
    .slice(0, count)
    .map((tm) => tm.id)
}
