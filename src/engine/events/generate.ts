// engine/events/generate.ts
//
// Turns a final score into the match that produced it: who scored, who
// set it up, who was booked, what the keeper did. The score is the input,
// never the output — the generated goal events always add back up to the
// result already recorded, so nothing here can ever contradict a table.
//
// Own-goal convention (the one the scoreboards use): `side` is the side
// the goal *counts for*, so an own goal appears on the scoring team's row
// with the conceding team's player named on it. `PlayerMatchLine.side`, by
// contrast, is always the player's own team — and an own goal is never
// added to that player's `goals`.
import type {
  MatchEvent,
  MatchStats,
  PlayerMatchLine,
  RedCard,
  ShootoutKick,
  Substitution,
  TeamMatchStats,
} from "@/modules/tournament/types"
import type { Player, PlayerPosition } from "@/modules/players/types"
import type { Lineup, LineupSlot } from "./lineup"
import { UNKNOWN_POWER, pickForPosition, slotPower } from "./lineup"
import { computeRating, rollPerformance, type MatchOutcome } from "./rating"
import { generateTeamStats } from "./teamStats"
import { reconstructShootout, type ShootoutKickOutcome, type ShootoutOutcome } from "../shootout"
import { RED_CHANCE } from "../discipline"
import { INJURY_CHANCE, rollInjuryDuration } from "../injuries"
import { isInjuriesEnabled } from "../simulation"
import {
  MAX_STOPPAGE,
  PERIOD_END,
  PERIOD_START,
  EXTRA_TIME_MINUTES,
  REGULATION_MINUTES,
  type MatchPeriod,
} from "../periods"

/** How likely a slot is to be the one that scores, before power weighting. */
export const SCORE_WEIGHT: Record<PlayerPosition, number> = { GK: 0.02, DEF: 0.2, MID: 0.55, FWD: 1.0 }
export const ASSIST_WEIGHT: Record<PlayerPosition, number> = { GK: 0.05, DEF: 0.35, MID: 1.0, FWD: 0.7 }
export const CARD_WEIGHT: Record<PlayerPosition, number> = { GK: 0.15, DEF: 1.0, MID: 0.9, FWD: 0.6 }
/** Own goals come off a defender's boot far more often than anyone else's. */
export const OWN_GOAL_WEIGHT: Record<PlayerPosition, number> = { GK: 0.3, DEF: 1.0, MID: 0.25, FWD: 0.05 }

export const OWN_GOAL_CHANCE = 0.02
export const PENALTY_CHANCE = 0.08
export const ASSIST_CHANCE = 0.7
export const PENALTY_MISS_CHANCE = 0.05

export const YELLOW_LAMBDA = 2.2

const STOPPAGE_CHANCE = 0.08

/** Extra time is a third of a match, so it earns a third of the bookings. */
const EXTRA_TIME_SHARE = EXTRA_TIME_MINUTES / REGULATION_MINUTES

type Side = "home" | "away"

/**
 * A slot that has left the field, and when.
 *
 * Kept as the slot itself rather than a player id: a short squad fields
 * several anonymous "Unknown Player" slots, all with a null id, and sending
 * one off must not take the other ten off with it.
 */
export interface Dismissal {
  slot: LineupSlot
  minute: number
}

/**
 * A substitution: `outSlot` is a reference into the starting lineup,
 * `inSlot` is a freshly minted slot for whoever replaced him (a bench
 * player if the squad had one for that position, otherwise another
 * anonymous "Unknown Player").
 *
 * `reason` and `injuryMatches` ride straight through to the `Substitution`
 * the caller sees — see modules/tournament/types.ts and engine/injuries.ts
 * for what they mean and who reads them.
 */
export interface SubRecord {
  outSlot: LineupSlot
  inSlot: LineupSlot
  minute: number
  reason: "tactical" | "injury"
  injuryMatches?: number
}

/** One side's eleven, plus whoever has already been sent off or subbed. */
export interface SideState {
  lineup: Lineup
  dismissals: Dismissal[]
  subs: SubRecord[]
}

/**
 * Who is still on the pitch in a given minute.
 *
 * Substitutions are applied before dismissals: a player can only be sent
 * off while he is actually out there, on the pitch he was subbed onto (or
 * still in, if not subbed at all) — never his replacement's dismissal
 * landing on a slot that already left.
 *
 * A dismissal in the same minute counts as already gone — "sent off 63',
 * scored 63'" is exactly the contradiction this exists to prevent, and the
 * one minute it costs a legitimate goal is not worth the confusion. Subs
 * follow the same same-minute rule.
 */
export function onPitch(state: SideState, minute: number): Lineup {
  let pool = state.lineup

  if (state.subs.length) {
    const active = state.subs.filter((s) => s.minute <= minute)
    if (active.length) {
      const outSet = new Set(active.map((s) => s.outSlot))
      pool = pool.filter((slot) => !outSet.has(slot)).concat(active.map((s) => s.inSlot))
    }
  }

  if (state.dismissals.length) {
    const off = new Set(state.dismissals.filter((d) => d.minute <= minute).map((d) => d.slot))
    if (off.size) pool = pool.filter((slot) => !off.has(slot))
  }

  return pool
}

/** Weighted pick over lineup slots. Returns null only for an empty pool. */
export function pickSlot(
  pool: Lineup,
  weights: Record<PlayerPosition, number>,
  rng: () => number,
  exclude?: LineupSlot
): LineupSlot | null {
  const candidates = pool.filter((slot) => slot !== exclude)
  if (!candidates.length) return null

  const scores = candidates.map((slot) => weights[slot.position] * (slot.power / 50))
  const total = scores.reduce((sum, s) => sum + s, 0)
  if (total <= 0) return candidates[Math.floor(rng() * candidates.length)]

  let roll = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= scores[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

/** The designated taker: the strongest attacking slot still on the pitch. */
export function penaltyTaker(pool: Lineup): LineupSlot | null {
  const takers = pool.filter((s) => s.position === "FWD" || s.position === "MID")
  const candidates = takers.length ? takers : pool
  if (!candidates.length) return null
  return candidates.reduce((best, slot) => (slot.power > best.power ? slot : best))
}

function poisson(lambda: number, rng: () => number): number {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > limit)
  return k - 1
}

/**
 * A minute inside a period. Stoppage runs past the period's scheduled end,
 * which is why "90+3" and "120+1" both come out of the same rule.
 *
 * `allowStoppage` exists because a minute is a plain number, with no period
 * stored alongside it: 93 has to mean either "90+3" or "the third minute of
 * extra time", and it cannot mean both. So a match that goes to extra time
 * gives up its ninetieth-minute stoppage rather than its readability, and
 * every minute above 90 in such a match is unambiguously extra time.
 */
function randomMinute(
  rng: () => number,
  period: MatchPeriod = "regulation",
  allowStoppage = true
): number {
  const end = PERIOD_END[period]
  if (allowStoppage && rng() < STOPPAGE_CHANCE) {
    return end + 1 + Math.floor(rng() * MAX_STOPPAGE[period])
  }
  const start = PERIOD_START[period]
  return start + Math.floor(rng() * (end - start + 1))
}

interface GoalsInput {
  side: Side
  goals: number
  scoring: SideState
  conceding: SideState
  period: MatchPeriod
  allowStoppage: boolean
}

/**
 * Goal events for one side, summing to exactly `goals`.
 *
 * The minute is settled before the player is, because who is available to
 * score depends on it: a man sent off in the 30th cannot be the one who
 * scores in the 70th, and neither can he put one through his own net.
 */
function buildGoals(input: GoalsInput, rng: () => number): MatchEvent[] {
  const { side, goals, scoring, conceding, period, allowStoppage } = input
  const events: MatchEvent[] = []

  for (let i = 0; i < goals; i++) {
    const roll = rng()
    const minute = randomMinute(rng, period, allowStoppage)

    if (roll < OWN_GOAL_CHANCE) {
      const slot = pickSlot(onPitch(conceding, minute), OWN_GOAL_WEIGHT, rng)
      events.push({ minute, type: "ownGoal", side, playerId: slot?.playerId ?? null })
      continue
    }

    const attackers = onPitch(scoring, minute)

    if (roll < OWN_GOAL_CHANCE + PENALTY_CHANCE) {
      const slot = penaltyTaker(attackers)
      events.push({ minute, type: "penGoal", side, playerId: slot?.playerId ?? null })
      continue
    }

    const scorer = pickSlot(attackers, SCORE_WEIGHT, rng)
    const assister =
      rng() < ASSIST_CHANCE ? pickSlot(attackers, ASSIST_WEIGHT, rng, scorer ?? undefined) : null

    events.push({
      minute,
      type: "goal",
      side,
      playerId: scorer?.playerId ?? null,
      ...(assister ? { assistId: assister.playerId } : {}),
    })
  }

  return events
}

/**
 * Bookings for one side, and the state the rest of the match is written
 * against — every dismissal the timeline contains, with the slot it fell on.
 *
 * `forcedReds` are the dismissals the simulator already rolled and priced
 * into the scoreline (see engine/discipline.ts). When they are given, the
 * regulation red is not rolled again — replaying them here is what keeps the
 * timeline and the score describing the same match. Extra-time reds are
 * always rolled: nothing has been simulated for them to contradict.
 *
 * The reds are placed before the yellows even though they are announced
 * later in the match, because a man already sent off cannot be booked again.
 *
 * A second yellow is a red: when a booking lands on a slot that already
 * has one this match — regulation or extra time, the count is never reset
 * between them — it goes down as both, the same shirt carrying a 2Y/1R
 * line the way a real match report would, and the man comes off exactly
 * like any other dismissal for everything after it (scoring, subs, the
 * next match's discipline penalty).
 */
function buildCards(
  side: Side,
  lineup: Lineup,
  rng: () => number,
  hasExtraTime: boolean,
  forcedReds?: RedCard[]
): { events: MatchEvent[]; state: SideState } {
  const events: MatchEvent[] = []
  const state: SideState = { lineup, dismissals: [], subs: [] }
  const mine = forcedReds?.filter((r) => r.side === side)
  const yellowedOnce = new Set<LineupSlot>()
  const isDismissed = (slot: LineupSlot) => state.dismissals.some((d) => d.slot === slot)

  const sendOff = (minute: number) => {
    const slot = pickSlot(onPitch(state, minute), CARD_WEIGHT, rng)
    events.push({ minute, type: "red", side, playerId: slot?.playerId ?? null })
    if (slot) state.dismissals.push({ slot, minute })
  }

  const book = (period: MatchPeriod, lambda: number, redChance: number | null) => {
    const allowStoppage = period === "extra" || !hasExtraTime

    if (redChance !== null && rng() < redChance) sendOff(randomMinute(rng, period, allowStoppage))

    // Drawn and sorted before any slot is picked: a second yellow is decided
    // by which card actually came first on the clock, not by which one the
    // dice happened to land on first — drawing minute and slot together, as
    // every other event in this file does, would let a yellow rolled late
    // in the draw order but early on the clock dodge a dismissal that a
    // later-clock, earlier-drawn one had already recorded.
    const yellows = poisson(lambda, rng)
    const minutes = Array.from({ length: yellows }, () =>
      randomMinute(rng, period, allowStoppage)
    ).sort((a, b) => a - b)

    for (const minute of minutes) {
      const slot = pickSlot(onPitch(state, minute), CARD_WEIGHT, rng)
      events.push({ minute, type: "yellow", side, playerId: slot?.playerId ?? null })
      if (!slot) continue

      if (yellowedOnce.has(slot)) {
        // A player already carrying a forced red (see engine/discipline.ts)
        // can still draw an early, unrelated yellow before that dismissal's
        // own minute — onPitch only rules him out from his dismissal minute
        // onward. What he cannot do is pick up a *second* dismissal: if
        // he's already off, this "second yellow" changes nothing further.
        if (!isDismissed(slot)) {
          events.push({ minute, type: "red", side, playerId: slot.playerId })
          state.dismissals.push({ slot, minute })
        }
      } else {
        yellowedOnce.add(slot)
      }
    }
  }

  // The forced reds go on first, so the bookings around them see the gap.
  for (const red of mine ?? []) sendOff(red.minute)
  book("regulation", YELLOW_LAMBDA, mine ? null : RED_CHANCE)

  // Tired legs in extra time, but a third of the time to get booked in.
  if (hasExtraTime) {
    book("extra", YELLOW_LAMBDA * EXTRA_TIME_SHARE, RED_CHANCE * EXTRA_TIME_SHARE)
  }

  return { events, state }
}

/** How likely a slot is to be the one taken off. Rarely the keeper. */
const SUB_WEIGHT: Record<PlayerPosition, number> = { GK: 0.05, DEF: 0.9, MID: 1.0, FWD: 1.0 }

const SUB_MIN_COUNT = 2
const SUB_MAX_COUNT = 5
/** Subs cluster in the second half — earlier ones are the exception, not the norm. */
const SUB_MIN_MINUTE = 46
const SUB_MAX_MINUTE = 90

/**
 * 2-5 tactical substitutions, plus an occasional injury, mutating
 * `state.subs` in place.
 *
 * Every squad member not already in the starting lineup is fair game as a
 * replacement. A specialist for the slot comes on where the bench has one,
 * and otherwise the nearest job covers it at a penalty — the same rule the
 * starting eleven is built under. Only a bench with nobody left on it at
 * all sends on an "Unknown Player", exactly as an unfilled starting slot
 * does; a real substitute is never passed over because his listed position
 * does not match the shirt going off.
 *
 * An injury is just one more substitution, rolled into the same list and
 * drawn from the same bench — the only things that set it apart are its
 * minute (any time, not just the second half) and its `injuryMatches`,
 * which is what makes it cost the player his place in matches still to
 * come. See engine/injuries.ts for how that duration is later turned into
 * an unavailable squad.
 *
 * Only an original starting slot can go off — never a substitute who has
 * already come on. `buildLines` produces exactly two lines per substituted
 * slot (the starter, the replacement); a substitute-of-a-substitute would
 * need a third, which nothing downstream expects. So a player already hurt
 * cannot then be tactically subbed, or vice versa — whichever is rolled
 * first claims the slot.
 */
function buildSubstitutions(state: SideState, squad: Player[], rng: () => number): void {
  const count = SUB_MIN_COUNT + Math.floor(rng() * (SUB_MAX_COUNT - SUB_MIN_COUNT + 1))
  const startingIds = new Set(
    state.lineup.map((s) => s.playerId).filter((id): id is string => !!id)
  )
  const bench = squad.filter((p) => !startingIds.has(p.id))
  const usedBenchIds = new Set<string>()

  const planned: { minute: number; reason: "tactical" | "injury"; injuryMatches?: number }[] =
    Array.from({ length: count }, () => ({
      minute: SUB_MIN_MINUTE + Math.floor(rng() * (SUB_MAX_MINUTE - SUB_MIN_MINUTE + 1)),
      reason: "tactical" as const,
    }))

  if (isInjuriesEnabled() && rng() < INJURY_CHANCE) {
    planned.push({
      minute: randomMinute(rng, "regulation", true),
      reason: "injury",
      injuryMatches: rollInjuryDuration(rng),
    })
  }

  planned.sort((a, b) => a.minute - b.minute)

  for (const { minute, reason, injuryMatches } of planned) {
    const dismissedByNow = new Set(
      state.dismissals.filter((d) => d.minute <= minute).map((d) => d.slot)
    )
    const outAlready = new Set(state.subs.map((s) => s.outSlot))
    const pool = state.lineup.filter((slot) => !outAlready.has(slot) && !dismissedByNow.has(slot))
    const outSlot = pickSlot(pool, SUB_WEIGHT, rng)
    if (!outSlot) continue

    const replacement = pickForPosition(bench, usedBenchIds, outSlot.position, rng)
    const inSlot: LineupSlot = replacement
      ? {
          playerId: replacement.id,
          position: outSlot.position,
          power: slotPower(replacement, outSlot.position),
        }
      : { playerId: null, position: outSlot.position, power: UNKNOWN_POWER }
    if (replacement) usedBenchIds.add(replacement.id)

    state.subs.push({
      outSlot,
      inSlot,
      minute,
      reason,
      ...(injuryMatches ? { injuryMatches } : {}),
    })
  }
}

/**
 * Name the takers for a shootout.
 *
 * The sequence itself comes from the engine — either the one that was
 * actually rolled (passed straight through, so the kicks on screen are the
 * kicks that decided the tie) or one rebuilt from the totals for a result
 * that predates the kick-level model or was typed in by hand.
 *
 * Only when even a rebuild is impossible — a total no legal shootout could
 * produce, which pre-v2.4.0 data can contain — does it fall back to dealing
 * five kicks a side at random. That is the old behaviour, kept for the old
 * data it belongs to.
 *
 * Kicks are taken by whoever finished the match. A player sent off during it
 * takes no part in the shootout, which is also why a side can arrive at the
 * spot with fewer than eleven takers.
 */
function buildShootout(
  homeScored: number,
  awayScored: number,
  home: SideState,
  away: SideState,
  rng: () => number,
  rolled?: ShootoutOutcome
): ShootoutKick[] {
  const sequence: ShootoutKickOutcome[] =
    rolled?.kicks ??
    reconstructShootout(homeScored, awayScored, rng) ??
    legacySequence(homeScored, awayScored, rng)

  // Best takers first, then down the order, wrapping if it went long.
  function takers(state: SideState): (string | null)[] {
    // Every dismissal in the match counts, stoppage-time ones included.
    const ranked = [...onPitch(state, Infinity)].sort((a, b) => b.power - a.power)
    return ranked.map((slot) => slot.playerId)
  }

  const order = { home: takers(home), away: takers(away) }
  const taken = { home: 0, away: 0 }

  return sequence.map((kick, index) => {
    const pool = order[kick.side]
    const playerId = pool.length ? pool[taken[kick.side]++ % pool.length] : null
    return { order: index + 1, side: kick.side, playerId, scored: kick.scored }
  })
}

/** Five kicks a side, makes dealt at random — only for totals nothing else explains. */
function legacySequence(
  homeScored: number,
  awayScored: number,
  rng: () => number
): ShootoutKickOutcome[] {
  const rounds = Math.max(5, homeScored, awayScored)

  function outcomes(scored: number): boolean[] {
    const set = Array.from({ length: rounds }, (_, i) => i < scored)
    for (let i = set.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[set[i], set[j]] = [set[j], set[i]]
    }
    return set
  }

  const home = outcomes(homeScored)
  const away = outcomes(awayScored)

  const kicks: ShootoutKickOutcome[] = []
  for (let round = 0; round < rounds; round++) {
    kicks.push({ side: "home", scored: home[round] })
    kicks.push({ side: "away", scored: away[round] })
  }
  return kicks
}

function outcomeFor(goalsFor: number, goalsAgainst: number): MatchOutcome {
  if (goalsFor === goalsAgainst) return "draw"
  return goalsFor > goalsAgainst ? "win" : "loss"
}

/**
 * Aggregate a side's events into one line per slot, then rate each one.
 *
 * A slot that was substituted produces two lines instead of one — the man
 * who came off and the man who came on — each scoped to the minutes he
 * actually played, via `state.subs`. Every other slot is untouched and
 * produces exactly the one line it always has.
 */
function buildLines(
  side: Side,
  state: SideState,
  events: MatchEvent[],
  goalsFor: number,
  goalsAgainst: number,
  opponentOnTarget: number,
  matchMinutes: number,
  rng: () => number
): PlayerMatchLine[] {
  const outcome = outcomeFor(goalsFor, goalsAgainst)
  const cleanSheet = goalsAgainst === 0
  // Shots the keeper stopped: everything on target that did not go in.
  const saves = Math.max(0, opponentOnTarget - goalsAgainst)
  // Measured against his own eleven, so a weak player in a weak side is
  // rated on his afternoon rather than on the league table.
  const lineup = state.lineup
  const squadPower = lineup.reduce((sum, slot) => sum + slot.power, 0) / lineup.length

  function lineFor(slot: LineupSlot, minutesPlayed?: number): PlayerMatchLine {
    const mine = (e: MatchEvent) => slot.playerId !== null && e.playerId === slot.playerId

    // Own goals credit the opposing side, so they are matched by player
    // rather than by side — and never counted as one of his goals.
    const goals = events.filter(
      (e) => e.side === side && (e.type === "goal" || e.type === "penGoal") && mine(e)
    ).length
    // Only a "goal" event ever carries an assist — a "sub" event reuses the
    // same field for who went off, which must never read as an assist.
    const assists = events.filter(
      (e) =>
        e.type === "goal" &&
        e.side === side &&
        slot.playerId !== null &&
        e.assistId === slot.playerId
    ).length
    const yellow = events.filter((e) => e.type === "yellow" && e.side === side && mine(e)).length
    const red = events.filter((e) => e.type === "red" && e.side === side && mine(e)).length

    const isKeeper = slot.position === "GK"
    const minutesShare = minutesPlayed !== undefined ? minutesPlayed / matchMinutes : undefined

    return {
      playerId: slot.playerId,
      side,
      position: slot.position,
      goals,
      assists,
      yellow,
      red,
      ...(isKeeper ? { saves, conceded: goalsAgainst } : {}),
      ...(slot.position === "GK" || slot.position === "DEF" ? { cleanSheet } : {}),
      ...(minutesPlayed !== undefined ? { minutesPlayed } : {}),
      rating: computeRating({
        position: slot.position,
        outcome,
        goals,
        assists,
        cleanSheet,
        performance: rollPerformance(rng),
        power: slot.power,
        squadPower,
        ...(isKeeper ? { saves, conceded: goalsAgainst } : {}),
        ...(minutesShare !== undefined ? { minutesShare } : {}),
      }),
    }
  }

  return lineup.flatMap((slot) => {
    const sub = state.subs.find((s) => s.outSlot === slot)
    if (!sub) return [lineFor(slot)]
    return [lineFor(slot, sub.minute), lineFor(sub.inSlot, matchMinutes - sub.minute)]
  })
}

function substitutionsFor(side: Side, state: SideState): Substitution[] {
  return state.subs.map((s) => ({
    minute: s.minute,
    side,
    outPlayerId: s.outSlot.playerId,
    inPlayerId: s.inSlot.playerId,
    position: s.outSlot.position,
    reason: s.reason,
    ...(s.injuryMatches ? { injuryMatches: s.injuryMatches } : {}),
  }))
}

export interface AssembleMatchStatsInput {
  home: SideState
  away: SideState
  homePower: number
  awayPower: number
  /** Final score, extra-time goals included. */
  homeGoals: number
  awayGoals: number
  /** The timeline as it was played. Order does not matter; it is sorted here. */
  events: MatchEvent[]
  /** True when the tie ran to 120, so minutes played are measured against it. */
  hasExtraTime?: boolean
  penHome?: number
  penAway?: number
  shootoutOutcome?: ShootoutOutcome
  /**
   * Already rolled by the caller. `generateMatchStats` needs the shot counts
   * before it builds its timeline, so it passes its own in rather than having
   * a second set rolled here.
   */
  team?: TeamMatchStats
}

/**
 * Turn a finished match into the report the app stores and renders.
 *
 * The timeline is an *input*: this decides nothing about what happened, only
 * what it all adds up to — minutes played, ratings, clean sheets, the team
 * column. Two very different callers need exactly that:
 *
 *   generateMatchStats  rolls a plausible timeline for a score, then assembles.
 *   the live manager     plays a timeline out minute by minute, then assembles.
 *
 * Sharing this half is what keeps a managed match's report indistinguishable
 * from a simulated one — same ratings model, same team stats, same shape.
 */
export function assembleMatchStats(
  input: AssembleMatchStatsInput,
  rng: () => number = Math.random
): MatchStats {
  const {
    home,
    away,
    homePower,
    awayPower,
    homeGoals,
    awayGoals,
    hasExtraTime,
    penHome,
    penAway,
    shootoutOutcome,
  } = input

  const team = input.team ?? generateTeamStats(homePower, awayPower, homeGoals, awayGoals, rng)
  const events = [...input.events].sort((a, b) => a.minute - b.minute)

  const shootout =
    penHome !== undefined && penAway !== undefined
      ? buildShootout(penHome, penAway, home, away, rng, shootoutOutcome)
      : undefined

  const matchMinutes = hasExtraTime ? REGULATION_MINUTES + EXTRA_TIME_MINUTES : REGULATION_MINUTES

  const substitutions = [
    ...substitutionsFor("home", home),
    ...substitutionsFor("away", away),
  ].sort((a, b) => a.minute - b.minute)

  return {
    events,
    lines: [
      ...buildLines("home", home, events, homeGoals, awayGoals, team.onTarget[1], matchMinutes, rng),
      ...buildLines("away", away, events, awayGoals, homeGoals, team.onTarget[0], matchMinutes, rng),
    ],
    team,
    ...(shootout ? { shootout } : {}),
    ...(substitutions.length ? { substitutions } : {}),
  }
}

export interface GenerateMatchStatsInput {
  homeLineup: Lineup
  awayLineup: Lineup
  homePower: number
  awayPower: number
  /** Final score, extra-time goals included. */
  homeGoals: number
  awayGoals: number
  /**
   * Goals scored in 91-120, already counted in `homeGoals`/`awayGoals`.
   * Present means the tie went to extra time — even at 0-0, which still
   * stretches the timeline to 120 and is worth showing.
   */
  extraTime?: { home: number; away: number }
  /** Shootout tally, when the tie needed one. */
  penHome?: number
  penAway?: number
  /** The shootout as it was actually rolled, when the caller has it. */
  shootoutOutcome?: ShootoutOutcome
  /**
   * Dismissals the simulator already priced into the score. Present means
   * "these are the reds, do not roll any of your own" — even when empty.
   */
  reds?: RedCard[]
  /**
   * Full squads, for drawing substitutes from the bench. Absent or empty
   * means every substitution comes on as another "Unknown Player" — the
   * same graceful degradation a thin starting lineup already gets.
   */
  homeSquad?: Player[]
  awaySquad?: Player[]
}

export function generateMatchStats(
  input: GenerateMatchStatsInput,
  rng: () => number = Math.random
): MatchStats {
  const {
    homeLineup,
    awayLineup,
    homePower,
    awayPower,
    homeGoals,
    awayGoals,
    extraTime,
    penHome,
    penAway,
    shootoutOutcome,
    reds,
    homeSquad,
    awaySquad,
  } = input

  const team: TeamMatchStats = generateTeamStats(homePower, awayPower, homeGoals, awayGoals, rng)

  const hasExtraTime = extraTime !== undefined
  const regulation = {
    home: homeGoals - (extraTime?.home ?? 0),
    away: awayGoals - (extraTime?.away ?? 0),
  }

  // The cards come first: everything after them has to know who is still on
  // the pitch, so that nobody scores, assists or takes a kick after being
  // sent off. The timeline is sorted by minute at the end, so generating out
  // of chronological order costs nothing.
  const home = buildCards("home", homeLineup, rng, hasExtraTime, reds)
  const away = buildCards("away", awayLineup, rng, hasExtraTime, reds)

  // Substitutions next, so the goals/penalty logic below already sees who
  // is actually out there — a substitute can score, get carded or take a
  // penalty; the man he replaced cannot do any of those past his minute.
  buildSubstitutions(home.state, homeSquad ?? [], rng)
  buildSubstitutions(away.state, awaySquad ?? [], rng)

  function subEventsFor(side: Side, state: SideState): MatchEvent[] {
    return state.subs.map((s) => ({
      minute: s.minute,
      type: "sub",
      side,
      playerId: s.inSlot.playerId,
      assistId: s.outSlot.playerId,
    }))
  }
  const subEvents: MatchEvent[] = [
    ...subEventsFor("home", home.state),
    ...subEventsFor("away", away.state),
  ]

  const events: MatchEvent[] = [
    ...home.events,
    ...away.events,
    ...subEvents,
    ...buildGoals(
      {
        side: "home",
        goals: regulation.home,
        scoring: home.state,
        conceding: away.state,
        period: "regulation",
        allowStoppage: !hasExtraTime,
      },
      rng
    ),
    ...buildGoals(
      {
        side: "away",
        goals: regulation.away,
        scoring: away.state,
        conceding: home.state,
        period: "regulation",
        allowStoppage: !hasExtraTime,
      },
      rng
    ),
  ]

  if (extraTime) {
    events.push(
      ...buildGoals(
        {
          side: "home",
          goals: extraTime.home,
          scoring: home.state,
          conceding: away.state,
          period: "extra",
          allowStoppage: true,
        },
        rng
      ),
      ...buildGoals(
        {
          side: "away",
          goals: extraTime.away,
          scoring: away.state,
          conceding: home.state,
          period: "extra",
          allowStoppage: true,
        },
        rng
      )
    )
  }

  // A missed penalty changes nothing on the scoreboard, which is exactly
  // why it is worth showing — the timeline reads as a match, not a list.
  if (rng() < PENALTY_MISS_CHANCE) {
    const side: Side = rng() < 0.5 ? "home" : "away"
    const minute =
      hasExtraTime && rng() < EXTRA_TIME_SHARE
        ? randomMinute(rng, "extra")
        : randomMinute(rng, "regulation", !hasExtraTime)
    const slot = penaltyTaker(onPitch(side === "home" ? home.state : away.state, minute))
    events.push({ minute, type: "penMiss", side, playerId: slot?.playerId ?? null })
  }

  return assembleMatchStats(
    {
      home: home.state,
      away: away.state,
      homePower,
      awayPower,
      homeGoals,
      awayGoals,
      events,
      hasExtraTime,
      team,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
      ...(shootoutOutcome ? { shootoutOutcome } : {}),
    },
    rng
  )
}
