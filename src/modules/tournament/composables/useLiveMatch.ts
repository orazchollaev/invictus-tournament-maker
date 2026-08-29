// Plays a match out on a clock.
//
// The narrative is generated up front and handed over whole — this owns no
// randomness and decides nothing. Its entire job is *when*: it advances a
// clock, reveals each event as the clock reaches it, and holds for a beat so
// a goal registers before the minutes move on again. Skipping therefore
// cannot change the result, and neither can closing the window.
import { computed, onScopeDispose, ref, type Ref } from "vue"
import {
  FULL_TIME_MINUTES,
  HALF_TIME_MINUTE,
  EXTRA_TIME_HALF_MINUTE,
  REGULATION_MINUTES,
} from "@/engine"
import type { MatchEvent, ShootoutKick } from "../types"

export type LiveSpeed = 1 | 2 | 4 | 10

/** Where the match currently is. `break` is any interval, named by `breakAt`. */
export type LiveStage = "kickoff" | "playing" | "break" | "shootout" | "done"

export interface LiveMatchSource {
  /** Sorted by minute, exactly as stored on the result. */
  events: MatchEvent[]
  shootout?: ShootoutKick[]
  hasExtraTime: boolean
}

/** Game minutes per real second at 1x — ninety minutes in about three quarters of one. */
const MINUTES_PER_SECOND = 2
/** Long enough to read a scorer's name, short enough not to stall a 4x run. */
const EVENT_HOLD_MS = 800
const BREAK_HOLD_MS = 1400
const KICK_INTERVAL_MS = 1100
/** Kicks keep a watchable rhythm even at the fastest setting — they are the drama. */
const MIN_KICK_INTERVAL_MS = 300

const GOAL_TYPES = new Set(["goal", "penGoal", "ownGoal"])

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function useLiveMatch(source: LiveMatchSource, speed: Ref<LiveSpeed>) {
  const { events, hasExtraTime } = source
  const kicks = source.shootout ?? []

  // Stoppage can push the last event past the scheduled end, and the whistle
  // never goes before the final incident.
  const scheduledEnd = hasExtraTime ? FULL_TIME_MINUTES : REGULATION_MINUTES
  const endMinute = Math.max(scheduledEnd, events.length ? events[events.length - 1].minute : 0)

  /** Intervals, in the order they arrive. */
  const breaks = hasExtraTime
    ? [HALF_TIME_MINUTE, REGULATION_MINUTES, EXTRA_TIME_HALF_MINUTE]
    : [HALF_TIME_MINUTE]

  const clock = ref(0)
  const stage = ref<LiveStage>("kickoff")
  const paused = ref(false)
  const revealed = ref(0)
  const kicksTaken = ref(0)
  /** The minute the current interval is at, for the label on screen. */
  const breakAt = ref<number | null>(null)

  const visibleEvents = computed(() => events.slice(0, revealed.value))
  const visibleKicks = computed(() => kicks.slice(0, kicksTaken.value))

  const score = computed(() => {
    let home = 0
    let away = 0
    for (const event of visibleEvents.value) {
      if (!GOAL_TYPES.has(event.type)) continue
      if (event.side === "home") home++
      else away++
    }
    return { home, away }
  })

  const penScore = computed(() => {
    let home = 0
    let away = 0
    for (const kick of visibleKicks.value) {
      if (!kick.scored) continue
      if (kick.side === "home") home++
      else away++
    }
    return { home, away }
  })

  const finished = computed(() => stage.value === "done")
  const inExtraTime = computed(() => hasExtraTime && clock.value > REGULATION_MINUTES)

  const reduced = prefersReducedMotion()
  const eventHold = reduced ? 0 : EVENT_HOLD_MS
  const breakHold = reduced ? 0 : BREAK_HOLD_MS

  let frame = 0
  let lastTs = 0
  let holdUntil = 0
  let nextKickAt = 0
  let takenBreaks = new Set<number>()

  /** The first interval strictly inside the span about to be played. */
  function breakWithin(from: number, to: number): number | null {
    for (const minute of breaks) {
      if (!takenBreaks.has(minute) && minute > from && minute <= to) return minute
    }
    return null
  }

  function advanceClock(deltaMs: number, now: number) {
    const target = clock.value + (deltaMs / 1000) * MINUTES_PER_SECOND * speed.value

    const interval = breakWithin(clock.value, target)
    if (interval !== null) {
      clock.value = interval
      revealUpTo(interval)
      takenBreaks.add(interval)
      breakAt.value = interval
      stage.value = "break"
      holdUntil = now + breakHold
      return
    }

    const next = events[revealed.value]
    if (next && next.minute <= target) {
      clock.value = next.minute
      revealUpTo(next.minute)
      stage.value = "playing"
      holdUntil = now + eventHold
      return
    }

    stage.value = "playing"
    clock.value = Math.min(target, endMinute)
    if (clock.value >= endMinute) endPlay(now)
  }

  function revealUpTo(minute: number) {
    while (revealed.value < events.length && events[revealed.value].minute <= minute) {
      revealed.value++
    }
  }

  function endPlay(now: number) {
    revealed.value = events.length
    if (kicks.length) {
      stage.value = "shootout"
      breakAt.value = null
      nextKickAt = now + breakHold
    } else {
      stage.value = "done"
    }
  }

  function advanceShootout(now: number) {
    if (kicksTaken.value >= kicks.length) {
      stage.value = "done"
      return
    }
    if (now < nextKickAt) return
    kicksTaken.value++
    nextKickAt =
      now + (reduced ? 0 : Math.max(MIN_KICK_INTERVAL_MS, KICK_INTERVAL_MS / speed.value))
  }

  function tick(ts: number) {
    frame = requestAnimationFrame(tick)
    if (!lastTs) lastTs = ts
    const delta = ts - lastTs
    lastTs = ts

    if (paused.value || stage.value === "done") return
    if (stage.value === "shootout") {
      advanceShootout(ts)
      return
    }
    if (ts < holdUntil) return
    advanceClock(delta, ts)
  }

  function start() {
    if (frame) return
    lastTs = 0
    // A beat on the whistle before the minutes start moving, so the window
    // opens on a match about to begin rather than one already in progress.
    holdUntil = performance.now() + breakHold
    frame = requestAnimationFrame(tick)
  }

  function stop() {
    if (!frame) return
    cancelAnimationFrame(frame)
    frame = 0
  }

  function toggle() {
    paused.value = !paused.value
    // The clock resumes where it stopped rather than swallowing the pause.
    lastTs = 0
  }

  /** Jump to the end. The result was already decided, so nothing is skipped but time. */
  function skip() {
    revealed.value = events.length
    kicksTaken.value = kicks.length
    clock.value = endMinute
    takenBreaks = new Set(breaks)
    breakAt.value = null
    stage.value = "done"
    stop()
  }

  onScopeDispose(stop)

  return {
    clock,
    endMinute,
    hasExtraTime,
    stage,
    breakAt,
    paused,
    visibleEvents,
    visibleKicks,
    score,
    penScore,
    finished,
    inExtraTime,
    start,
    stop,
    toggle,
    skip,
  }
}
