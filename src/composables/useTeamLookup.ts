import { toValue } from "vue"
import type { MaybeRefOrGetter } from "vue"
import type { Team, TeamLike } from "@/modules/teams/types"

export function autoAbbr(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 7)
  const first = words[0].slice(0, 4)
  const rest = words
    .slice(1)
    .map((w) => w[0])
    .join("")
  return `${first} ${rest}.`.slice(0, 7)
}

export function teamAbbr(team: TeamLike): string {
  return team.abbr?.trim() || autoAbbr(team.name)
}

export function useTeamLookup(teams: MaybeRefOrGetter<Team[]>) {
  function teamById(id: string | null | undefined) {
    if (!id) return undefined
    return toValue(teams).find((t) => t.id === id)
  }

  function getTeamName(id: string | null | undefined) {
    if (!id) return "BYE"
    return teamById(id)?.name ?? "Unknown"
  }

  function getTeamAbbr(id: string | null | undefined) {
    if (!id) return "TBD"
    const t = teamById(id)
    return t ? teamAbbr(t) : "???"
  }

  function getTeamColor(id: string | null | undefined) {
    if (!id) return "#999"
    return teamById(id)?.color ?? "#999"
  }

  return { teamById, getTeamName, getTeamAbbr, getTeamColor }
}
