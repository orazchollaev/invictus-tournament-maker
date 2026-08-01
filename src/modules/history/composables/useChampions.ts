import { computed, type ComputedRef } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { ChampEntry, FinalEntry } from "../types"
import { buildScore } from "./matchFormat"
import { useTeamRef } from "./useTeamRef"

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

      const isLeague = t.format === "league" && (!!t.league || !!t.tiers?.length)

      const w = map.get(wId)
      if (w) {
        w.wins++
        if (!isLeague) w.finals++
      } else map.set(wId, { wins: 1, finals: isLeague ? 0 : 1 })

      if (isLeague) {
        // Playoff league → runner-up is the final's loser; otherwise the table's 2nd place.
        const playoffFinal = t.rounds[t.rounds.length - 1]?.matches[0]
        if (playoffFinal?.result) {
          countFinal(playoffFinal.homeId === wId ? playoffFinal.awayId : playoffFinal.homeId, wId)
        } else {
          const topStandings = t.tiers?.length ? t.tiers[0].league.standings : t.league?.standings
          countFinal(topStandings?.[1]?.teamId, wId)
        }
      } else {
        const fm = t.rounds[t.rounds.length - 1]?.matches[0]
        if (fm) countFinal(fm.homeId === wId ? fm.awayId : fm.homeId, wId)
      }
    }

    return [...map.entries()]
      .map(([teamId, data]) => ({ teamId, ...teamRef(teamId), ...data }))
      .sort((a, b) => b.wins - a.wins || b.finals - a.finals)
  })

  const finals = computed<FinalEntry[]>(() =>
    completedSeasons.value.map((t) => {
      const fm = t.rounds[t.rounds.length - 1]?.matches[0]
      const champ = teamRef(t.winnerId)
      const runner = teamRef(fm ? (fm.homeId === t.winnerId ? fm.awayId : fm.homeId) : null)
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
