// engine/tournament.ts
import type { Team } from "../modules/teams/types"
import type { Group, Tournament, PlayoffSeedMode } from "../modules/tournament/types"
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
  groupCount?: number, // if provided → group+bracket format
  qualifiersPerGroup = 2
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
      orderedTeams
    )
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
  qualifiersPerGroup: number,
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

  teamsToPlace.forEach((team, i) => {
    const g = i % groupCount
    groups[g].teamIds.push(team.id)
  })

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

  // Clamp qualifiersPerGroup to smallest group size
  const minGroupSize = Math.floor(teams.length / groupCount)
  const clampedQpg = Math.max(1, Math.min(qualifiersPerGroup, minGroupSize))

  const qualifierCount = groupCount * clampedQpg
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(qualifierCount, 2))))
  const emptyRounds = buildEmptyBracketRounds(bracketSize)

  return {
    id: uid(),
    name,
    season,
    format: "group+bracket",
    teamIds: teams.map((t) => t.id),
    groups,
    groupsDone: false,
    qualifiersPerGroup: clampedQpg,
    rounds: emptyRounds,
    winnerId: null,
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

  tournament.groups.forEach((g) => recalcStandings(g))

  // byGroup[g][p]: team finishing at rank p (0-based) in group g
  const byGroup: (Team | null)[][] = tournament.groups.map((g) =>
    Array.from(
      { length: qpg },
      (_, p) => teams.find((t) => t.id === g.standings[p]?.teamId) ?? null
    )
  )

  const realCount = byGroup.flat().filter(Boolean).length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const half = size / 2

  // Slots helper: packs realTeams into targetSize with byes at the front
  function buildHalfSlots(halfTeams: (Team | null)[], targetSize: number): (Team | null)[] {
    const realTeams = halfTeams.filter(Boolean) as Team[]
    const byes = targetSize - realTeams.length
    const slots: (Team | null)[] = []
    for (let i = 0; i < byes; i++) slots.push(realTeams[i] ?? null, null)
    for (let i = byes; i < realTeams.length; i++) slots.push(realTeams[i])
    return slots
  }

  let firstHalf: (Team | null)[]
  let secondHalf: (Team | null)[]

  if (mode === "random") {
    const all = shuffle(byGroup.flat())
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
  }

  const rounds = buildBracketRounds([
    ...buildHalfSlots(firstHalf, half),
    ...buildHalfSlots(secondHalf, half),
  ])
  propagateWinners(rounds, teams)

  tournament.rounds = rounds
  tournament.groupsDone = true
}
