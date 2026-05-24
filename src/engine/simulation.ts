// engine/simulation.ts
import type { Team } from "../modules/teams/types"
import type { Match, GroupMatch } from "../modules/tournament/types"

let _surpriseFactor = 50 // 0 = power dominates, 100 = pure chaos

export function setSimConfig(config: { surpriseFactor?: number }) {
  if (config.surpriseFactor !== undefined) {
    _surpriseFactor = Math.max(0, Math.min(100, config.surpriseFactor))
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
  const strengthMult = 1.8 - (_surpriseFactor / 100) * 1.7

  let hLambda = base * (1 + strength * strengthMult) * randomFactor
  let aLambda = base * (1 - strength * strengthMult) * randomFactor

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
