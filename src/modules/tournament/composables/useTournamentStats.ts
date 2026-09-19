import { computed } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { playedMatches } from "@/engine"

export interface TeamStat {
  teamId: string
  name: string
  color: string
  flag?: string
  image?: string
  played: number
  gf: number
  ga: number
}

/**
 * Goals for and against per team, across the whole tournament.
 *
 * Built from the match iterator rather than by walking each container in turn.
 * The hand-written version knew about the league, the tiers, the groups and the
 * bracket — which meant it silently skipped the third-place match in every
 * format, counted a two-legged tie as one match played while adding both legs'
 * goals, and reported nothing at all for a custom tournament, whose fixtures
 * live inside its phases. One walk covers all of them, and byes and pending
 * ties are already excluded (see engine/matchIterator.ts).
 */
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
          flag: team?.flag,
          image: team?.image,
          played: 0,
          gf: 0,
          ga: 0,
        })
      }
      return map.get(id)!
    }

    for (const entry of playedMatches(t)) {
      // Every entry is a real, played fixture with both sides filled in, and a
      // second leg arrives already flipped into its own home/away frame — so the
      // score reads the same way round for every one of them.
      if (!entry.homeId || !entry.awayId || !entry.result) continue
      const home = getOrCreate(entry.homeId)
      const away = getOrCreate(entry.awayId)
      home.gf += entry.result.home
      home.ga += entry.result.away
      home.played++
      away.gf += entry.result.away
      away.ga += entry.result.home
      away.played++
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
