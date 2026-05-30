import { computed } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"

export interface TeamStat {
  teamId: string
  name: string
  color: string
  played: number
  gf: number
  ga: number
}

export function useTournamentStats(tournament: () => Tournament | undefined, teams: () => Team[]) {
  const stats = computed<TeamStat[]>(() => {
    const t = tournament()
    if (!t) return []

    const map = new Map<string, TeamStat>()

    function getOrCreate(id: string): TeamStat {
      if (!map.has(id)) {
        const team = teams().find((tm) => tm.id === id)
        map.set(id, {
          teamId: id,
          name: team?.name ?? id,
          color: team?.color ?? "#888",
          played: 0,
          gf: 0,
          ga: 0,
        })
      }
      return map.get(id)!
    }

    // League matchday matches (single-tier)
    for (const matchday of t.league?.matchdays ?? []) {
      for (const match of matchday.matches) {
        if (!match.result) continue
        const home = getOrCreate(match.homeId)
        const away = getOrCreate(match.awayId)
        home.gf += match.result.home
        home.ga += match.result.away
        home.played++
        away.gf += match.result.away
        away.ga += match.result.home
        away.played++
      }
    }

    // Multi-tier league matchdays
    for (const tier of t.tiers ?? []) {
      for (const matchday of tier.league.matchdays) {
        for (const match of matchday.matches) {
          if (!match.result) continue
          const home = getOrCreate(match.homeId)
          const away = getOrCreate(match.awayId)
          home.gf += match.result.home
          home.ga += match.result.away
          home.played++
          away.gf += match.result.away
          away.ga += match.result.home
          away.played++
        }
      }
    }

    // Group stage matches
    for (const group of t.groups ?? []) {
      for (const match of group.matches) {
        if (!match.result) continue
        const home = getOrCreate(match.homeId)
        const away = getOrCreate(match.awayId)
        home.gf += match.result.home
        home.ga += match.result.away
        home.played++
        away.gf += match.result.away
        away.ga += match.result.home
        away.played++
      }
    }

    // Bracket matches (skip byes)
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (!match.result || !match.homeId || !match.awayId) continue
        const home = getOrCreate(match.homeId)
        const away = getOrCreate(match.awayId)
        home.gf += match.result.home
        home.ga += match.result.away
        home.played++
        away.gf += match.result.away
        away.ga += match.result.home
        away.played++
        // Leg 2: awayId plays at home, so goals are swapped
        if (match.leg2Result) {
          home.gf += match.leg2Result.away
          home.ga += match.leg2Result.home
          away.gf += match.leg2Result.home
          away.ga += match.leg2Result.away
        }
      }
    }

    return Array.from(map.values()).filter((s) => s.played > 0)
  })

  const topScorers = computed(() =>
    [...stats.value].sort((a, b) => b.gf - a.gf || a.ga - b.ga).slice(0, 20)
  )

  const bestDefense = computed(() =>
    [...stats.value].sort((a, b) => a.ga - b.ga || b.gf - a.gf).slice(0, 20)
  )

  const hasStats = computed(() => stats.value.length > 0)

  return { topScorers, bestDefense, hasStats }
}
