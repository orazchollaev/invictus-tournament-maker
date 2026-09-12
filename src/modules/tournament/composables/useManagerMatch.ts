// Runs the clock for a match the user is managing.
//
// The sister of useLiveMatch, and deliberately not the same thing.
// `useLiveMatch` replays a narrative that was rolled before the window
// opened, so it owns no randomness and decides nothing. This one drives
// `engine/liveMatch.ts` forward a minute at a time: the match is being
// played while it is being watched, so pausing to change the shape or bring
// somebody on genuinely changes what happens next.
//
// What it owns is still only *when*. Every question of what happens belongs
// to the engine; this decides how long to hold on a goal and when the half
// is over.
import { computed, onScopeDispose, ref, shallowRef, type Ref } from "vue"
import {
  EXTRA_TIME_HALF_MINUTE,
  FULL_TIME_MINUTES,
  HALF_TIME_MINUTE,
  MAX_SUBSTITUTIONS,
  REGULATION_MINUTES,
  advanceMinute,
  applySubstitution,
  benchFor,
  endMinute,
  finishLiveMatch,
  onPitchFor,
  setTactics,
  type LiveMatchState,
  type LiveTactics,
  type Side,
} from "@/engine"
import type { LineupSlot } from "@/engine"
import type { Player } from "@/modules/players/types"
import type { MatchEvent, MatchStats, MatchResult, ShootoutKick } from "../types"

export type LiveSpeed = 1 | 2 | 4 | 10

/** Where the match currently is. `break` is any interval, named by `breakAt`. */
export type ManagerStage = "kickoff" | "playing" | "break" | "shootout" | "done"

/** Game minutes per real second at 1x — ninety minutes in about three quarters of one. */
const MINUTES_PER_SECOND = 2
/** Long enough to read a scorer's name, short enough not to stall a 4x run. */
const EVENT_HOLD_MS = 800
const BREAK_HOLD_MS = 1400
const KICK_INTERVAL_MS = 1100
const MIN_KICK_INTERVAL_MS = 300

/** Events worth stopping the clock for. A booking is not one of them. */
const HOLD_TYPES = new Set(["goal", "penGoal", "ownGoal", "penMiss", "red"])

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function useManagerMatch(state: LiveMatchState, managed: Side, speed: Ref<LiveSpeed>) {
  const clock = ref(0)
  const stage = ref<ManagerStage>("kickoff")
  const paused = ref(false)
  const breakAt = ref<number | null>(null)
  const kicksTaken = ref(0)

  /**
   * The engine mutates plain objects. Rather than hand the whole state to
   * Vue's reactivity — which would proxy every lineup slot and quietly break
   * the identity comparisons the engine does on them — the view reads these,
   * and `sync()` refreshes them after anything that changes the match.
   */
  const events = shallowRef<MatchEvent[]>([])
  const score = ref({ home: 0, away: 0 })
  const pitch = shallowRef<LineupSlot[]>([])
  const bench = shallowRef<Player[]>([])
  const tactics = ref<LiveTactics>({ ...state[managed].tactics })
  const subsUsed = ref(0)
  const finished = ref(false)
  const extraTime = ref(false)
  const last = ref<number>(endMinute(state))

  function sync() {
    // Chronological, exactly as the timeline component expects it.
    events.value = [...state.events]
    score.value = { ...state.score }
    pitch.value = onPitchFor(state, managed)
    bench.value = benchFor(state, managed)
    tactics.value = { ...state[managed].tactics }
    subsUsed.value = state[managed].subsUsed
    finished.value = state.finished
    extraTime.value = state.extraTime
    last.value = endMinute(state)
  }
  sync()

  const subsLeft = computed(() => MAX_SUBSTITUTIONS - subsUsed.value)
  const inExtraTime = computed(() => extraTime.value && clock.value > REGULATION_MINUTES)
  const shootoutKicks = computed<ShootoutKick[]>(() => {
    const rolled = state.shootout
    if (!rolled) return []
    return rolled.kicks.slice(0, kicksTaken.value).map((kick, index) => ({
      order: index + 1,
      side: kick.side,
      playerId: null,
      scored: kick.scored,
    }))
  })
  const penScore = computed(() => {
    let home = 0
    let away = 0
    for (const kick of shootoutKicks.value) {
      if (!kick.scored) continue
      if (kick.side === "home") home++
      else away++
    }
    return { home, away }
  })

  const reduced = prefersReducedMotion()
  const eventHold = reduced ? 0 : EVENT_HOLD_MS
  const breakHold = reduced ? 0 : BREAK_HOLD_MS

  let frame = 0
  let lastTs = 0
  let holdUntil = 0
  let nextKickAt = 0
  let taken = new Set<number>()

  /** Intervals, in the order they arrive. Extra time adds its own two. */
  function breaks(): number[] {
    return state.extraTime
      ? [HALF_TIME_MINUTE, REGULATION_MINUTES, EXTRA_TIME_HALF_MINUTE]
      : [HALF_TIME_MINUTE]
  }

  function playMinute(now: number) {
    const fresh = advanceMinute(state)
    clock.value = state.minute
    sync()

    if (fresh.some((event) => HOLD_TYPES.has(event.type))) holdUntil = now + eventHold

    if (state.finished) {
      if (state.shootout) {
        stage.value = "shootout"
        breakAt.value = null
        nextKickAt = now + breakHold
      } else {
        stage.value = "done"
      }
      return
    }

    const interval = breaks().find((minute) => minute === state.minute && !taken.has(minute))
    if (interval !== undefined) {
      taken.add(interval)
      breakAt.value = interval
      stage.value = "break"
      holdUntil = now + breakHold
      return
    }

    stage.value = "playing"
  }

  function advanceShootout(now: number) {
    const total = state.shootout?.kicks.length ?? 0
    if (kicksTaken.value >= total) {
      stage.value = "done"
      return
    }
    if (now < nextKickAt) return
    kicksTaken.value++
    nextKickAt =
      now + (reduced ? 0 : Math.max(MIN_KICK_INTERVAL_MS, KICK_INTERVAL_MS / speed.value))
  }

  /** Real milliseconds a game minute takes at the current speed. */
  function msPerMinute(): number {
    return 1000 / (MINUTES_PER_SECOND * speed.value)
  }

  let elapsed = 0

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

    elapsed += delta
    const step = msPerMinute()
    // One minute per step, never several at once: each has to be played
    // through the engine, and a dropped frame must not skip a goal.
    if (elapsed < step) return
    elapsed -= step
    playMinute(ts)
  }

  function start() {
    if (frame) return
    lastTs = 0
    elapsed = 0
    // A beat on the whistle before the minutes start moving.
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
    lastTs = 0
  }

  /** Resume from a break the user was held at. */
  function resume() {
    if (stage.value !== "break") return
    breakAt.value = null
    stage.value = "playing"
    holdUntil = 0
  }

  /**
   * Play the rest out at once.
   *
   * Unlike the watcher's skip, this really does give up the remaining
   * decisions — the minutes still have to be simulated, they just are not
   * shown. Nothing already on screen changes.
   */
  function skip() {
    let guard = 0
    while (!state.finished && guard++ <= FULL_TIME_MINUTES + 1) advanceMinute(state)
    clock.value = state.minute
    kicksTaken.value = state.shootout?.kicks.length ?? 0
    taken = new Set(breaks())
    breakAt.value = null
    stage.value = "done"
    sync()
    stop()
  }

  function substitute(outSlot: LineupSlot, inPlayer: Player): boolean {
    const done = applySubstitution(state, managed, outSlot, inPlayer)
    sync()
    return done !== null
  }

  function changeTactics(next: Partial<LiveTactics>) {
    setTactics(state, managed, next)
    sync()
  }

  function finish(): { result: MatchResult; stats: MatchStats } {
    return finishLiveMatch(state)
  }

  onScopeDispose(stop)

  return {
    clock,
    last,
    stage,
    breakAt,
    paused,
    events,
    score,
    penScore,
    shootoutKicks,
    pitch,
    bench,
    tactics,
    subsLeft,
    finished,
    extraTime,
    inExtraTime,
    start,
    stop,
    toggle,
    resume,
    skip,
    substitute,
    changeTactics,
    finish,
  }
}
