import type { Match } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"

export type DisplayMatch = Match & { _origRound: number; _origMatch: number }

export function teamColor(teamId: string | null | undefined, teams: Team[]): string | null {
  if (!teamId) return null
  return teams.find((t) => t.id === teamId)?.color ?? null
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

  // "advancing" = team is in the match AND (no result yet OR team won — not eliminated)
  const topAdvancing =
    hoverActive &&
    topMatch != null &&
    (topMatch.homeId === hoveredTeamId || topMatch.awayId === hoveredTeamId) &&
    (!topMatch.result || getWinnerId(topMatch) === hoveredTeamId)

  const bottomAdvancing =
    hoverActive &&
    bottomMatch != null &&
    (bottomMatch.homeId === hoveredTeamId || bottomMatch.awayId === hoveredTeamId) &&
    (!bottomMatch.result || getWinnerId(bottomMatch) === hoveredTeamId)

  const topHovered = topAdvancing
  const bottomHovered = bottomAdvancing

  let dimmed = false
  if (hoverActive) {
    const teamInDest = destMatch?.homeId === hoveredTeamId || destMatch?.awayId === hoveredTeamId
    dimmed = !topAdvancing && !bottomAdvancing && !teamInDest
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

/** One drawn strand of a connector: an SVG path plus how to stroke it. */
export interface ConnectorSegment {
  d: string
  stroke: string
  opacity: number
  w: number
}

/**
 * The two strands of an elbow connector, one per team feeding the next match.
 *
 * One path per strand rather than three — the same elbow shape with 66% fewer
 * path elements per connector, which matters most on the double-sided layout
 * with its four columns of them.
 *
 * `side` only flips which end the arms start from: on the left half they run
 * right towards the final, on the right half they run left.
 */
export function connectorSegments(
  p: ConnInfo,
  w: number,
  side: "left" | "right"
): ConnectorSegment[] {
  const m = w / 2
  const yMid = (p.ay + p.by) / 2
  const base = p.active ? "var(--accent)" : "var(--border)"
  const baseOp = p.active ? 0.55 : 0.4
  const dimOp = 0.08

  const strandOpacity = (hovered: boolean, hasColor: boolean) => {
    if (p.dimmed) return dimOp
    if (p.hoverActive) return hovered ? 0.9 : dimOp
    return hasColor ? 0.85 : baseOp
  }

  const [from, to] = side === "left" ? [0, w] : [w, 0]

  return [
    {
      d: `M${from},${p.ay} H${m} V${yMid - 1} H${to}`,
      stroke: p.topColor ?? base,
      opacity: strandOpacity(p.topHovered, !!p.topColor),
      w: 2,
    },
    {
      d: `M${from},${p.by} H${m} V${yMid + 1} H${to}`,
      stroke: p.bottomColor ?? base,
      opacity: strandOpacity(p.bottomHovered, !!p.bottomColor),
      w: 2,
    },
  ]
}
