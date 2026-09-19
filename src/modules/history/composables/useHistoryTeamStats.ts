import { computed, type ComputedRef } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { TeamStatEntry } from "../types"
import { playedMatches } from "@/engine"
import { useTeamRef } from "./useTeamRef"

interface MatchTally {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  cleanSheets: number
  title: boolean
}

interface TeamRecord {
  titles: number
  seasonNums: Set<number>
  perSeason: Map<number, MatchTally>
  all: Omit<MatchTally, "title">
}

function emptyTally(): MatchTally {
  return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, cleanSheets: 0, title: false }
}

/** All-time per-team record with a per-season breakdown, for the Team Stats tab. */
export function useHistoryTeamStats(completedSeasons: ComputedRef<Tournament[]>) {
  const { teamRef } = useTeamRef()

  const teamStats = computed<TeamStatEntry[]>(() => {
    const allTime = new Map<string, TeamRecord>()

    function getTeam(id: string): TeamRecord {
      let e = allTime.get(id)
      if (!e) {
        e = {
          titles: 0,
          seasonNums: new Set(),
          perSeason: new Map(),
          all: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, cleanSheets: 0 },
        }
        allTime.set(id, e)
      }
      return e
    }

    function getSeasonTally(teamId: string, season: number): MatchTally {
      const e = getTeam(teamId)
      e.seasonNums.add(season)
      let s = e.perSeason.get(season)
      if (!s) {
        s = emptyTally()
        e.perSeason.set(season, s)
      }
      return s
    }

    function addResult(teamId: string, season: number, goalsFor: number, goalsAgainst: number) {
      const e = getTeam(teamId)
      const s = getSeasonTally(teamId, season)
      for (const tally of [e.all, s] as MatchTally[]) {
        tally.played++
        tally.gf += goalsFor
        tally.ga += goalsAgainst
        if (goalsFor > goalsAgainst) tally.won++
        else if (goalsFor === goalsAgainst) tally.drawn++
        else tally.lost++
        if (goalsAgainst === 0) tally.cleanSheets++
      }
    }

    /** Records both sides of one played leg. */
    function addLeg(
      homeId: string | null,
      awayId: string | null,
      season: number,
      homeG: number,
      awayG: number
    ) {
      if (!homeId || !awayId) return
      addResult(homeId, season, homeG, awayG)
      addResult(awayId, season, awayG, homeG)
    }

    for (const t of completedSeasons.value) {
      for (const id of t.teamIds) getSeasonTally(id, t.season)

      // One walk over every container the season has, phases included — see the
      // note in useHistoryOverviewStats. Leg 2 already arrives with its venues
      // swapped, so there is nothing to flip here.
      for (const e of playedMatches(t)) {
        if (!e.homeId || !e.awayId || !e.result) continue
        addLeg(e.homeId, e.awayId, t.season, e.result.home, e.result.away)
      }

      if (t.winnerId) {
        getTeam(t.winnerId).titles++
        getSeasonTally(t.winnerId, t.season).title = true
      }
    }

    return [...allTime.entries()]
      .map(([teamId, data]) => ({
        teamId,
        ...teamRef(teamId),
        seasons: data.seasonNums.size,
        titles: data.titles,
        played: data.all.played,
        won: data.all.won,
        drawn: data.all.drawn,
        lost: data.all.lost,
        gf: data.all.gf,
        ga: data.all.ga,
        gd: data.all.gf - data.all.ga,
        cleanSheets: data.all.cleanSheets,
        seasonBreakdown: [...data.perSeason.entries()]
          .sort(([a], [b]) => a - b)
          .map(([season, ss]) => ({
            season,
            played: ss.played,
            won: ss.won,
            drawn: ss.drawn,
            lost: ss.lost,
            gf: ss.gf,
            ga: ss.ga,
            gd: ss.gf - ss.ga,
            cleanSheets: ss.cleanSheets,
            title: ss.title,
          })),
      }))
      .sort((a, b) => b.titles - a.titles || b.won - a.won || b.gf - a.gf)
  })

  return { teamStats }
}
