// engine/events/editor.ts
//
// The inverse of generate.ts: there the score is the input and the events are
// made up to fit it; here the events are what the user typed and the score —
// and everything else on the report — follows from them.
//
// Everything is a pure function of a `MatchDraft`, so the editor UI can keep
// the draft in a ref, show the derived score live, and hand the rebuilt
// `MatchStats` to the same stash the live window uses (see pending.ts).
import type { PlayerPosition } from "@/modules/players/types"
import type {
  MatchEvent,
  MatchStats,
  PlayerMatchLine,
  ShootoutKick,
  Substitution,
} from "@/modules/tournament/types"
import { EXTRA_TIME_MINUTES, REGULATION_MINUTES } from "../periods"
import { computeRating, MAX_RATING, MIN_RATING, type MatchOutcome } from "./rating"

type Side = "home" | "away"

/** Highest minute a normal-time event can carry: 90 plus the stoppage the generator allows. */
export const MAX_REGULATION_MINUTE = REGULATION_MINUTES + 5
export const MAX_EXTRA_TIME_MINUTE = REGULATION_MINUTES + EXTRA_TIME_MINUTES

/** An event the user can edit. A substitution has its own list, so it is never one of these. */
export type DraftEvent = Omit<MatchEvent, "type"> & {
  type: Exclude<MatchEvent["type"], "sub">
}

/** The editable part of a report. */
export interface MatchDraft {
  events: DraftEvent[]
  substitutions: Substitution[]
  shootout: ShootoutKick[]
  /** Extra time was played: minutes above 90 are then extra time, not stoppage. */
  extraTime: boolean
}

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "penGoal", "ownGoal"])

export function isGoalEvent(type: MatchEvent["type"]): boolean {
  return GOAL_TYPES.has(type)
}

/** Highest minute the draft allows, given whether the tie went to extra time. */
export function maxMinute(extraTime: boolean): number {
  return extraTime ? MAX_EXTRA_TIME_MINUTE : MAX_REGULATION_MINUTE
}

// ─── Draft ↔ report ──────────────────────────────────────────────

export function draftFromStats(stats: MatchStats, extraTime: boolean): MatchDraft {
  return {
    events: stats.events.filter((e): e is DraftEvent => e.type !== "sub").map((e) => ({ ...e })),
    substitutions: (stats.substitutions ?? []).map((s) => ({ ...s })),
    shootout: (stats.shootout ?? []).map((k) => ({ ...k })),
    extraTime,
  }
}

/**
 * A report with only the starting elevens left in it: no events, no changes,
 * nobody's minutes cut short. Used as the canvas for a match that has no
 * report yet — the lines are the roster, the editor fills in what happened.
 */
export function blankStats(generated: MatchStats): MatchStats {
  const cameOn = new Set<string>()
  for (const s of generated.substitutions ?? []) if (s.inPlayerId) cameOn.add(s.inPlayerId)
  return {
    events: [],
    lines: generated.lines
      .filter((l) => l.playerId === null || !cameOn.has(l.playerId))
      .map((l) => {
        const { minutesPlayed: _minutes, ...rest } = l
        return { ...rest, goals: 0, assists: 0, yellow: 0, red: 0 }
      }),
    team: generated.team,
  }
}

// ─── Derived values ──────────────────────────────────────────────

export interface DraftScore {
  home: number
  away: number
  /** Score at 90'. Only set when extra time was played. */
  ft?: { home: number; away: number }
}

/** Goals, own goals included, credited to `side` — which is how `MatchEvent.side` already reads. */
export function scoreOfEvents(events: readonly MatchEvent[], extraTime = false): DraftScore {
  const score = { home: 0, away: 0 }
  const ft = { home: 0, away: 0 }
  for (const e of events) {
    if (!isGoalEvent(e.type)) continue
    score[e.side]++
    if (e.minute <= REGULATION_MINUTES) ft[e.side]++
  }
  return extraTime ? { ...score, ft } : score
}

export function shootoutTally(kicks: readonly ShootoutKick[]): { home: number; away: number } {
  const tally = { home: 0, away: 0 }
  for (const k of kicks) if (k.scored) tally[k.side]++
  return tally
}

/** The dismissals in a draft, in the shape a result stores them. */
export function redsOfDraft(draft: MatchDraft): { side: Side; minute: number }[] {
  return draft.events
    .filter((e) => e.type === "red" && e.minute <= REGULATION_MINUTES)
    .map((e) => ({ side: e.side, minute: e.minute }))
}

/** A substitution as it appears on the timeline: the arrival, with the man who went off as the "assist". */
function subEvent(s: Substitution): MatchEvent {
  return {
    minute: s.minute,
    type: "sub",
    side: s.side,
    playerId: s.inPlayerId,
    assistId: s.outPlayerId,
  }
}

// ─── Rebuilding the report ───────────────────────────────────────

function outcomeFor(goalsFor: number, goalsAgainst: number): MatchOutcome {
  if (goalsFor === goalsAgainst) return "draw"
  return goalsFor > goalsAgainst ? "win" : "loss"
}

const round1 = (n: number) => Math.round(n * 10) / 10
const clampRating = (n: number) => Math.max(MIN_RATING, Math.min(MAX_RATING, round1(n)))

interface Tally {
  goals: number
  assists: number
  yellow: number
  red: number
}

function tallyFor(events: readonly MatchEvent[], side: Side, playerId: string): Tally {
  const mine = (e: MatchEvent) => e.playerId === playerId
  return {
    goals: events.filter(
      (e) => e.side === side && (e.type === "goal" || e.type === "penGoal") && mine(e)
    ).length,
    // Only a "goal" carries an assist; a "sub" reuses the field for who went off.
    assists: events.filter((e) => e.type === "goal" && e.side === side && e.assistId === playerId)
      .length,
    yellow: events.filter((e) => e.type === "yellow" && e.side === side && mine(e)).length,
    red: events.filter((e) => e.type === "red" && e.side === side && mine(e)).length,
  }
}

function ratingInputs(
  line: Pick<PlayerMatchLine, "position" | "cleanSheet" | "conceded" | "saves" | "minutesPlayed">,
  tally: Tally,
  outcome: MatchOutcome,
  matchMinutes: number
) {
  return {
    position: line.position,
    outcome,
    goals: tally.goals,
    assists: tally.assists,
    cleanSheet: line.cleanSheet ?? false,
    ...(line.position === "GK" ? { conceded: line.conceded ?? 0, saves: line.saves ?? 0 } : {}),
    ...(line.minutesPlayed !== undefined
      ? { minutesShare: line.minutesPlayed / matchMinutes }
      : {}),
  }
}

/**
 * Rebuild a report around an edited draft.
 *
 * Player lines keep the roster and the hidden part of every rating (the
 * per-match performance roll and the power tilt, neither of which is stored):
 * a rating is moved by exactly what the edit changed — goals, assists, clean
 * sheet, result, minutes — rather than re-rolled. Team figures are left as
 * they were, except that a side can never have scored more than it shot.
 *
 * `positionOf` supplies the position of a player who has no line yet (a
 * bench player the user has just put a goal on).
 */
export function rebuildStats(
  base: MatchStats,
  draft: MatchDraft,
  positionOf: (playerId: string) => PlayerPosition | undefined = () => undefined
): MatchStats {
  const matchMinutes = draft.extraTime
    ? REGULATION_MINUTES + EXTRA_TIME_MINUTES
    : REGULATION_MINUTES

  const subs = [...draft.substitutions].sort((a, b) => a.minute - b.minute)
  const events: MatchEvent[] = [...draft.events, ...subs.map(subEvent)].sort(
    (a, b) => a.minute - b.minute
  )

  const before = scoreOfEvents(base.events)
  const after = scoreOfEvents(events)
  const goalsAgainst = { home: after.away, away: after.home }
  const oldAgainst = { home: before.away, away: before.home }

  // Entry and exit minute per player, from the changes alone.
  const entry = new Map<string, number>()
  const exit = new Map<string, number>()
  for (const s of subs) {
    if (s.outPlayerId) exit.set(`${s.side}:${s.outPlayerId}`, s.minute)
    if (s.inPlayerId) entry.set(`${s.side}:${s.inPlayerId}`, s.minute)
  }

  // Everyone the draft mentions beyond the roster the base report had.
  const involved = new Set<string>()
  for (const e of draft.events) {
    if (e.playerId) involved.add(`${e.side}:${e.playerId}`)
    if (e.type === "goal" && e.assistId) involved.add(`${e.side}:${e.assistId}`)
  }
  for (const key of [...entry.keys(), ...exit.keys()]) involved.add(key)

  const cameOnBefore = new Set<string>()
  for (const s of base.substitutions ?? []) {
    if (s.inPlayerId) cameOnBefore.add(`${s.side}:${s.inPlayerId}`)
  }

  const rosterKeys = new Set<string>()
  const lines: PlayerMatchLine[] = []

  function build(
    old: PlayerMatchLine | undefined,
    playerId: string,
    side: Side,
    position: PlayerPosition
  ): PlayerMatchLine {
    const key = `${side}:${playerId}`
    const tally = tallyFor(events, side, playerId)
    const isKeeper = position === "GK"
    const cleanSheet = goalsAgainst[side] === 0

    const from = entry.get(key) ?? 0
    const to = exit.get(key) ?? matchMinutes
    const touched = entry.has(key) || exit.has(key)
    const minutesPlayed = touched ? Math.max(0, to - from) : undefined

    const shotsOnTarget = base.team.onTarget[side === "home" ? 1 : 0]
    const line: PlayerMatchLine = {
      playerId,
      side,
      position,
      ...tally,
      ...(isKeeper
        ? { saves: Math.max(0, shotsOnTarget - goalsAgainst[side]), conceded: goalsAgainst[side] }
        : {}),
      ...(isKeeper || position === "DEF" ? { cleanSheet } : {}),
      ...(minutesPlayed !== undefined ? { minutesPlayed } : {}),
      rating: 0,
    }

    const next = computeRating({
      ...ratingInputs(line, tally, outcomeFor(after[side], goalsAgainst[side]), matchMinutes),
      performance: 0.5,
    })
    if (old) {
      const oldTally: Tally = {
        goals: old.goals,
        assists: old.assists,
        yellow: old.yellow,
        red: old.red,
      }
      const prev = computeRating({
        ...ratingInputs(old, oldTally, outcomeFor(before[side], oldAgainst[side]), matchMinutes),
        performance: 0.5,
      })
      line.rating = clampRating(old.rating + (next - prev))
    } else {
      line.rating = next
    }
    return line
  }

  for (const old of base.lines) {
    if (old.playerId === null) {
      // An unfilled slot is never named by an event, so only its keeper
      // numbers can change.
      const against = goalsAgainst[old.side]
      lines.push({
        ...old,
        ...(old.position === "GK"
          ? {
              conceded: against,
              saves: Math.max(0, base.team.onTarget[old.side === "home" ? 1 : 0] - against),
            }
          : {}),
        ...(old.position === "GK" || old.position === "DEF" ? { cleanSheet: against === 0 } : {}),
      })
      continue
    }
    const key = `${old.side}:${old.playerId}`
    // A bench player who no longer comes on or features has no match to rate.
    if (cameOnBefore.has(key) && !involved.has(key)) continue
    if (rosterKeys.has(key)) continue
    rosterKeys.add(key)
    lines.push(build(old, old.playerId, old.side, old.position))
  }

  for (const key of involved) {
    if (rosterKeys.has(key)) continue
    const [side, playerId] = key.split(":") as [Side, string]
    rosterKeys.add(key)
    lines.push(build(undefined, playerId, side, positionOf(playerId) ?? "MID"))
  }

  // A side cannot score more than it shot.
  const onTarget: [number, number] = [
    Math.max(base.team.onTarget[0], after.home),
    Math.max(base.team.onTarget[1], after.away),
  ]
  const shots: [number, number] = [
    Math.max(base.team.shots[0], onTarget[0]),
    Math.max(base.team.shots[1], onTarget[1]),
  ]

  return {
    events,
    lines,
    team: { ...base.team, onTarget, shots },
    ...(draft.shootout.length
      ? { shootout: draft.shootout.map((k, i) => ({ ...k, order: i + 1 })) }
      : {}),
    ...(subs.length ? { substitutions: subs } : {}),
  }
}
