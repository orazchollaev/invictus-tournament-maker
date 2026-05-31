import { computed } from "vue"
import type { League, GroupMatch, GroupStanding } from "../types"
import type { Team } from "@/modules/teams/types"

export type ProgressMode = "position" | "points"

export interface ProgressDataset {
  teamId: string
  name: string
  color: string
  data: (number | null)[] // per matchday
}

function applyMatch(standings: Map<string, GroupStanding>, match: GroupMatch) {
  if (!match.result) return
  const ensure = (id: string) => {
    if (!standings.has(id)) {
      standings.set(id, {
        teamId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        pts: 0,
      })
    }
    return standings.get(id)!
  }
  const h = ensure(match.homeId)
  const a = ensure(match.awayId)
  h.played++
  a.played++
  h.gf += match.result.home
  h.ga += match.result.away
  a.gf += match.result.away
  a.ga += match.result.home
  h.gd = h.gf - h.ga
  a.gd = a.gf - a.ga
  if (match.result.home > match.result.away) {
    h.won++
    h.pts += 3
    a.lost++
  } else if (match.result.home < match.result.away) {
    a.won++
    a.pts += 3
    h.lost++
  } else {
    h.drawn++
    h.pts++
    a.drawn++
    a.pts++
  }
}

function rankTeams(standings: Map<string, GroupStanding>): string[] {
  return [...standings.values()]
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    .map((s) => s.teamId)
}

export function useLeagueProgress(
  league: () => League | undefined,
  teams: () => Team[],
  mode: () => ProgressMode
) {
  const labels = computed(() => league()?.matchdays.map((md) => md.name) ?? [])

  const datasets = computed<ProgressDataset[]>(() => {
    const l = league()
    if (!l || l.matchdays.length === 0) return []

    const teamMap = new Map(teams().map((t) => [t.id, t]))
    const standings = new Map<string, GroupStanding>()
    // track all team ids that appear
    const allTeamIds = new Set<string>()
    for (const md of l.matchdays) {
      for (const m of md.matches) {
        if (m.result) {
          allTeamIds.add(m.homeId)
          allTeamIds.add(m.awayId)
        }
      }
    }

    // per-team data arrays
    const dataMap = new Map<string, (number | null)[]>()
    for (const id of allTeamIds) dataMap.set(id, [])

    for (const md of l.matchdays) {
      const hasAnyResult = md.matches.some((m) => m.result)
      for (const match of md.matches) applyMatch(standings, match)

      const ranked = rankTeams(standings)
      const ptsMap = new Map([...standings.values()].map((s) => [s.teamId, s.pts]))

      for (const id of allTeamIds) {
        const arr = dataMap.get(id)!
        if (!hasAnyResult) {
          arr.push(null)
          continue
        }
        if (mode() === "position") {
          const pos = ranked.indexOf(id)
          arr.push(pos === -1 ? null : pos + 1)
        } else {
          arr.push(ptsMap.get(id) ?? null)
        }
      }
    }

    return [...allTeamIds].map((id) => {
      const team = teamMap.get(id)
      return {
        teamId: id,
        name: team?.name ?? id,
        color: team?.color ?? "#888",
        data: dataMap.get(id)!,
      }
    })
  })

  const hasData = computed(() => datasets.value.length > 0 && labels.value.length > 0)

  return { labels, datasets, hasData }
}
