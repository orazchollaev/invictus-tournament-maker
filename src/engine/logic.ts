// engine/logic.ts
import type { Team } from "../modules/teams/types"
import type { Match, Round, Tournament, Group, GroupMatch } from "../modules/tournament/types"

// ─── Utilities ──────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Round naming ───────────────────────────────────────────────
function getRoundName(matchCount: number): string {
  if (matchCount === 1) return "Final"
  if (matchCount === 2) return "Semi-Finals"
  if (matchCount === 4) return "Quarter-Finals"
  return `Round of ${matchCount * 2}`
}

// ─── Match simulation ───────────────────────────────────────────
function poisson(lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0,
    p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return Math.min(k - 1, 6)
}

export function simulateMatch(
  match: Match | GroupMatch,
  teams: Team[]
): { home: number; away: number } {
  const homeTeam = teams.find((t) => t.id === match.homeId)
  const awayTeam = teams.find((t) => t.id === match.awayId)

  const hp = homeTeam?.power ?? 50
  const ap = awayTeam?.power ?? 50
  const homeAdvantage = 6
  const hpAdjusted = hp + homeAdvantage
  const diff = (hpAdjusted - ap) / 40
  const strength = Math.tanh(diff)
  const base = 1.45
  const randomFactor = 0.85 + Math.random() * 0.3

  let hLambda = base * (1 + strength * 0.95) * randomFactor
  let aLambda = base * (1 - strength * 0.95) * randomFactor

  if (strength > 0.55 && Math.random() < 0.008) {
    return Math.random() < 0.5 ? { home: 0, away: 3 } : { home: 3, away: 0 }
  }

  const chaos = Math.random()
  if (chaos < 0.06) {
    hLambda *= 1.4
    aLambda *= 1.4
  }

  return {
    home: poisson(Math.max(0.25, hLambda)),
    away: poisson(Math.max(0.25, aLambda)),
  }
}

export function simulatePenaltyShootout(
  match: Match | GroupMatch,
  teams: Team[]
): { penHome: number; penAway: number } {
  const homeTeam = teams.find((t) => t.id === match.homeId)
  const awayTeam = teams.find((t) => t.id === match.awayId)
  const hp = homeTeam?.power ?? 50
  const ap = awayTeam?.power ?? 50

  const hRate = 0.65 + (hp / 100) * 0.15
  const aRate = 0.65 + (ap / 100) * 0.15

  let ph = 0
  let pa = 0
  for (let i = 0; i < 5; i++) {
    if (Math.random() < hRate) ph++
    if (Math.random() < aRate) pa++
  }

  let maxSD = 20
  while (ph === pa && maxSD-- > 0) {
    const h = Math.random() < hRate ? 1 : 0
    const a = Math.random() < aRate ? 1 : 0
    if (h !== a) {
      ph += h
      pa += a
    }
  }

  if (ph === pa) ph++
  return { penHome: ph, penAway: pa }
}

// ─── Bracket helpers ────────────────────────────────────────────
export function getWinnerId(match: Match): string | null {
  if (!match.result) return null
  if (match.result.home > match.result.away) return match.homeId
  if (match.result.away > match.result.home) return match.awayId
  if (match.result.penHome !== undefined && match.result.penAway !== undefined) {
    if (match.result.penHome > match.result.penAway) return match.homeId
    if (match.result.penAway > match.result.penHome) return match.awayId
  }
  return null
}

export function propagateWinners(rounds: Round[], _teams: Team[]) {
  for (let r = 0; r < rounds.length - 1; r++) {
    const curr = rounds[r]
    const next = rounds[r + 1]
    curr.matches.forEach((match, i) => {
      const winnerId = getWinnerId(match)
      const slot = Math.floor(i / 2)
      const isHome = i % 2 === 0
      if (winnerId) {
        if (isHome) next.matches[slot].homeId = winnerId
        else next.matches[slot].awayId = winnerId
      }
    })
  }
}

// ─── Bracket creation ────────────────────────────────────────────
function buildBracketRounds(orderedTeams: (Team | null)[]): Round[] {
  const size = orderedTeams.length // must already be power-of-2
  const firstMatches: Match[] = []

  for (let i = 0; i < size / 2; i++) {
    const home = orderedTeams[i * 2] ?? null
    const away = orderedTeams[i * 2 + 1] ?? null
    firstMatches.push({
      id: uid(),
      homeId: home?.id ?? null,
      awayId: away?.id ?? null,
      result: null,
    })
  }

  // auto-resolve byes
  firstMatches.forEach((m) => {
    if (m.homeId && !m.awayId) m.result = { home: 1, away: 0 }
    if (!m.homeId && m.awayId) m.result = { home: 0, away: 1 }
  })

  const rounds: Round[] = [{ name: getRoundName(size / 2), matches: firstMatches }]
  let prev = firstMatches.length
  while (prev > 1) {
    const next = prev / 2
    const matches: Match[] = Array.from({ length: next }, () => ({
      id: uid(),
      homeId: null,
      awayId: null,
      result: null,
    }))
    rounds.push({ name: getRoundName(next), matches })
    prev = next
  }

  return rounds
}

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
  const count = teams.length
  const size = Math.pow(2, Math.ceil(Math.log2(count)))
  const byes = size - count

  let seededOrder: (Team | null)[]

  if (orderedTeams) {
    // Manual: fill slots, interleave byes at the end of each pair
    seededOrder = []
    let idx = 0
    for (let i = 0; i < size / 2; i++) {
      const home = orderedTeams[idx++] ?? null
      const away = byes > 0 && i < byes ? null : (orderedTeams[idx++] ?? null)
      seededOrder.push(home, away)
    }
  } else if (seeded) {
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    const byeTeams = sorted.slice(0, byes)
    const rest = sorted.slice(byes)
    const half = rest.length / 2
    const pot1 = shuffle(rest.slice(0, half))
    const pot2 = shuffle(rest.slice(half))
    seededOrder = []
    for (const t of byeTeams) seededOrder.push(t, null)
    for (let i = 0; i < pot1.length; i++) seededOrder.push(pot1[i], pot2[i])
  } else {
    const shuffled = shuffle(teams)
    seededOrder = []
    let idx = 0
    for (let i = 0; i < size / 2; i++) {
      const home = shuffled[idx++] ?? null
      const away = byes > 0 && i < byes ? null : (shuffled[idx++] ?? null)
      seededOrder.push(home, away)
    }
  }

  const rounds = buildBracketRounds(seededOrder)
  propagateWinners(rounds, teams)

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

// ─── Round-robin fixture builder (circle method) ────────────────
// Groups matches by round so no team plays twice in the same round.
// Home/away alternates per pair to balance home games (±1 over the season).
function buildGroupFixture(teamIds: string[]): GroupMatch[] {
  const n = teamIds.length
  if (n < 2) return []

  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push("") // phantom bye for odd counts
  const size = teams.length
  const fixed = teams[0]
  const rotating = teams.slice(1)
  const posMap = new Map(teamIds.map((id, i) => [id, i]))
  const matches: GroupMatch[] = []

  for (let r = 0; r < size - 1; r++) {
    const circle = [fixed, ...rotating]
    for (let i = 0; i < size / 2; i++) {
      const a = circle[i]
      const b = circle[size - 1 - i]
      if (!a || !b) continue
      const posA = posMap.get(a) ?? 0
      const posB = posMap.get(b) ?? 0
      const sum = posA + posB
      // Even sum → lower index is home; odd sum → higher index is home
      const aIsHome = sum % 2 === 0 ? posA < posB : posA > posB
      matches.push({
        id: uid(),
        homeId: aIsHome ? a : b,
        awayId: aIsHome ? b : a,
        result: null,
      })
    }
    rotating.unshift(rotating.pop()!)
  }

  return matches
}

// ─── Group + Bracket creation ───────────────────────────────────
function createGroupBracketTournament(
  name: string,
  teams: Team[],
  season: number,
  seeded: boolean,
  groupCount: number,
  orderedTeams?: Team[]
): Tournament {
  const teamsToPlace = orderedTeams
    ? [...orderedTeams]
    : seeded
      ? [...teams].sort((a, b) => b.power - a.power)
      : shuffle([...teams])

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

function buildEmptyBracketRounds(size: number): Round[] {
  const rounds: Round[] = []
  let n = size / 2
  while (n >= 1) {
    rounds.push({
      name: getRoundName(n),
      matches: Array.from({ length: n }, () => ({
        id: uid(),
        homeId: null,
        awayId: null,
        result: null,
      })),
    })
    n = Math.floor(n / 2)
  }
  return rounds
}

// ─── Group standings calculation ────────────────────────────────
export function recalcStandings(group: Group) {
  // Reset
  group.standings.forEach((s) => {
    s.played = 0
    s.won = 0
    s.drawn = 0
    s.lost = 0
    s.gf = 0
    s.ga = 0
    s.gd = 0
    s.pts = 0
  })

  for (const match of group.matches) {
    if (!match.result) continue
    const { home, away } = match.result
    const hRow = group.standings.find((s) => s.teamId === match.homeId)
    const aRow = group.standings.find((s) => s.teamId === match.awayId)
    if (!hRow || !aRow) continue

    hRow.played++
    aRow.played++
    hRow.gf += home
    hRow.ga += away
    aRow.gf += away
    aRow.ga += home
    hRow.gd = hRow.gf - hRow.ga
    aRow.gd = aRow.gf - aRow.ga

    if (home > away) {
      hRow.won++
      hRow.pts += 3
      aRow.lost++
    } else if (away > home) {
      aRow.won++
      aRow.pts += 3
      hRow.lost++
    } else {
      hRow.drawn++
      hRow.pts++
      aRow.drawn++
      aRow.pts++
    }
  }

  // Sort: pts → gd → gf
  group.standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

// ─── Seed bracket from group results ────────────────────────────
// Classic cross-seeding: 1A vs 2B, 1B vs 2A, 1C vs 2D, 1D vs 2C …
export function seedBracketFromGroups(tournament: Tournament, teams: Team[]) {
  if (!tournament.groups) return
  tournament.groups.forEach((g) => recalcStandings(g))

  const qualifiers: Team[] = []
  // Interleave: 1st from each group, then 2nd from each group
  // Then cross-seed for bracket
  const firsts = tournament.groups.map((g) => teams.find((t) => t.id === g.standings[0]?.teamId)!)
  const seconds = tournament.groups.map((g) => teams.find((t) => t.id === g.standings[1]?.teamId)!)

  // Cross-seed: 1A vs 2B, 1B vs 2A, … (pair groups in order)
  const bracketOrder: (Team | null)[] = []
  const gc = tournament.groups.length

  // If groupCount is even, pair group i with group (i ^ 1) for cross-seeding
  for (let i = 0; i < gc; i += 2) {
    bracketOrder.push(firsts[i] ?? null)
    bracketOrder.push(seconds[i + 1] ?? null)
  }
  for (let i = 1; i < gc; i += 2) {
    bracketOrder.push(firsts[i] ?? null)
    bracketOrder.push(seconds[i - 1] ?? null)
  }

  // Pad to power-of-2 with nulls
  const size = Math.pow(2, Math.ceil(Math.log2(bracketOrder.filter(Boolean).length || 2)))
  while (bracketOrder.length < size) bracketOrder.push(null)

  const rounds = buildBracketRounds(bracketOrder)
  propagateWinners(rounds, teams)

  tournament.rounds = rounds
  tournament.groupsDone = true
}

// ─── Group match result helper ───────────────────────────────────
export function setGroupMatchResult(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  home: number,
  away: number
) {
  const group = tournament.groups![groupIdx]
  group.matches[matchIdx].result = { home, away }
  recalcStandings(group)
}

// ─── Group simulation ────────────────────────────────────────────
export function simulateGroupMatch(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  const match = tournament.groups![groupIdx].matches[matchIdx]
  if (match.result) return
  match.result = simulateMatch(match as any, teams)
  recalcStandings(tournament.groups![groupIdx])
}

export function simulateGroup(tournament: Tournament, groupIdx: number, teams: Team[]) {
  const group = tournament.groups![groupIdx]
  for (let i = 0; i < group.matches.length; i++) {
    if (!group.matches[i].result) {
      simulateGroupMatch(tournament, groupIdx, i, teams)
    }
  }
}

export function simulateAllGroups(tournament: Tournament, teams: Team[]) {
  if (!tournament.groups) return
  for (let g = 0; g < tournament.groups.length; g++) {
    simulateGroup(tournament, g, teams)
  }
}

export function allGroupsDone(tournament: Tournament): boolean {
  if (!tournament.groups) return true
  return tournament.groups.every((g) => g.matches.every((m) => m.result !== null))
}
