// engine/leaguePlayoff.ts
import type { Team } from "../modules/teams/types"
import type {
  Tournament,
  League,
  LeaguePlayoff,
  LeaguePlayoffSeedMode,
} from "../modules/tournament/types"
import { shuffle } from "./utils"
import { buildBracketRounds, propagateWinners, packDirectSlots, spreadByeSlots } from "./bracket"
import { allLeagueDone, isTierDone } from "./league"
import type { DrawPlan, DrawStep } from "./drawCeremony"

// Only the top tier (tiers[0]) ever carries playoff data — mirrors the
// existing `league` (single-tier) vs `tiers[].league` (multi-tier) duality.
export function getLeaguePlayoffData(tournament: Tournament): LeaguePlayoff | undefined {
  return tournament.tiers?.length ? tournament.tiers[0].playoff : tournament.leaguePlayoff
}

export function setLeaguePlayoffData(tournament: Tournament, data: LeaguePlayoff) {
  if (tournament.tiers?.length) tournament.tiers[0].playoff = data
  else tournament.leaguePlayoff = data
}

function getTopLeague(tournament: Tournament): League | undefined {
  return tournament.tiers?.length ? tournament.tiers[0].league : tournament.league
}

export function isTopTierDone(tournament: Tournament): boolean {
  if (tournament.tiers?.length) return isTierDone(tournament, 0)
  return allLeagueDone(tournament)
}

export function canStartLeaguePlayoff(tournament: Tournament): boolean {
  const data = getLeaguePlayoffData(tournament)
  if (!data?.enabled || data.started) return false
  return isTopTierDone(tournament)
}

// Top `qualifierCount` teams of the final table, in rank order.
export function getLeaguePlayoffQualifierIds(tournament: Tournament): string[] {
  const data = getLeaguePlayoffData(tournament)
  const league = getTopLeague(tournament)
  if (!data || !league) return []
  return league.standings.slice(0, data.qualifierCount).map((s) => s.teamId)
}

// Seeds the knockout bracket from the top-N qualifiers of the final table,
// reusing the same bye-spreading/bracket-building engine as the group playoff.
export function seedLeaguePlayoffBracket(
  tournament: Tournament,
  teams: Team[],
  mode: LeaguePlayoffSeedMode,
  orderedTeamIds?: string[]
) {
  const data = getLeaguePlayoffData(tournament)
  if (!data) return

  const qualifierIds = getLeaguePlayoffQualifierIds(tournament)
  const realCount = qualifierIds.length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const matchSlotCount = size / 2
  const byeCount = size - realCount

  // seeded → table order (byes to top ranks); random → shuffle; manual → drawn order.
  const idsForSlots =
    mode === "manual" && orderedTeamIds
      ? orderedTeamIds
      : mode === "random"
        ? shuffle(qualifierIds)
        : qualifierIds
  const slots = packDirectSlots(idsForSlots, byeCount, matchSlotCount, teams)

  const rounds = buildBracketRounds(slots)

  if (tournament.knockoutLegMode === "double") {
    for (let r = 0; r < rounds.length - 1; r++) {
      rounds[r].matches.forEach((m) => {
        const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
        if (!isBye) m.leg2Result = null
      })
    }
  }
  if (tournament.finalLegMode === "double" && rounds.length > 0) {
    rounds[rounds.length - 1].matches.forEach((m) => {
      const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
      if (!isBye) m.leg2Result = null
    })
  }

  propagateWinners(rounds, teams)
  tournament.rounds = rounds
  data.started = true
}

// Deterministic reveal plan for the "seeded" ceremony: byes to the top-ranked
// qualifiers, then table-order matchups. Mirrors computeCrossDrawPlan so the
// animation and the committed bracket are always identical. Pots are locked.
export function computeLeaguePlayoffPlan(tournament: Tournament): DrawPlan {
  const ids = getLeaguePlayoffQualifierIds(tournament)
  const realCount = ids.length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const matchSlotCount = size / 2
  const byeCount = size - realCount

  // Which match slots hold a bye (spread across the tree), same as packDirectSlots.
  const byeSlotSet = new Set(spreadByeSlots(byeCount, matchSlotCount))
  const byeIds = ids.slice(0, byeCount)
  const restIds = ids.slice(byeCount)

  const sequence: DrawStep[] = []
  let byeIdx = 0
  let restIdx = 0
  let matchNo = 1
  for (let i = 0; i < matchSlotCount; i++) {
    if (byeSlotSet.has(i)) {
      const id = byeIds[byeIdx++]
      if (id) sequence.push({ teamId: id, potIdx: 0, targetLabel: `BYE ${byeIdx}` })
    } else {
      const home = restIds[restIdx++]
      const away = restIds[restIdx++]
      if (home) sequence.push({ teamId: home, potIdx: 0, targetLabel: `Match ${matchNo}` })
      if (away) sequence.push({ teamId: away, potIdx: 0, targetLabel: `Match ${matchNo}` })
      matchNo++
    }
  }

  return { sequence, orderedIds: ids }
}
