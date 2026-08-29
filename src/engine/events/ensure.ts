// engine/events/ensure.ts
//
// Results are committed in a dozen places across the bracket, group,
// league and third-place slices. Rather than thread event generation
// through every one of them, this sweeps the tournament afterwards and
// fills in whatever is missing — the same shape as `recalcAllStandings`,
// which solved the same spread-out-mutation problem for tables.
//
// The sweep is idempotent: a result that already carries stats (or is
// explicitly marked `null`) is skipped, so repeated calls cost one pass
// over the match list and nothing more.
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"
import type { Tournament, MatchStats } from "@/modules/tournament/types"
import { forEachMatch, isBye, type MatchEntry } from "../matchIterator"
import { resolvePower } from "../power"
import { extraTimeGoalsOf } from "../knockout"
import { buildLineup } from "./lineup"
import { generateMatchStats } from "./generate"
import { claimWatchedMatch, pendingKey } from "./pending"

function squadsByTeam(players: Player[]): Map<string, Player[]> {
  const map = new Map<string, Player[]>()
  for (const player of players) {
    const squad = map.get(player.teamId)
    if (squad) squad.push(player)
    else map.set(player.teamId, [player])
  }
  return map
}

/** One match still missing its report — everything `generateMatchStats` needs, flattened to plain data so it can cross a `postMessage`. */
export interface PendingStatsJob {
  matchId: string
  leg: 1 | 2
  homeId: string
  awayId: string
  homeGoals: number
  awayGoals: number
  extraTime?: { home: number; away: number }
  penHome?: number
  penAway?: number
}

export interface StatsJobResult {
  matchId: string
  leg: 1 | 2
  stats: MatchStats
  /**
   * The score this report was generated for. A worker batch (see
   * `statsWorkerClient.ts`) can take long enough for the same match to be
   * re-edited before it replies — `applyStatsResults` checks this against
   * the live result so a stale report from the old score never gets
   * attached to a result that has since changed.
   */
  home: number
  away: number
  penHome?: number
  penAway?: number
}

function jobFor(entry: MatchEntry): PendingStatsJob | null {
  const result = entry.result
  if (!result || isBye(entry)) return null
  const leg = "leg" in entry.source ? entry.source.leg : 1
  const extraTime = extraTimeGoalsOf(result)
  return {
    matchId: entry.match.id,
    leg,
    homeId: entry.homeId as string,
    awayId: entry.awayId as string,
    homeGoals: result.home,
    awayGoals: result.away,
    ...(extraTime ? { extraTime } : {}),
    ...(result.penHome !== undefined && result.penAway !== undefined
      ? { penHome: result.penHome, penAway: result.penAway }
      : {}),
  }
}

/**
 * Claim stats for anything that was watched live — the report was already
 * generated and played on screen, so this reuses it instead of rolling
 * another one. The stash is an in-memory, main-thread-only map, so this
 * step can never move to a worker.
 *
 * Returns true when something was written.
 */
export function claimWatchedStats(t: Tournament): boolean {
  let changed = false
  forEachMatch(t, (entry) => {
    const result = entry.result
    if (!result || isBye(entry) || result.stats !== undefined) return
    const leg = "leg" in entry.source ? entry.source.leg : 1
    const watched = claimWatchedMatch(pendingKey(entry.match.id, leg), result)
    if (watched) {
      result.stats = watched
      changed = true
    }
  })
  return changed
}

/**
 * Every played match still missing a report after the watched-stash claim —
 * the ones actually worth generating. Plain data only, so the caller is free
 * to hand the list to a worker instead of generating on the main thread.
 */
export function pendingStatsJobs(t: Tournament): PendingStatsJob[] {
  const jobs: PendingStatsJob[] = []
  forEachMatch(t, (entry) => {
    if (entry.result?.stats !== undefined) return
    const job = jobFor(entry)
    if (job) jobs.push(job)
  })
  return jobs
}

/** Roll the report for one pending job. Pure — safe to run on a worker thread. */
export function computeStatsForJob(
  job: PendingStatsJob,
  teams: Team[],
  players: Player[]
): StatsJobResult {
  const teamLookup = new Map(teams.map((team) => [team.id, team]))
  const squads = squadsByTeam(players)
  const homeTeam = teamLookup.get(job.homeId)
  const awayTeam = teamLookup.get(job.awayId)

  const stats = generateMatchStats({
    homeLineup: buildLineup(squads.get(job.homeId) ?? []),
    awayLineup: buildLineup(squads.get(job.awayId) ?? []),
    homePower: resolvePower(homeTeam),
    awayPower: resolvePower(awayTeam),
    homeGoals: job.homeGoals,
    awayGoals: job.awayGoals,
    ...(job.extraTime ? { extraTime: job.extraTime } : {}),
    ...(job.penHome !== undefined && job.penAway !== undefined
      ? { penHome: job.penHome, penAway: job.penAway }
      : {}),
  })

  return {
    matchId: job.matchId,
    leg: job.leg,
    stats,
    home: job.homeGoals,
    away: job.awayGoals,
    ...(job.penHome !== undefined && job.penAway !== undefined
      ? { penHome: job.penHome, penAway: job.penAway }
      : {}),
  }
}

/** Write generated reports back onto the tournament's own (reactive) matches. */
export function applyStatsResults(t: Tournament, results: StatsJobResult[]): void {
  if (!results.length) return
  const byKey = new Map(results.map((r) => [`${r.matchId}:${r.leg}`, r]))
  forEachMatch(t, (entry) => {
    const result = entry.result
    if (!result || result.stats !== undefined) return
    const leg = "leg" in entry.source ? entry.source.leg : 1
    const r = byKey.get(`${entry.match.id}:${leg}`)
    if (!r) return
    // The score this was generated for must still match what's on the
    // match — otherwise it was re-edited while this report was in flight
    // (a worker batch, e.g. "Simulate All", is the only path slow enough
    // for that to happen) and the report is for a result that no longer
    // exists. Leave it missing; the next sweep will generate a fresh one.
    if (result.home !== r.home || result.away !== r.away) return
    if ((result.penHome ?? null) !== (r.penHome ?? null)) return
    if ((result.penAway ?? null) !== (r.penAway ?? null)) return
    result.stats = r.stats
  })
}

/**
 * Generate stats for every played match that does not have them yet.
 * Returns true when something was written, so callers can skip work.
 *
 * Synchronous, main-thread version — used by tests and by anything without
 * a Worker to hand the heavy lifting to. `ensureStatsFor` in the tournament
 * store uses the split (`claimWatchedStats` + `pendingStatsJobs` +
 * `computeStatsForJob`) instead, so score saves don't block on it.
 */
export function ensureMatchStats(t: Tournament, teams: Team[], players: Player[]): boolean {
  const watchedChanged = claimWatchedStats(t)
  const jobs = pendingStatsJobs(t)
  if (!jobs.length) return watchedChanged
  applyStatsResults(
    t,
    jobs.map((job) => computeStatsForJob(job, teams, players))
  )
  return true
}

/**
 * One-time upgrade pass. Every match already played when v2.2.0 first
 * runs is stamped `null` — no events are invented for history the user
 * played under the old engine. After this, `undefined` unambiguously
 * means "played under the new engine, needs generating".
 */
export function markLegacyMatchStats(t: Tournament): void {
  forEachMatch(t, (entry) => {
    if (entry.result && entry.result.stats === undefined) entry.result.stats = null
  })
}
