import { computed, type ComputedRef } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { AllTimeRow, LeagueSeasonEntry } from "../types"
import { useTeamRef } from "./useTeamRef"

/** Multi-tier leagues report on the top tier only. */
function topStandings(t: Tournament) {
  return t.tiers?.length ? t.tiers[0].league.standings : t.league?.standings
}

/** Per-season podiums and the aggregated all-time league table. */
export function useLeagueAllTime(completedSeasons: ComputedRef<Tournament[]>) {
  const { teamRef } = useTeamRef()

  const leagueSeasons = computed<LeagueSeasonEntry[]>(() =>
    completedSeasons.value.map((t) => {
      const getAt = (pos: number) => {
        const s = topStandings(t)?.[pos]
        return s ? { ...teamRef(s.teamId), pts: s.pts } : null
      }
      return { season: t.season, first: getAt(0), second: getAt(1), third: getAt(2) }
    })
  )

  const allTimeRows = computed<AllTimeRow[]>(() => {
    const map = new Map<string, AllTimeRow>()

    for (const t of completedSeasons.value) {
      const standings = topStandings(t)
      if (!standings) continue

      for (const s of standings) {
        const existing = map.get(s.teamId)
        if (existing) {
          existing.seasons++
          existing.played += s.played
          existing.won += s.won
          existing.drawn += s.drawn
          existing.lost += s.lost
          existing.gf += s.gf
          existing.ga += s.ga
          existing.gd += s.gd
          existing.pts += s.pts
          if (t.winnerId === s.teamId) existing.titles++
        } else {
          map.set(s.teamId, {
            teamId: s.teamId,
            ...teamRef(s.teamId),
            seasons: 1,
            titles: t.winnerId === s.teamId ? 1 : 0,
            played: s.played,
            won: s.won,
            drawn: s.drawn,
            lost: s.lost,
            gf: s.gf,
            ga: s.ga,
            gd: s.gd,
            pts: s.pts,
          })
        }
      }
    }

    return [...map.values()].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  })

  return { leagueSeasons, allTimeRows }
}
