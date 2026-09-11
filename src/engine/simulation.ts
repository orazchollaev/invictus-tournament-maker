// engine/simulation.ts
import type { Team } from "../modules/teams/types"
import type { Match, GroupMatch, RedCard } from "../modules/tournament/types"
import { MAX_GOALS } from "@/constants/limits"
import { resolvePower } from "./power"
import { rollShootout, type ShootoutOutcome } from "./shootout"
import { REGULATION_MINUTES, EXTRA_TIME_MINUTES } from "./periods"
import { rollMatchReds, inMatchRedPenalty, extraTimeRedPenalty } from "./discipline"

let _surpriseFactor = 50 // 0 = power dominates, 100 = pure chaos
let _formFactorEnabled = false
let _homeAdvantage = 6 // power bonus for home team (0-20)
let _redCardImpact = true
let _injuriesEnabled = true

export function setSimConfig(config: {
  surpriseFactor?: number
  formFactor?: boolean
  homeAdvantage?: number
  redCardImpact?: boolean
  injuriesEnabled?: boolean
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
  if (config.redCardImpact !== undefined) {
    _redCardImpact = config.redCardImpact
  }
  if (config.injuriesEnabled !== undefined) {
    _injuriesEnabled = config.injuriesEnabled
  }
}

export function isFormFactorEnabled(): boolean {
  return _formFactorEnabled
}

/**
 * Whether a sending-off costs the side anything. Off means reds are still
 * shown on the timeline — the event generator rolls them, as it always did —
 * but they never touch a scoreline or a following match.
 */
export function isRedCardImpactEnabled(): boolean {
  return _redCardImpact
}

/**
 * Whether an injury rules a player out of matches after it. Off means no
 * injuries are rolled at all — unlike a red card, an injury has no cosmetic
 * value on its own; a sub tagged "injury" only exists to carry a suspension
 * forward, so with nothing to carry there is nothing to show.
 */
export function isInjuriesEnabled(): boolean {
  return _injuriesEnabled
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
  redCardImpact: boolean
  injuriesEnabled: boolean
} {
  return {
    surpriseFactor: _surpriseFactor,
    formFactor: _formFactorEnabled,
    homeAdvantage: _homeAdvantage,
    redCardImpact: _redCardImpact,
    injuriesEnabled: _injuriesEnabled,
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

/**
 * 6 at ordinary lambdas, rising once the model itself is predicting a rout.
 * A close match (lambda ~1.45-2.6) never sees the extra room; a huge power
 * gap at low surprise pushes lambda well past that, and the cap opens up
 * with it, capped at MAX_GOALS (the same ceiling manual score entry uses).
 */
function dynamicCap(lambda: number): number {
  return Math.min(MAX_GOALS, 6 + Math.floor(Math.max(0, lambda - 2.6) * 2.5))
}

function poisson(lambda: number): number {
  const cap = dynamicCap(lambda)
  const L = Math.exp(-lambda)
  let k = 0,
    p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return Math.min(k - 1, cap)
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
 * The two sides' effective ratings: squad power plus any adjustment, clamped
 * back into the 1-100 range. Home advantage is deliberately *not* applied
 * here — it belongs to open play, not to a penalty spot.
 *
 * `penalty` is the cost of playing a man down, subtracted after the clamp's
 * lower bound is applied so a red card can always drag a side below its
 * rating, however weak that rating already was.
 */
function resolveSides(
  match: Match | GroupMatch,
  teams: Team[],
  adjustments?: Map<string, number>,
  penalty?: { home: number; away: number }
): { hp: number; ap: number } {
  const lookup = getTeamLookup(teams)
  const baseHp = resolvePower(lookup.get(match.homeId as string))
  const baseAp = resolvePower(lookup.get(match.awayId as string))
  const clamp = (power: number, drop: number) => Math.max(1, Math.min(100, power) - drop)
  return {
    hp: clamp(baseHp + (adjustments?.get(match.homeId as string) ?? 0), penalty?.home ?? 0),
    ap: clamp(baseAp + (adjustments?.get(match.awayId as string) ?? 0), penalty?.away ?? 0),
  }
}

/** -1..1: how far the match tilts towards the home side, home advantage included. */
function sideStrength(hp: number, ap: number): number {
  return Math.tanh((hp + _homeAdvantage - ap) / 40)
}

/**
 * Play a match out.
 *
 * When red-card impact is on, the dismissals are rolled *first* and weaken
 * whichever side picked one up for the rest of the ninety. They come back on
 * the result so the timeline can replay the same reds rather than inventing
 * its own, and so the next match knows who is short-handed.
 */
export function simulateMatch(
  match: Match | GroupMatch,
  teams: Team[],
  adjustments?: Map<string, number>
): { home: number; away: number; reds?: RedCard[] } {
  const reds = _redCardImpact ? rollMatchReds() : []
  const { hp, ap } = resolveSides(match, teams, adjustments, inMatchRedPenalty(reds))
  const strength = sideStrength(hp, ap)
  const base = 1.45
  const randomFactor = 0.85 + Math.random() * 0.3
  const strengthMult = 1.8 - (_surpriseFactor / 100) * 1.7

  let hLambda = base * (1 + strength * strengthMult) * randomFactor
  let aLambda = base * (1 - strength * strengthMult) * randomFactor

  const carry = reds.length ? { reds } : {}

  // Rare shock result: a heavy favourite gets run over. Mirrored on both sides
  // so it fires for a strong away team too, and the underdog is always the one
  // that wins — otherwise half of these "upsets" were the favourite cruising.
  if (Math.abs(strength) > 0.55 && Math.random() < 0.008) {
    return strength > 0 ? { home: 0, away: 3, ...carry } : { home: 3, away: 0, ...carry }
  }

  const chaos = Math.random()
  if (chaos < 0.06) {
    hLambda *= 1.4
    aLambda *= 1.4
  }

  return {
    home: poisson(Math.max(0.25, hLambda)),
    away: poisson(Math.max(0.25, aLambda)),
    ...carry,
  }
}

/**
 * Extra time: thirty more minutes, played to the same model as the ninety
 * that preceded them, with the goal base scaled to the shorter period.
 *
 * The one-off flourishes `simulateMatch` rolls — the shock result, the
 * chaotic afternoon — belong to a whole match and are not repeated here;
 * extra time inherits the character of the tie rather than reinventing it.
 *
 * A side sent down to ten in the ninety stays down to ten for all thirty of
 * these, so `reds` costs it the full penalty rather than a scaled share.
 */
export function simulateExtraTime(
  match: Match | GroupMatch,
  teams: Team[],
  adjustments?: Map<string, number>,
  reds?: RedCard[]
): { home: number; away: number } {
  const penalty = _redCardImpact ? extraTimeRedPenalty(reds) : undefined
  const { hp, ap } = resolveSides(match, teams, adjustments, penalty)
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
