// engine/leaguePlayoff.ts
import type { Team } from "../modules/teams/types"
import type {
  Tournament,
  League,
  LeaguePlayoff,
  LeaguePlayoffSeedMode,
  Round,
} from "../modules/tournament/types"
import { uid, shuffle } from "./utils"
import { buildBracketRounds, propagateWinners, packDirectSlots, getWinnerId } from "./bracket"
import { allLeagueDone, isTierDone } from "./league"

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

// Pairs ranks [directCount, directCount+playInTeamCount) first-vs-last
// (rank directCount+1 vs the last play-in rank, etc — "7v10, 8v9" style).
export function buildLeaguePlayInPairs(tournament: Tournament): Round | null {
  const data = getLeaguePlayoffData(tournament)
  const league = getTopLeague(tournament)
  if (!data || !league || data.playInTeamCount <= 0) return null

  const pool = league.standings.slice(data.directCount, data.directCount + data.playInTeamCount)
  const pairCount = Math.floor(pool.length / 2)
  if (pairCount <= 0) return null

  const matches = Array.from({ length: pairCount }, (_, i) => ({
    id: uid(),
    homeId: pool[i].teamId,
    awayId: pool[pool.length - 1 - i].teamId,
    result: null,
  }))
  return { name: "Play-In", matches }
}

// One winner id per match, in pair order (pair i's winner inherits the better
// rank of its pair, so qualifier order stays priority-ordered for seeding/byes).
// Returns null if any play-in match is unresolved.
export function resolveLeaguePlayInWinners(playIn: Round): string[] | null {
  const winners: string[] = []
  for (const m of playIn.matches) {
    const winner = getWinnerId(m)
    if (!winner) return null
    winners.push(winner)
  }
  return winners
}

// Builds the play-in round (if needed) and stores it, or seeds the bracket
// directly when there's no play-in stage. The "Start Playoff" entry point.
export function startLeaguePlayIn(
  tournament: Tournament,
  teams: Team[],
  mode: LeaguePlayoffSeedMode
) {
  const data = getLeaguePlayoffData(tournament)
  if (!data || !canStartLeaguePlayoff(tournament)) return

  if (data.playInTeamCount > 0) {
    if (!data.playIn) data.playIn = buildLeaguePlayInPairs(tournament) ?? undefined
    if (data.playIn) return // wait for play-in results before seeding the bracket
  }
  seedLeaguePlayoffBracket(tournament, teams, mode)
}

export function setLeaguePlayInResult(
  tournament: Tournament,
  matchIdx: number,
  home: number,
  away: number
) {
  const data = getLeaguePlayoffData(tournament)
  const match = data?.playIn?.matches[matchIdx]
  if (!match) return
  match.result = { home, away }
}

// Seeds the final knockout bracket from direct qualifiers + play-in winners,
// reusing the same bye-spreading/bracket-building engine as group+bracket.
export function seedLeaguePlayoffBracket(
  tournament: Tournament,
  teams: Team[],
  mode: LeaguePlayoffSeedMode,
  orderedTeamIds?: string[]
) {
  const data = getLeaguePlayoffData(tournament)
  const league = getTopLeague(tournament)
  if (!data || !league) return

  const directIds = league.standings.slice(0, data.directCount).map((s) => s.teamId)

  let playInWinners: string[] = []
  if (data.playInTeamCount > 0) {
    if (!data.playIn) return
    const winners = resolveLeaguePlayInWinners(data.playIn)
    if (!winners) return
    playInWinners = winners
  }

  // Already priority-ordered: direct qualifiers by rank, then play-in winners
  // in pair order (best-remaining-rank first) — exactly what packDirectSlots
  // expects for placing byes on the strongest qualifiers.
  const qualifierIds = [...directIds, ...playInWinners]
  const realCount = qualifierIds.length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const matchSlotCount = size / 2
  const byeCount = size - realCount

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
