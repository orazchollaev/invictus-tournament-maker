// engine/simulation.ts
import type { Team } from "../modules/teams/types"
import type { Match, GroupMatch } from "../modules/tournament/types"

let _surpriseFactor = 50 // 0 = power dominates, 100 = pure chaos
let _formFactorEnabled = false
let _homeAdvantage = 6 // power bonus for home team (0-20)

export function setSimConfig(config: {
  surpriseFactor?: number
  formFactor?: boolean
  homeAdvantage?: number
}) {
  if (config.surpriseFactor !== undefined) {
    _surpriseFactor = Math.max(0, Math.min(100, config.surpriseFactor))
  }
  if (config.formFactor !== undefined) {
    _formFactorEnabled = config.formFactor
  }
  if (config.homeAdvantage !== undefined) {
    _homeAdvantage = Math.max(0, Math.min(20, config.homeAdvantage))
  }
}

export function isFormFactorEnabled(): boolean {
  return _formFactorEnabled
}

type PlayedMatch = { homeId: string; awayId: string; result: { home: number; away: number } | null }

export function computeFormAdjustments(
  teamIds: string[],
  playedMatches: PlayedMatch[]
): Map<string, number> {
  const map = new Map<string, number>()
  for (const id of teamIds) {
    const relevant = playedMatches.filter(
      (m) => m.result != null && (m.homeId === id || m.awayId === id)
    )
    const last5 = relevant.slice(-5)
    if (last5.length === 0) {
      map.set(id, 0)
      continue
    }
    let pts = 0
    for (const m of last5) {
      const isHome = m.homeId === id
      const tg = isHome ? m.result!.home : m.result!.away
      const og = isHome ? m.result!.away : m.result!.home
      if (tg > og) pts += 3
      else if (tg === og) pts += 1
    }
    // Map 0..maxPts to -10..+10 power adjustment
    map.set(id, ((pts / (last5.length * 3)) * 2 - 1) * 10)
  }
  return map
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

const teamLookupCache = new WeakMap<Team[], Map<string, Team>>()

function getTeamLookup(teams: Team[]): Map<string, Team> {
  let lookup = teamLookupCache.get(teams)
  if (!lookup || lookup.size !== teams.length) {
    lookup = new Map(teams.map((t) => [t.id, t]))
    teamLookupCache.set(teams, lookup)
  }
  return lookup
}

export function simulateMatch(
  match: Match | GroupMatch,
  teams: Team[],
  formAdjustments?: Map<string, number>
): { home: number; away: number } {
  const lookup = getTeamLookup(teams)
  const homeTeam = lookup.get(match.homeId as string)
  const awayTeam = lookup.get(match.awayId as string)

  const baseHp = homeTeam?.power ?? 50
  const baseAp = awayTeam?.power ?? 50
  const hp = Math.max(
    1,
    Math.min(100, baseHp + (formAdjustments?.get(match.homeId as string) ?? 0))
  )
  const ap = Math.max(
    1,
    Math.min(100, baseAp + (formAdjustments?.get(match.awayId as string) ?? 0))
  )
  const hpAdjusted = hp + _homeAdvantage
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
  const lookup = getTeamLookup(teams)
  const homeTeam = lookup.get(match.homeId as string)
  const awayTeam = lookup.get(match.awayId as string)
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
