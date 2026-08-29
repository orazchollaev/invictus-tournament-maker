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
import type { Tournament } from "@/modules/tournament/types"
import { forEachMatch, isBye } from "../matchIterator"
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

/**
 * Generate stats for every played match that does not have them yet.
 * Returns true when something was written, so callers can skip work.
 *
 * A match watched live has already had its narrative generated and played
 * on screen; that one is claimed from the pending stash rather than rolled
 * again, so the report matches what was watched.
 */
export function ensureMatchStats(t: Tournament, teams: Team[], players: Player[]): boolean {
  const teamLookup = new Map(teams.map((team) => [team.id, team]))
  const squads = squadsByTeam(players)
  let changed = false

  forEachMatch(t, (entry) => {
    const result = entry.result
    if (!result || isBye(entry) || result.stats !== undefined) return

    const leg = "leg" in entry.source ? entry.source.leg : 1
    const watched = claimWatchedMatch(pendingKey(entry.match.id, leg), result)
    if (watched) {
      result.stats = watched
      changed = true
      return
    }

    const homeTeam = teamLookup.get(entry.homeId as string)
    const awayTeam = teamLookup.get(entry.awayId as string)
    // `ft` is the score at 90', so the difference is what extra time
    // produced — enough to place those goals in the right minutes without
    // the commit path having to carry anything extra.
    const extraTime = extraTimeGoalsOf(result)

    result.stats = generateMatchStats({
      homeLineup: buildLineup(squads.get(entry.homeId as string) ?? []),
      awayLineup: buildLineup(squads.get(entry.awayId as string) ?? []),
      homePower: resolvePower(homeTeam),
      awayPower: resolvePower(awayTeam),
      homeGoals: result.home,
      awayGoals: result.away,
      ...(extraTime ? { extraTime } : {}),
      ...(result.penHome !== undefined && result.penAway !== undefined
        ? { penHome: result.penHome, penAway: result.penAway }
        : {}),
    })
    changed = true
  })

  return changed
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
