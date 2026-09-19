import { computed, type ComputedRef } from "vue"
import type { Match, Tournament } from "@/modules/tournament/types"
import type { ChampEntry, FinalEntry } from "../types"
import { buildScore } from "../utils/matchFormat"
import { useTeamRef } from "./useTeamRef"
import { finalPhase, isCustomFormat, isLeagueLike, phaseStandingIds } from "@/engine"

/**
 * The tie that decided the title, when one was played.
 *
 * A custom tournament keeps its fixtures inside its phases, so the title match
 * is the final of whichever phase the user marked as the final — and when that
 * phase is a table, there is no match at all and the runner-up comes from the
 * standings instead.
 */
function decidingMatch(t: Tournament): Match | undefined {
  if (isCustomFormat(t)) {
    const phase = finalPhase(t)
    if (phase?.kind !== "knockout" || !phase.rounds?.length) return undefined
    return phase.rounds[phase.rounds.length - 1].matches[0]
  }
  return t.rounds[t.rounds.length - 1]?.matches[0]
}

/** Whether the title was settled by a table rather than by a final. */
function settledByTable(t: Tournament): boolean {
  if (isCustomFormat(t)) return finalPhase(t)?.kind !== "knockout"
  return isLeagueLike(t) && (!!t.league || !!t.tiers?.length)
}

/** Second place, read off whichever structure decided the title. */
function runnerUpOf(t: Tournament, winnerId: string): string | null | undefined {
  const match = decidingMatch(t)
  if (match) return match.homeId === winnerId ? match.awayId : match.homeId
  if (isCustomFormat(t)) {
    const phase = finalPhase(t)
    return phase ? phaseStandingIds(phase)[1] : undefined
  }
  const topStandings = t.tiers?.length ? t.tiers[0].league.standings : t.league?.standings
  return topStandings?.[1]?.teamId
}

/** Title/runner-up tallies and the season-by-season list of finals. */
export function useChampions(completedSeasons: ComputedRef<Tournament[]>) {
  const { teamRef } = useTeamRef()

  const champions = computed<ChampEntry[]>(() => {
    const map = new Map<string, { wins: number; finals: number }>()

    function countFinal(teamId: string | null | undefined, winnerId: string) {
      if (!teamId || teamId === winnerId) return
      const entry = map.get(teamId)
      if (entry) entry.finals++
      else map.set(teamId, { wins: 0, finals: 1 })
    }

    for (const t of completedSeasons.value) {
      if (!t.winnerId) continue
      const wId = t.winnerId

      // Swiss counts as a league here: its champion comes from one table
      // (plus an optional playoff final), never from a group stage.
      const isLeague = settledByTable(t)

      const w = map.get(wId)
      if (w) {
        w.wins++
        if (!isLeague) w.finals++
      } else map.set(wId, { wins: 1, finals: isLeague ? 0 : 1 })

      countFinal(runnerUpOf(t, wId), wId)
    }

    return [...map.entries()]
      .map(([teamId, data]) => ({ teamId, ...teamRef(teamId), ...data }))
      .sort((a, b) => b.wins - a.wins || b.finals - a.finals)
  })

  const finals = computed<FinalEntry[]>(() =>
    completedSeasons.value.map((t) => {
      const fm = decidingMatch(t)
      const champ = teamRef(t.winnerId)
      const runner = teamRef(t.winnerId ? (runnerUpOf(t, t.winnerId) ?? null) : null)
      return {
        season: t.season,
        champName: champ.name,
        champColor: champ.color,
        champFlag: champ.flag,
        runnerName: runner.name,
        runnerColor: runner.color,
        runnerFlag: runner.flag,
        score: fm ? buildScore(fm, t.winnerId) : "?",
      }
    })
  )

  return { champions, finals }
}
