// engine/bracket.ts
import type { Team } from "../modules/teams/types"
import type { Match, Round, Tournament } from "../modules/tournament/types"
import { uid, getRoundName, shuffle } from "./utils"

export function getLoserId(match: Match): string | null {
  const winner = getWinnerId(match)
  if (!winner || !match.result) return null
  return match.homeId === winner ? match.awayId : match.homeId
}

export function updateThirdPlaceSlots(tournament: Tournament) {
  if (!tournament.hasThirdPlace || !tournament.thirdPlaceMatch) return
  const rounds = tournament.rounds
  if (rounds.length < 2) return
  const semis = rounds[rounds.length - 2]
  const m = tournament.thirdPlaceMatch
  m.homeId = semis.matches[0] ? getLoserId(semis.matches[0]) : null
  m.awayId = semis.matches[1] ? getLoserId(semis.matches[1]) : null
}

export function getWinnerId(match: Match): string | null {
  if (!match.result) return null

  // Double-leg tie: leg2Result undefined = single-leg
  if (match.leg2Result !== undefined) {
    if (match.leg2Result === null) return null // leg 2 not yet played
    // Aggregate: homeId goals = result.home + leg2Result.away (homeId plays away in leg 2)
    const aggHome = match.result.home + match.leg2Result.away
    const aggAway = match.result.away + match.leg2Result.home
    if (aggHome > aggAway) return match.homeId
    if (aggAway > aggHome) return match.awayId
    // Aggregate tied: penalty (penHome = awayId's pens, penAway = homeId's pens in leg 2)
    if (match.leg2Result.penHome !== undefined && match.leg2Result.penAway !== undefined) {
      if (match.leg2Result.penAway > match.leg2Result.penHome) return match.homeId
      if (match.leg2Result.penHome > match.leg2Result.penAway) return match.awayId
    }
    return null
  }

  // Single-leg
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

export function buildBracketRounds(orderedTeams: (Team | null)[]): Round[] {
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

export function buildEmptyBracketRounds(size: number): Round[] {
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

export function bracketOrder(n: number): number[] {
  if (n === 1) return [0]
  const half = bracketOrder(n / 2)
  const result: number[] = []
  for (const pos of half) {
    result.push(pos)
    result.push(n - 1 - pos)
  }
  return result
}

// Which `count` of `matchSlotCount` round-1 match slots should hold a bye,
// most-spread-apart first, so byes land in different bracket subtrees
// instead of colliding into the same round-2+ slot.
export function spreadByeSlots(count: number, matchSlotCount: number): number[] {
  if (count <= 0) return []
  return bracketOrder(matchSlotCount).slice(0, count)
}

export function buildPureBracket(teams: Team[], seeded: boolean, orderedTeams?: Team[]): Round[] {
  const count = teams.length
  const size = Math.pow(2, Math.ceil(Math.log2(count)))
  const byes = size - count

  let seededOrder: (Team | null)[]

  if (orderedTeams) {
    seededOrder = []
    let idx = 0
    for (let i = 0; i < size / 2; i++) {
      const home = orderedTeams[idx++] ?? null
      const away = byes > 0 && i < byes ? null : (orderedTeams[idx++] ?? null)
      seededOrder.push(home, away)
    }
  } else if (seeded) {
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    const r2Size = size / 2
    const r2Slots = bracketOrder(r2Size)
    const byeTeams = sorted.slice(0, byes)
    const rest = sorted.slice(byes)
    const half = rest.length / 2
    const pot1 = shuffle(rest.slice(0, half))
    const pot2 = shuffle(rest.slice(half))
    seededOrder = new Array(size).fill(null) as (Team | null)[]
    const byeSlots = spreadByeSlots(byes, r2Size)
    for (let i = 0; i < byeTeams.length; i++) {
      seededOrder[byeSlots[i] * 2] = byeTeams[i]
    }
    for (let i = 0; i < pot1.length; i++) {
      const r2pos = r2Slots[byes + i]
      seededOrder[r2pos * 2] = pot1[i]
      seededOrder[r2pos * 2 + 1] = pot2[i]
    }
  } else {
    const shuffled = shuffle(teams)
    const byeTeams = shuffled.slice(0, byes)
    const rest = shuffled.slice(byes)
    const matchSlots = size / 2
    const byeSlotSet = new Set(spreadByeSlots(byes, matchSlots))
    seededOrder = new Array(size).fill(null) as (Team | null)[]
    let byeIdx = 0
    let restIdx = 0
    for (let i = 0; i < matchSlots; i++) {
      if (byeSlotSet.has(i)) {
        seededOrder[i * 2] = byeTeams[byeIdx++] ?? null
      } else {
        seededOrder[i * 2] = rest[restIdx++] ?? null
        seededOrder[i * 2 + 1] = rest[restIdx++] ?? null
      }
    }
  }

  const rounds = buildBracketRounds(seededOrder)
  propagateWinners(rounds, teams)
  return rounds
}
