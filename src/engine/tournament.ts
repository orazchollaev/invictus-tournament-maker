// engine/tournament.ts
import type { Team } from "../modules/teams/types"
import type { Group, Tournament } from "../modules/tournament/types"
import { uid, shuffle } from "./utils"
import {
  buildBracketRounds,
  buildEmptyBracketRounds,
  buildPureBracket,
  propagateWinners,
} from "./bracket"
import { buildGroupFixture, recalcStandings } from "./groups"

export function createTournament(
  name: string,
  teams: Team[],
  season = 1,
  seeded = false,
  orderedTeams?: Team[],
  groupCount?: number // if provided → group+bracket format
): Tournament {
  const format = groupCount && groupCount >= 2 ? "group+bracket" : "bracket"

  if (format === "group+bracket") {
    return createGroupBracketTournament(name, teams, season, seeded, groupCount!, orderedTeams)
  }

  // ── Pure bracket ──────────────────────────────────────────────
  const rounds = buildPureBracket(teams, seeded, orderedTeams)

  return {
    id: uid(),
    name,
    season,
    format: "bracket",
    teamIds: teams.map((t) => t.id),
    rounds,
    winnerId: null,
    createdAt: Date.now(),
  }
}

function createGroupBracketTournament(
  name: string,
  teams: Team[],
  season: number,
  seeded: boolean,
  groupCount: number,
  orderedTeams?: Team[]
): Tournament {
  let teamsToPlace: Team[]
  if (orderedTeams) {
    teamsToPlace = [...orderedTeams]
  } else if (seeded) {
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    teamsToPlace = []
    for (let i = 0; i < sorted.length; i += groupCount) {
      teamsToPlace.push(...shuffle(sorted.slice(i, i + groupCount)))
    }
  } else {
    teamsToPlace = shuffle([...teams])
  }

  const groups: Group[] = []
  for (let g = 0; g < groupCount; g++) {
    groups.push({
      name: `Group ${String.fromCharCode(65 + g)}`,
      teamIds: [],
      matches: [],
      standings: [],
    })
  }

  // Distribute teams round-robin into groups (snake if seeded)
  teamsToPlace.forEach((team, i) => {
    const g = i % groupCount
    groups[g].teamIds.push(team.id)
  })

  // Build round-robin matches + empty standings for each group
  for (const group of groups) {
    const ids = group.teamIds
    group.matches = buildGroupFixture(ids)
    group.standings = ids.map((teamId) => ({
      teamId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      pts: 0,
    }))
  }

  // Bracket will be built later (when group stage is done)
  const qualifierCount = groupCount * 2 // top-2 from each group
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(qualifierCount)))
  const emptyRounds = buildEmptyBracketRounds(bracketSize)

  return {
    id: uid(),
    name,
    season,
    format: "group+bracket",
    teamIds: teams.map((t) => t.id),
    groups,
    groupsDone: false,
    rounds: emptyRounds,
    winnerId: null,
    createdAt: Date.now(),
  }
}

// ─── Seed bracket from group results ────────────────────────────
// Classic cross-seeding: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C …
export function seedBracketFromGroups(tournament: Tournament, teams: Team[]) {
  if (!tournament.groups) return
  tournament.groups.forEach((g) => recalcStandings(g))

  const firsts = tournament.groups.map((g) => teams.find((t) => t.id === g.standings[0]?.teamId)!)
  const seconds = tournament.groups.map((g) => teams.find((t) => t.id === g.standings[1]?.teamId)!)

  // Cross-seed: 1A vs 2B, 1B vs 2A, … (pair groups in order)
  const bracketOrder: (Team | null)[] = []
  const gc = tournament.groups.length

  for (let i = 0; i < gc; i += 2) {
    bracketOrder.push(firsts[i] ?? null)
    bracketOrder.push(seconds[i + 1] ?? null)
  }
  for (let i = 1; i < gc; i += 2) {
    bracketOrder.push(firsts[i] ?? null)
    bracketOrder.push(seconds[i - 1] ?? null)
  }

  // Build slots for each bracket half. Byes (nulls) must each be paired with a real
  // team — never with another null — otherwise null-vs-null matches produce no winner
  // and the cascade breaks every subsequent round. Strategy: place each bye immediately
  // after its paired team at the start of the half, then pack remaining real matches.
  const size = Math.pow(2, Math.ceil(Math.log2(bracketOrder.filter(Boolean).length || 2)))
  const half = size / 2

  function buildHalfSlots(teams: (Team | null)[], targetSize: number): (Team | null)[] {
    const byes = targetSize - teams.filter(Boolean).length
    const slots: (Team | null)[] = []
    for (let i = 0; i < byes; i++) slots.push(teams[i] ?? null, null)
    for (let i = byes; i < teams.length; i++) slots.push(teams[i] ?? null)
    return slots
  }

  const rounds = buildBracketRounds([
    ...buildHalfSlots(bracketOrder.slice(0, gc), half),
    ...buildHalfSlots(bracketOrder.slice(gc), half),
  ])
  propagateWinners(rounds, teams)

  tournament.rounds = rounds
  tournament.groupsDone = true
}
