// engine/tournament.ts
import type { Team } from "../modules/teams/types"
import type {
  Group,
  GroupStanding,
  LeagueTier,
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
  spreadByeSlots,
} from "./bracket"
import { buildGroupFixture, recalcStandings, selectWildcards, rankTeamsByStanding } from "./groups"
import { buildLeagueMatchdays } from "./league"

export function legModeToCount(mode: LegMode): number {
  if (mode === "double") return 2
  if (mode === "triple") return 3
  if (mode === "quadruple") return 4
  return 1
}

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
    group.matches = buildGroupFixture(ids, legModeToCount(groupLegMode))
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

// ─── Cross playoff ordering ─────────────────────────────────────
//
// Rotating cross seeding for the common "2 qualifiers per group" case
// (winner + runner-up): group i's winner meets group (i+1)'s runner-up,
// wrapping around — e.g. A1–B2, B1–C2, C1–A2. Returns team ids in a
// bye-front / consecutive-pair layout (`[ ...byeTeams, ...pairedFlat ]`)
// that the "manual" directSlots packing turns into the right bracket.
// Byes go to the strongest group winners. Returns null for any other
// `qualifiersPerGroup` so callers fall back to the legacy adjacent cross.
export function crossPlayoffOrder(
  tournament: Tournament,
  teams: Team[]
): { ids: string[]; byeCount: number } | null {
  const groups = tournament.groups
  if (!groups) return null
  const qpg = tournament.qualifiersPerGroup ?? 2
  if (qpg !== 2) return null // legacy adjacent cross handles other sizes

  const gc = groups.length
  const wcCount = tournament.wildcardCount ?? 0
  const byId = (id?: string) => (id ? (teams.find((t) => t.id === id) ?? null) : null)

  const winners = groups.map((g) => byId(g.standings[0]?.teamId))
  const runners = groups.map((g) => byId(g.standings[1]?.teamId))
  const wildcards =
    wcCount > 0 ? selectWildcards(groups, qpg, wcCount, teams).map((w) => w.team) : []

  const realCount = [...winners, ...runners, ...wildcards].filter(Boolean).length || 2
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const byeCount = Math.max(0, size - realCount)

  // Bye recipients: strongest group winners first, then strongest runners-up if more are needed.
  const byeTeams = selectWildcards(groups, 0, Math.min(byeCount, gc), teams).map((w) => w.team)
  if (byeCount > byeTeams.length) {
    byeTeams.push(
      ...selectWildcards(groups, 1, byeCount - byeTeams.length, teams).map((w) => w.team)
    )
  }
  const byeIds = new Set(byeTeams.map((t) => t.id))

  // Rotating cross pairs; teams whose intended partner is on a bye become orphans.
  const paired: Team[] = []
  const orphans: Team[] = []
  for (let g = 0; g < gc; g++) {
    const w = winners[g]
    const r = runners[(g + 1) % gc]
    const wOk = !!w && !byeIds.has(w.id)
    const rOk = !!r && !byeIds.has(r.id)
    if (wOk && rOk) {
      paired.push(w as Team, r as Team)
    } else {
      if (wOk) orphans.push(w as Team)
      if (rOk) orphans.push(r as Team)
    }
  }
  // Wildcards (never byed) join the leftover pool and pair among themselves.
  orphans.push(...wildcards)

  const ids = [...byeTeams, ...paired, ...orphans].map((t) => t.id)
  return { ids, byeCount }
}

// ─── Seed bracket from group results ────────────────────────────
export function seedBracketFromGroups(
  tournament: Tournament,
  teams: Team[],
  mode: PlayoffSeedMode = "cross",
  orderedTeamIds?: string[]
) {
  if (!tournament.groups) return
  const qpg = tournament.qualifiersPerGroup ?? 2
  const gc = tournament.groups.length
  const wcCount = tournament.wildcardCount ?? 0

  tournament.groups.forEach((g) =>
    recalcStandings(
      g,
      tournament.tiebreaker,
      tournament.winPoints ?? 3,
      tournament.drawPoints ?? 1,
      tournament.lossPoints ?? 0
    )
  )

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

  // Slots helper: packs realTeams into targetSize, byes spread across match slots
  // (not front-packed) so they don't collide into the same round-2+ subtree.
  function buildHalfSlots(halfTeams: (Team | null)[], targetSize: number): (Team | null)[] {
    const realTeams = halfTeams.filter(Boolean) as Team[]
    const byes = Math.max(0, targetSize - realTeams.length)
    const matchSlots = targetSize / 2
    const byeTeams = realTeams.slice(0, byes)
    const rest = realTeams.slice(byes)
    const byeSlotSet = new Set(spreadByeSlots(byes, matchSlots))
    const slots: (Team | null)[] = new Array(targetSize).fill(null)
    let byeIdx = 0
    let restIdx = 0
    for (let i = 0; i < matchSlots; i++) {
      if (byeSlotSet.has(i)) {
        slots[i * 2] = byeTeams[byeIdx++] ?? null
      } else {
        slots[i * 2] = rest[restIdx++] ?? null
        slots[i * 2 + 1] = rest[restIdx++] ?? null
      }
    }
    return slots
  }

  // Packs bye recipients + remaining teams into round-1 slots directly (bypassing
  // the two-half split), spreading byes across match slots via bracketOrder.
  function buildDirectSlots(
    ids: string[],
    byeCount: number,
    matchSlotCount: number
  ): (Team | null)[] {
    const teamById = (id?: string) => (id ? (teams.find((t) => t.id === id) ?? null) : null)
    const byeIds = ids.slice(0, byeCount)
    const restIds = ids.slice(byeCount)
    const byeSlotSet = new Set(spreadByeSlots(byeCount, matchSlotCount))
    const slots: (Team | null)[] = new Array(matchSlotCount * 2).fill(null)
    let byeIdx = 0
    let restIdx = 0
    for (let i = 0; i < matchSlotCount; i++) {
      if (byeSlotSet.has(i)) {
        slots[i * 2] = teamById(byeIds[byeIdx++])
      } else {
        slots[i * 2] = teamById(restIds[restIdx++])
        slots[i * 2 + 1] = teamById(restIds[restIdx++])
      }
    }
    return slots
  }

  // Ranks a half's real teams by group-standings strength so the front-most
  // entries (which buildHalfSlots turns into byes) are the best finishers.
  function prioritizeByesByStanding(bracketHalf: (Team | null)[]): (Team | null)[] {
    if (!tournament.groups) return bracketHalf
    const real = bracketHalf.filter(Boolean) as Team[]
    const nullCount = bracketHalf.length - real.length
    const ranked = rankTeamsByStanding(tournament.groups, real)
    return [...ranked, ...Array(nullCount).fill(null)]
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
  let directSlots: (Team | null)[] | null = null

  if (mode === "manual" && orderedTeamIds) {
    const byeCount = size - realCount
    directSlots = buildDirectSlots(orderedTeamIds, byeCount, half)
    firstHalf = []
    secondHalf = []
  } else if (mode === "random") {
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
  } else if (crossPlayoffOrder(tournament, teams)) {
    // "cross" (2 qualifiers/group) — rotating cross: winner of group i meets
    // runner-up of group i+1, wrapping around (A1–B2, B1–C2, C1–A2, …). Byes go
    // to the strongest group winners. Built via the same directSlots packing as
    // the manual path so the bracket matches the draw-ceremony reveal exactly.
    const { ids, byeCount } = crossPlayoffOrder(tournament, teams)!
    directSlots = buildDirectSlots(ids, byeCount, half)
    firstHalf = []
    secondHalf = []
  } else {
    // "cross" fallback for qualifiersPerGroup ≠ 2 — rank k from group i meets
    // rank (qpg-1-k) from group j. Adjacent groups are paired: (0,1), (2,3), ...
    // Odd gc puts the unpaired group's qualifiers in alternating halves.
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

  const rounds = buildBracketRounds(
    directSlots ?? [
      ...buildHalfSlots(prioritizeByesByStanding(firstHalf), half),
      ...buildHalfSlots(prioritizeByesByStanding(secondHalf), half),
    ]
  )

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

// ─── Multi-tier League ───────────────────────────────────────────
export function createMultiTierLeague(
  name: string,
  tierDefs: Array<{ name: string; teams: Team[] }>,
  season = 1,
  legMode: LegMode = "single",
  promotionCount = 1
): Tournament {
  const tiers: LeagueTier[] = tierDefs.map(({ name: tierName, teams }) => {
    const teamIds = teams.map((t) => t.id)
    const matchdays = buildLeagueMatchdays(teamIds, legModeToCount(legMode))
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
    return { name: tierName, teamIds, league: { matchdays, standings, legMode } }
  })
  return {
    id: uid(),
    name,
    season,
    format: "league",
    teamIds: tiers.flatMap((tier) => tier.teamIds),
    tiers,
    promotionCount,
    rounds: [],
    winnerId: null,
    createdAt: Date.now(),
  }
}

// ─── Single-tier League ──────────────────────────────────────────
export function createLeague(
  name: string,
  teams: Team[],
  season = 1,
  legMode: LegMode = "single"
): Tournament {
  const teamIds = teams.map((t) => t.id)
  const matchdays = buildLeagueMatchdays(teamIds, legModeToCount(legMode))
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
