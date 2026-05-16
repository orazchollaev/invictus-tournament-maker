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

export function createTournament(name: string, teams: Team[]): Tournament {
  const count = teams.length
  const size = Math.pow(2, Math.ceil(Math.log2(count)))
  const shuffled = shuffle(teams)
  const byes = size - count

  const firstMatches: Match[] = []
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
  const home = teams.find((t) => t.id === match.homeId)
  const away = teams.find((t) => t.id === match.awayId)
  const hp = home?.power ?? 50
  const ap = away?.power ?? 50

  // Power difference shifts expected goals. 20pt gap ≈ +0.5 lambda.
  const diff = (hp - ap) / 100
  const base = 1.3
  const hLambda = Math.max(0.3, base + diff * 1.5)
  const aLambda = Math.max(0.3, base - diff * 1.5)

  let h = poisson(hLambda)
  let a = poisson(aLambda)

  // No draws in knockout — stronger side wins the tiebreak more often
  if (h === a) {
    Math.random() * (hp + ap) < hp ? h++ : a++
  }

  return { home: h, away: a }
}
