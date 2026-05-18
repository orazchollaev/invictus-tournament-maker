import type { Team } from "../modules/teams/types"
import type { Match, Round, Tournament } from "../modules/tournament/types"

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

export function createTournament(
  name: string,
  teams: Team[],
  season = 1,
  seeded = false
): Tournament {
  const count = teams.length
  const size = Math.pow(2, Math.ceil(Math.log2(count)))
  const byes = size - count

  const firstMatches: Match[] = []

  if (seeded) {
    // Sort by power desc; strongest teams get byes, rest split into two pots
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    const byeTeams = sorted.slice(0, byes)
    const rest = sorted.slice(byes)
    const half = rest.length / 2
    const pot1 = shuffle(rest.slice(0, half))
    const pot2 = shuffle(rest.slice(half))
    for (const t of byeTeams) {
      firstMatches.push({ id: uid(), homeId: t.id, awayId: null, result: null })
    }
    for (let i = 0; i < pot1.length; i++) {
      firstMatches.push({ id: uid(), homeId: pot1[i].id, awayId: pot2[i].id, result: null })
    }
  } else {
    const shuffled = shuffle(teams)
    let teamIdx = 0
    for (let i = 0; i < size / 2; i++) {
      const home = shuffled[teamIdx++] ?? null
      const away = byes > 0 && i < byes ? null : (shuffled[teamIdx++] ?? null)
      firstMatches.push({
        id: uid(),
        homeId: home?.id ?? null,
        awayId: away?.id ?? null,
        result: null,
      })
    }
  }

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

  propagateWinners(rounds, teams)

  return {
    id: uid(),
    name,
    season,
    teamIds: teams.map((t) => t.id),
    rounds,
    winnerId: null,
    createdAt: Date.now(),
  }
}

function getRoundName(matchCount: number): string {
  if (matchCount === 1) return "Final"
  if (matchCount === 2) return "Semi-Finals"
  if (matchCount === 4) return "Quarter-Finals"
  return `Round of ${matchCount * 2}`
}

export function getWinnerId(match: Match): string | null {
  if (!match.result) return null
  if (match.result.home > match.result.away) return match.homeId
  if (match.result.away > match.result.home) return match.awayId
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

export function simulateMatch(match: Match, teams: Team[]): { home: number; away: number } {
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

  let h = poisson(Math.max(0.25, hLambda))
  let a = poisson(Math.max(0.25, aLambda))

  if (h === a) {
    const strongerWins = Math.random() < hpAdjusted / (hpAdjusted + ap)
    strongerWins ? h++ : a++
  }

  return { home: h, away: a }
}
