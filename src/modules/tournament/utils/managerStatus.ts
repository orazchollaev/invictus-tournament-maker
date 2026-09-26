// modules/tournament/utils/managerStatus.ts
//
// Where the managed side stands right now, in one line: which stage it is in
// and how it is doing there — fourth in Group B, in the semi-final, knocked
// out in the quarter-final, champion.
//
// The stage is read off a single anchor fixture: the next one still to play,
// or, once there is none, the last one played. Names are returned raw — group
// and round names are engine labels the caller translates.
import type { GroupStanding, Match, Round, Tournament, TournamentPhase } from "../types"
import {
  allMatches,
  getLeaguePlayoffData,
  getLeaguePlayoffQualifierIds,
  getWinnerId,
  groupQualifierIds,
  isBye,
  isPhaseComplete,
  isTopTierDone,
  outgoingEdges,
  resolvePhaseQualifiers,
  type MatchEntry,
} from "@/engine"
import { nextManagedFixture } from "./managerFixtures"

export type ManagerStatus =
  | {
      kind: "table"
      stage: string
      position: number
      total: number
      /**
       * Set once the table is final and feeds a next stage: through to it
       * (waiting on its draw) or out. Absent while it is still being played,
       * or when nothing follows it.
       */
      state?: "qualified" | "out"
    }
  | { kind: "knockout"; stage: string | null; state: "alive" | "out" }
  | { kind: "champion" }

function lastPlayedFixture(t: Tournament, teamId: string): MatchEntry | null {
  const played = allMatches(t).filter(
    (e) => !isBye(e) && e.result != null && (e.homeId === teamId || e.awayId === teamId)
  )
  return played[played.length - 1] ?? null
}

/** The standings table the anchor fixture was played in. */
function standingsOf(t: Tournament, src: MatchEntry["source"]): GroupStanding[] | undefined {
  const phase = src.phaseId ? t.phases?.find((p) => p.id === src.phaseId) : undefined
  if (src.kind === "group") return (phase ?? t).groups?.[src.groupIdx]?.standings
  if (src.kind !== "league") return undefined
  if (phase) return phase.league?.standings
  if (src.tierIdx !== undefined) return t.tiers?.[src.tierIdx]?.league.standings
  return t.league?.standings
}

/**
 * Who a finished table sends on to the next stage, or null when the table is
 * not finished yet or nothing follows it.
 */
function onwardIds(t: Tournament, src: MatchEntry["source"]): string[] | null {
  if (src.phaseId) {
    const phase = t.phases?.find((p) => p.id === src.phaseId)
    if (!phase || !isPhaseComplete(phase)) return null
    const edges = outgoingEdges(t.phaseEdges ?? [], phase.id)
    if (!edges.length) return null
    return edges.flatMap((e) => resolvePhaseQualifiers(phase, e))
  }

  if (src.kind === "group") {
    const groups = t.groups ?? []
    if (!groups.every((g) => g.matches.every((m) => m.result !== null))) return null
    // The fixed format's groups and a custom group phase qualify by the same
    // rule; the phase version is the one that takes wildcards into account,
    // so hand it the fixed format's settings in a phase's shape.
    const asPhase = {
      config: {
        kind: "group",
        group: {
          qualifiersPerGroup: t.qualifiersPerGroup ?? 2,
          wildcardCount: t.wildcardCount ?? 0,
        },
      },
      groups,
    } as unknown as TournamentPhase
    return groupQualifierIds(asPhase)
  }

  if (src.kind === "league" && !src.tierIdx) {
    if (!getLeaguePlayoffData(t)?.enabled || !isTopTierDone(t)) return null
    return getLeaguePlayoffQualifierIds(t)
  }
  return null
}

function roundsOf(t: Tournament, src: MatchEntry["source"]): Round[] {
  const phase = src.phaseId ? t.phases?.find((p) => p.id === src.phaseId) : undefined
  return phase?.rounds ?? t.rounds
}

export function managerStatus(t: Tournament): ManagerStatus | null {
  const teamId = t.manager?.teamId
  if (!teamId) return null
  if (t.winnerId === teamId) return { kind: "champion" }

  const next = nextManagedFixture(t)
  const anchor = next ?? lastPlayedFixture(t, teamId)
  if (!anchor) return null
  const src = anchor.source

  if (src.kind === "group" || src.kind === "league") {
    const standings = standingsOf(t, src) ?? []
    const idx = standings.findIndex((s) => s.teamId === teamId)
    if (idx < 0) return null
    const stage =
      src.kind === "group" ? src.groupName : (src.tierName ?? src.phaseName ?? src.matchdayName)
    const status = { kind: "table" as const, stage, position: idx + 1, total: standings.length }
    const onward = next ? null : onwardIds(t, src)
    if (!onward) return status
    return { ...status, state: onward.includes(teamId) ? "qualified" : "out" }
  }

  if (src.kind === "third-place") {
    return { kind: "knockout", stage: null, state: next ? "alive" : "out" }
  }

  if (next) return { kind: "knockout", stage: src.roundName, state: "alive" }

  // Nothing left to play: either out, or through and waiting on the other
  // side of the draw to fill the next round.
  const match = anchor.match as Match
  const tieOpen = match.leg2Result === null
  const won = !tieOpen && getWinnerId(match) === teamId
  if (tieOpen) return { kind: "knockout", stage: src.roundName, state: "alive" }
  if (!won) return { kind: "knockout", stage: src.roundName, state: "out" }
  const nextRound = roundsOf(t, src)[src.roundIdx + 1]
  return { kind: "knockout", stage: nextRound?.name ?? src.roundName, state: "alive" }
}
