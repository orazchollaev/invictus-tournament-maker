import type { Match } from "../types"
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"

export type DisplayMatch = Match & { _origRound: number; _origMatch: number }

export function connStroke(active: boolean): string {
  return active ? "var(--accent)" : "var(--border)"
}

export function connOpacity(active: boolean): number {
  return active ? 0.55 : 0.4
}

export function teamColor(teamId: string | null | undefined, teams: Team[]): string | null {
  if (!teamId) return null
  return teams.find((t) => t.id === teamId)?.color ?? null
}

export function winnerColor(match: Match | undefined, teams: Team[]): string | null {
  if (!match) return null
  const id = getWinnerId(match)
  return teamColor(id, teams)
}

export interface ConnInfo {
  ay: number
  by: number
  dy: number
  active: boolean
  topColor: string | null
  bottomColor: string | null
  forwardColor: string | null
  dimmed: boolean
  // per-side hover state for strand-level dimming
  hoverActive: boolean
  topHovered: boolean
  bottomHovered: boolean
}

export function buildConnInfo(
  ri: number,
  ci: number,
  displayRounds: DisplayMatch[][],
  teams: Team[],
  matchCenterY: (ri: number, mi: number) => number,
  hoveredTeamId: string | null,
  highlightEnabled: boolean,
  matchOffset = 0,
  connColorsEnabled = true
): ConnInfo {
  const topMatch = displayRounds[ri]?.[matchOffset + ci * 2]
  const bottomMatch = displayRounds[ri]?.[matchOffset + ci * 2 + 1]
  const destOffset = matchOffset > 0 ? matchOffset / 2 : 0
  const destMatch = displayRounds[ri + 1]?.[destOffset + ci]

  const topWinner = topMatch ? getWinnerId(topMatch) : null
  const bottomWinner = bottomMatch ? getWinnerId(bottomMatch) : null
  const active = !!(destMatch?.homeId && destMatch?.awayId)

  const topColor = connColorsEnabled && topWinner ? teamColor(topWinner, teams) : null
  const bottomColor = connColorsEnabled && bottomWinner ? teamColor(bottomWinner, teams) : null

  let advancingId: string | null = null
  if (topWinner && (destMatch?.homeId === topWinner || destMatch?.awayId === topWinner)) {
    advancingId = topWinner
  } else if (
    bottomWinner &&
    (destMatch?.homeId === bottomWinner || destMatch?.awayId === bottomWinner)
  ) {
    advancingId = bottomWinner
  }
  const forwardColor = connColorsEnabled && advancingId ? teamColor(advancingId, teams) : null

  const hoverActive = highlightEnabled && hoveredTeamId != null
  const topHovered =
    hoverActive && !!(topMatch?.homeId === hoveredTeamId || topMatch?.awayId === hoveredTeamId)
  const bottomHovered =
    hoverActive &&
    !!(bottomMatch?.homeId === hoveredTeamId || bottomMatch?.awayId === hoveredTeamId)

  let dimmed = false
  if (hoverActive) {
    const onPath =
      destMatch?.homeId === hoveredTeamId ||
      destMatch?.awayId === hoveredTeamId ||
      topMatch?.homeId === hoveredTeamId ||
      topMatch?.awayId === hoveredTeamId ||
      bottomMatch?.homeId === hoveredTeamId ||
      bottomMatch?.awayId === hoveredTeamId
    dimmed = !onPath
  }

  return {
    ay: matchCenterY(ri, ci * 2),
    by: matchCenterY(ri, ci * 2 + 1),
    dy: matchCenterY(ri + 1, ci),
    active,
    topColor,
    bottomColor,
    forwardColor,
    dimmed,
    hoverActive,
    topHovered,
    bottomHovered,
  }
}
