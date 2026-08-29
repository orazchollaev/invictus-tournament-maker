// engine/simulation.ts
import type { Team } from "../modules/teams/types"
import type { Match, GroupMatch } from "../modules/tournament/types"
import { resolvePower } from "./power"
import { rollShootout, type ShootoutOutcome } from "./shootout"
import { REGULATION_MINUTES, EXTRA_TIME_MINUTES } from "./periods"

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

/**
 * Read the live simulation settings. The match-stats generator needs the
 * surprise factor: at low surprise a power gap should show up as a lopsided
 * match, and at high surprise the same gap should barely register.
 */
export function getSimConfig(): {
  surpriseFactor: number
  formFactor: boolean
  homeAdvantage: number
} {
  return {
    surpriseFactor: _surpriseFactor,
    formFactor: _formFactorEnabled,
    homeAdvantage: _homeAdvantage,
  }
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

interface TeamLookupEntry {
  lookup: Map<string, Team>
  length: number
  first: Team | undefined
  last: Team | undefined
}

const teamLookupCache = new WeakMap<Team[], TeamLookupEntry>()

/**
 * id → Team, cached per array instance. Teams are normally edited in place
 * (`Object.assign`), so the cache stays valid; the length + end-identity probe
 * catches the array being pushed to, spliced, or having entries swapped out.
 * `lookup.size` is deliberately not compared against `teams.length` — duplicate
 * ids would make that check fail forever and rebuild on every single call.
 */
function getTeamLookup(teams: Team[]): Map<string, Team> {
  const cached = teamLookupCache.get(teams)
  if (
    cached &&
    cached.length === teams.length &&
    cached.first === teams[0] &&
    cached.last === teams[teams.length - 1]
  ) {
    return cached.lookup
  }
  const lookup = new Map(teams.map((t) => [t.id, t]))
  teamLookupCache.set(teams, {
    lookup,
    length: teams.length,
    first: teams[0],
    last: teams[teams.length - 1],
  })
  return lookup
}

/**
 * The two sides' effective ratings: squad power plus any form adjustment,
 * clamped back into the 1-100 range. Home advantage is deliberately *not*
 * applied here — it belongs to open play, not to a penalty spot.
 */
function resolveSides(
  match: Match | GroupMatch,
  teams: Team[],
  formAdjustments?: Map<string, number>
): { hp: number; ap: number } {
  const lookup = getTeamLookup(teams)
  const baseHp = resolvePower(lookup.get(match.homeId as string))
  const baseAp = resolvePower(lookup.get(match.awayId as string))
  return {
    hp: Math.max(1, Math.min(100, baseHp + (formAdjustments?.get(match.homeId as string) ?? 0))),
    ap: Math.max(1, Math.min(100, baseAp + (formAdjustments?.get(match.awayId as string) ?? 0))),
  }
}

/** -1..1: how far the match tilts towards the home side, home advantage included. */
function sideStrength(hp: number, ap: number): number {
  return Math.tanh((hp + _homeAdvantage - ap) / 40)
}

export function simulateMatch(
  match: Match | GroupMatch,
  teams: Team[],
  formAdjustments?: Map<string, number>
): { home: number; away: number } {
  const { hp, ap } = resolveSides(match, teams, formAdjustments)
  const strength = sideStrength(hp, ap)
  const base = 1.45
  const randomFactor = 0.85 + Math.random() * 0.3
  const strengthMult = 1.8 - (_surpriseFactor / 100) * 1.7

  let hLambda = base * (1 + strength * strengthMult) * randomFactor
  let aLambda = base * (1 - strength * strengthMult) * randomFactor

  // Rare shock result: a heavy favourite gets run over. Mirrored on both sides
  // so it fires for a strong away team too, and the underdog is always the one
  // that wins — otherwise half of these "upsets" were the favourite cruising.
  if (Math.abs(strength) > 0.55 && Math.random() < 0.008) {
    return strength > 0 ? { home: 0, away: 3 } : { home: 3, away: 0 }
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

/**
 * Extra time: thirty more minutes, played to the same model as the ninety
 * that preceded them, with the goal base scaled to the shorter period.
 *
 * The one-off flourishes `simulateMatch` rolls — the shock result, the
 * chaotic afternoon — belong to a whole match and are not repeated here;
 * extra time inherits the character of the tie rather than reinventing it.
 */
export function simulateExtraTime(
  match: Match | GroupMatch,
  teams: Team[],
  formAdjustments?: Map<string, number>
): { home: number; away: number } {
  const { hp, ap } = resolveSides(match, teams, formAdjustments)
  const strength = sideStrength(hp, ap)

  const base = 1.45 * (EXTRA_TIME_MINUTES / REGULATION_MINUTES)
  const randomFactor = 0.85 + Math.random() * 0.3
  const strengthMult = 1.8 - (_surpriseFactor / 100) * 1.7

  const hLambda = base * (1 + strength * strengthMult) * randomFactor
  const aLambda = base * (1 - strength * strengthMult) * randomFactor

  return {
    home: poisson(Math.max(0.05, hLambda)),
    away: poisson(Math.max(0.05, aLambda)),
  }
}

/** Conversion rate at the spot, from a side's rating. */
function penaltyRate(power: number): number {
  return 0.65 + (power / 100) * 0.15
}

/**
 * The full shootout, kick by kick. Callers that only need the scoreline use
 * `simulatePenaltyShootout`; the live match and the event generator take the
 * sequence, so the kicks on screen are the kicks that were rolled.
 */
export function simulateShootoutOutcome(match: Match | GroupMatch, teams: Team[]): ShootoutOutcome {
  const { hp, ap } = resolveSides(match, teams)
  return rollShootout(penaltyRate(hp), penaltyRate(ap))
}

export function simulatePenaltyShootout(
  match: Match | GroupMatch,
  teams: Team[]
): { penHome: number; penAway: number } {
  const { penHome, penAway } = simulateShootoutOutcome(match, teams)
  return { penHome, penAway }
}
