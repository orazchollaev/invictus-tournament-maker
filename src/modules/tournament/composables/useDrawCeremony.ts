import { ref, computed, onUnmounted } from "vue"
import type { Team } from "@/modules/teams/types"
import {
  buildPots,
  computeDrawPlan,
  validatePots,
  makeRng,
  randomSeed,
  type Pot,
  type CeremonyContext,
  type DrawStep,
  type DrawPlan,
} from "@/engine"

export type CeremonyPhase = "pots" | "drawing" | "done"
export type CeremonySpeed = "normal" | "fast"

// Drives a single draw ceremony: editable pots → animated reveal → done.
// The whole outcome (sequence + orderedIds) is computed once from a seeded RNG
// so that the live reveal and an instant "skip" always agree. State is local /
// ephemeral; a mid-ceremony page refresh simply discards it (nothing is
// persisted until the host commits `orderedIds`).
// When `fixedPlan` is provided (e.g. the deterministic "cross" playoff draw) the
// pots are locked: editing is disabled, validation is skipped, and the reveal
// always replays the supplied plan instead of computing one from the pots.
export function useDrawCeremony(ctx: CeremonyContext, initialPots?: Pot[], fixedPlan?: DrawPlan) {
  const locked = !!fixedPlan
  let basePots: Pot[] = (initialPots ?? buildPots(ctx)).map((p) => ({
    label: p.label,
    teamIds: [...p.teamIds],
  }))
  const clone = () => basePots.map((p) => ({ label: p.label, teamIds: [...p.teamIds] }))

  const pots = ref<Pot[]>(clone())
  const phase = ref<CeremonyPhase>("pots")
  const speed = ref<CeremonySpeed>(ctx.teams.length > 32 ? "fast" : "normal")

  const sequence = ref<DrawStep[]>([])
  const orderedIds = ref<string[]>([])
  const revealed = ref<DrawStep[]>([])
  const current = ref<DrawStep | null>(null)

  const localTeamCount = ref(ctx.teams.length)
  const errors = computed(() => (locked ? [] : validatePots(pots.value, localTeamCount.value)))
  const canStart = computed(() => locked || errors.value.length === 0)
  const progress = computed(() =>
    sequence.value.length ? revealed.value.length / sequence.value.length : 0
  )

  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  // The paper must stay on screen long enough to fully unfold (~0.7s) even in
  // fast mode; fast mode only shortens the gap between reveals.
  function displayMs() {
    return speed.value === "fast" ? 800 : 1050
  }
  function gapMs() {
    return speed.value === "fast" ? 110 : 320
  }

  function plan() {
    if (fixedPlan) return fixedPlan
    return computeDrawPlan(pots.value, ctx, makeRng(randomSeed()))
  }

  function resetPots() {
    if (locked || phase.value !== "pots") return
    pots.value = clone()
  }

  function rebuild(newTeams: Team[]) {
    if (locked || phase.value !== "pots") return
    localTeamCount.value = newTeams.length
    const newCtx: CeremonyContext = { ...ctx, teams: newTeams }
    basePots = buildPots(newCtx).map((p) => ({ label: p.label, teamIds: [...p.teamIds] }))
    pots.value = clone()
  }

  function start() {
    if (!canStart.value || phase.value !== "pots") return
    const p = plan()
    sequence.value = p.sequence
    orderedIds.value = p.orderedIds
    revealed.value = []
    current.value = null
    phase.value = "drawing"
    tick(0)
  }

  function tick(i: number) {
    if (i >= sequence.value.length) {
      finish()
      return
    }
    current.value = sequence.value[i]
    // paper unfolds, then drops onto the board, then a short gap before next
    timer = setTimeout(() => {
      revealed.value = [...revealed.value, sequence.value[i]]
      current.value = null
      timer = setTimeout(() => tick(i + 1), gapMs())
    }, displayMs())
  }

  function finish() {
    clearTimer()
    revealed.value = [...sequence.value]
    current.value = null
    phase.value = "done"
  }

  // Skip: jump straight to the final outcome (same orderedIds).
  function skip() {
    clearTimer()
    if (phase.value === "pots") {
      if (!canStart.value) return
      const p = plan()
      sequence.value = p.sequence
      orderedIds.value = p.orderedIds
    }
    finish()
  }

  onUnmounted(clearTimer)

  return {
    locked,
    pots,
    phase,
    speed,
    sequence,
    orderedIds,
    revealed,
    current,
    errors,
    canStart,
    progress,
    resetPots,
    rebuild,
    start,
    skip,
  }
}
