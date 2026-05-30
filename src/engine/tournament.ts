// engine/tournament.ts
import type { Team } from "../modules/teams/types"
import type {
  Group,
  GroupStanding,
  Tournament,
  PlayoffSeedMode,
  LegMode,
} from "../modules/tournament/types"
import { uid, shuffle } from "./utils"
import {
  buildBracketRounds,
  buildEmptyBracketRounds,
  buildPureBracket,
  propagateWinners,
} from "./bracket"
import { buildGroupFixture, recalcStandings, selectWildcards } from "./groups"
import { buildLeagueMatchdays } from "./league"

export function createTournament(
  name: string,
  teams: Team[],
  season = 1,
  seeded = false,
  orderedTeams?: Team[],
  groupCount?: number, // if provided → group+bracket format
  qualifiersPerGroup = 2,
  wildcardCount = 0,
  groupLegMode: LegMode = "single",
  knockoutLegMode: LegMode = "single",
  finalLegMode: LegMode = "single"
): Tournament {
  const format = groupCount && groupCount >= 2 ? "group+bracket" : "bracket"

  if (format === "group+bracket") {
    return createGroupBracketTournament(
      name,
      teams,
      season,
      seeded,
      groupCount!,
      qualifiersPerGroup,
      orderedTeams,
      wildcardCount,
      groupLegMode,
      knockoutLegMode,
      finalLegMode
    )
  }

  // ── Pure bracket ──────────────────────────────────────────────
  const rounds = buildPureBracket(teams, seeded, orderedTeams)

  // Mark knockout rounds as double-leg (skip BYE matches — one side set, other null)
  if (knockoutLegMode === "double") {
    for (let r = 0; r < rounds.length - 1; r++) {
      rounds[r].matches.forEach((m) => {
        const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
        if (!isBye) m.leg2Result = null
      })
    }
  }
  if (finalLegMode === "double" && rounds.length > 0) {
    rounds[rounds.length - 1].matches.forEach((m) => {
      const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
      if (!isBye) m.leg2Result = null
    })
  }

  return {
    id: uid(),
    name,
    season,
    format: "bracket",
    teamIds: teams.map((t) => t.id),
    rounds,
    winnerId: null,
    groupLegMode,
    knockoutLegMode,
    finalLegMode,
    createdAt: Date.now(),
  }
}

function createGroupBracketTournament(
  name: string,
  teams: Team[],
  season: number,
  seeded: boolean,
  groupCount: number,
  qualifiersPerGroup: number,
  orderedTeams?: Team[],
  wildcardCount = 0,
  groupLegMode: LegMode = "single",
  knockoutLegMode: LegMode = "single",
  finalLegMode: LegMode = "single"
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

  teamsToPlace.forEach((team, i) => {
    const g = i % groupCount
    groups[g].teamIds.push(team.id)
  })

  for (const group of groups) {
    const ids = group.teamIds
    group.matches = buildGroupFixture(ids, groupLegMode === "double")
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

  // Clamp qualifiersPerGroup to smallest group size
  const minGroupSize = Math.floor(teams.length / groupCount)
  const clampedQpg = Math.max(1, Math.min(qualifiersPerGroup, minGroupSize))

  const clampedWildcards = Math.min(wildcardCount, groupCount)
  const qualifierCount = groupCount * clampedQpg + clampedWildcards
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(qualifierCount, 2))))
  const emptyRounds = buildEmptyBracketRounds(bracketSize)

  // Mark knockout rounds as double-leg
  if (knockoutLegMode === "double") {
    for (let r = 0; r < emptyRounds.length - 1; r++) {
      emptyRounds[r].matches.forEach((m) => {
        m.leg2Result = null
      })
    }
  }
  if (finalLegMode === "double" && emptyRounds.length > 0) {
    emptyRounds[emptyRounds.length - 1].matches.forEach((m) => {
      m.leg2Result = null
    })
  }

  return {
    id: uid(),
    name,
    season,
    format: "group+bracket",
    teamIds: teams.map((t) => t.id),
    groups,
    groupsDone: false,
    qualifiersPerGroup: clampedQpg,
    wildcardCount: clampedWildcards > 0 ? clampedWildcards : undefined,
    rounds: emptyRounds,
    winnerId: null,
    groupLegMode,
    knockoutLegMode,
    finalLegMode,
    createdAt: Date.now(),
  }
}

// ─── Seed bracket from group results ────────────────────────────
export function seedBracketFromGroups(
  tournament: Tournament,
  teams: Team[],
  mode: PlayoffSeedMode = "cross"
) {
  if (!tournament.groups) return
  const qpg = tournament.qualifiersPerGroup ?? 2
  const gc = tournament.groups.length
  const wcCount = tournament.wildcardCount ?? 0

  tournament.groups.forEach((g) => recalcStandings(g, tournament.tiebreaker))

  // byGroup[g][p]: team finishing at rank p (0-based) in group g
  const byGroup: (Team | null)[][] = tournament.groups.map((g) =>
    Array.from(
      { length: qpg },
      (_, p) => teams.find((t) => t.id === g.standings[p]?.teamId) ?? null
    )
  )

  // Wildcards: best wcCount teams at rank qpg across all groups
  const wildcards = wcCount > 0 ? selectWildcards(tournament.groups, qpg, wcCount, teams) : []

  const realCount = byGroup.flat().filter(Boolean).length + wildcards.length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const half = size / 2

  // Slots helper: packs realTeams into targetSize with byes at the front
  function buildHalfSlots(halfTeams: (Team | null)[], targetSize: number): (Team | null)[] {
    const realTeams = halfTeams.filter(Boolean) as Team[]
    const byes = Math.max(0, targetSize - realTeams.length)
    const slots: (Team | null)[] = []
    for (let i = 0; i < byes; i++) slots.push(realTeams[i] ?? null, null)
    for (let i = byes; i < realTeams.length; i++) slots.push(realTeams[i])
    return slots
  }

  // Returns which group index a team belongs to (-1 if not found)
  function groupIdxOf(team: Team | null): number {
    if (!team) return -1
    return tournament.groups!.findIndex((g) => g.teamIds.includes(team.id))
  }

  // Distribute wildcards into the half opposite their group's regular qualifiers.
  // Respects half capacity (max = half) to prevent buildHalfSlots overflow.
  function distributeWildcards(fh: (Team | null)[], sh: (Team | null)[]) {
    for (const wc of wildcards) {
      const fhFull = fh.filter(Boolean).length >= half
      const shFull = sh.filter(Boolean).length >= half
      const inFirst = fh.some((t) => groupIdxOf(t) === wc.fromGroupIdx)
      const inSecond = sh.some((t) => groupIdxOf(t) === wc.fromGroupIdx)
      if (shFull || (!fhFull && inSecond && !inFirst)) {
        fh.push(wc.team)
      } else if (fhFull || (inFirst && !inSecond)) {
        sh.push(wc.team)
      } else {
        // Both halves have same-group teams or neither does — balance
        if (fh.filter(Boolean).length <= sh.filter(Boolean).length) fh.push(wc.team)
        else sh.push(wc.team)
      }
    }
  }

  let firstHalf: (Team | null)[]
  let secondHalf: (Team | null)[]

  if (mode === "random") {
    const all = shuffle([...byGroup.flat(), ...wildcards.map((w) => w.team)])
    const mid = Math.ceil(all.length / 2)
    firstHalf = all.slice(0, mid)
    secondHalf = all.slice(mid)
  } else if (mode === "no-same-group") {
    // Interleave by finish position, reversing group order on odd positions.
    // Keeps same-group teams far apart in the bracket.
    const ordered: (Team | null)[] = []
    for (let p = 0; p < qpg; p++) {
      if (p % 2 === 0) {
        for (let g = 0; g < gc; g++) ordered.push(byGroup[g][p] ?? null)
      } else {
        for (let g = gc - 1; g >= 0; g--) ordered.push(byGroup[g][p] ?? null)
      }
    }
    const mid = Math.ceil(ordered.length / 2)
    firstHalf = ordered.slice(0, mid)
    secondHalf = ordered.slice(mid)
    distributeWildcards(firstHalf, secondHalf)
  } else {
    // "cross" — rank k from group i meets rank (qpg-1-k) from group j.
    // Adjacent groups are paired: (0,1), (2,3), ...
    // Works for any qpg; odd gc puts the unpaired group's qualifiers in alternating halves.
    firstHalf = []
    secondHalf = []
    for (let gi = 0; gi < gc; gi += 2) {
      const gj = gi + 1
      if (gj >= gc) {
        // Unpaired group: spread qualifiers across both halves alternately
        for (let k = 0; k < qpg; k++) {
          if (k % 2 === 0) firstHalf.push(byGroup[gi][k] ?? null)
          else secondHalf.push(byGroup[gi][k] ?? null)
        }
        continue
      }
      const pairCount = Math.floor(qpg / 2)
      for (let k = 0; k < pairCount; k++) {
        firstHalf.push(byGroup[gi][k] ?? null)
        firstHalf.push(byGroup[gj][qpg - 1 - k] ?? null)
        secondHalf.push(byGroup[gj][k] ?? null)
        secondHalf.push(byGroup[gi][qpg - 1 - k] ?? null)
      }
      // Middle rank for odd qpg (mirrors itself — one per half)
      if (qpg % 2 === 1) {
        const mid = Math.floor(qpg / 2)
        firstHalf.push(byGroup[gi][mid] ?? null)
        secondHalf.push(byGroup[gj][mid] ?? null)
      }
    }
    distributeWildcards(firstHalf, secondHalf)
  }

  const rounds = buildBracketRounds([
    ...buildHalfSlots(firstHalf, half),
    ...buildHalfSlots(secondHalf, half),
  ])

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
  tournament.groupsDone = true
}

// ─── League ──────────────────────────────────────────────────────
export function createLeague(
  name: string,
  teams: Team[],
  season = 1,
  legMode: LegMode = "single"
): Tournament {
  const teamIds = teams.map((t) => t.id)
  const matchdays = buildLeagueMatchdays(teamIds, legMode === "double")
  const standings: GroupStanding[] = teamIds.map((teamId) => ({
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
  return {
    id: uid(),
    name,
    season,
    format: "league",
    teamIds,
    league: { matchdays, standings, legMode },
    rounds: [],
    winnerId: null,
    createdAt: Date.now(),
  }
}
