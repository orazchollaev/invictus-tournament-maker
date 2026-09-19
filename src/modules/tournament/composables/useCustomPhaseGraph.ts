// modules/tournament/composables/useCustomPhaseGraph.ts
//
// The reactive shell around a phase graph being drawn. It holds refs and
// forwards every decision to the engine — validation, intake sizes, defaults —
// so the rules the canvas enforces and the rules a created tournament is built
// from are the same rules, checked in one place.
import { computed, ref, type Ref } from "vue"
import type { PhaseConfig, PhaseEdge, PhaseKind, TournamentPhase } from "@/modules/tournament/types"
import {
  createPhase,
  createPhaseEdge,
  defaultPhaseConfig,
  phaseIntakeSizes,
  phaseOutputCount,
  validatePhaseGraph,
} from "@/engine"

/** Laid out left to right, so a new phase lands beside the last one. */
const COLUMN_WIDTH = 240
const ROW_HEIGHT = 150

export interface PhaseGraphDraft {
  phases: TournamentPhase[]
  phaseEdges: PhaseEdge[]
}

export function useCustomPhaseGraph(teamCount: Ref<number>) {
  const phases = ref<TournamentPhase[]>([])
  const edges = ref<PhaseEdge[]>([])

  /** How many teams reach each phase — the number every limit is measured against. */
  const intakeSizes = computed(
    () => phaseIntakeSizes(phases.value, edges.value, teamCount.value) ?? new Map<string, number>()
  )

  function intakeOf(phaseId: string): number {
    return intakeSizes.value.get(phaseId) ?? 0
  }

  const errors = computed(() => validatePhaseGraph(phases.value, edges.value, teamCount.value))
  const isValid = computed(() => errors.value.length === 0)

  function errorsFor(phaseId: string) {
    return errors.value.filter((e) => e.phaseId === phaseId)
  }

  function nextPosition(): { x: number; y: number } {
    if (!phases.value.length) return { x: 40, y: 40 }
    const rightmost = phases.value.reduce((max, p) => Math.max(max, p.pos.x), 0)
    const inColumn = phases.value.filter((p) => p.pos.x === rightmost).length
    return { x: rightmost + COLUMN_WIDTH, y: 40 + (inColumn - 1) * ROW_HEIGHT }
  }

  function addPhase(kind: PhaseKind, name: string): TournamentPhase {
    const phase = createPhase(kind, {
      name,
      pos: nextPosition(),
      // A brand-new phase has no incoming edge yet, so the whole field is the
      // only size its defaults can be scaled to.
      teamCount: teamCount.value,
    })
    phases.value.push(phase)
    return phase
  }

  function removePhase(phaseId: string) {
    phases.value = phases.value.filter((p) => p.id !== phaseId)
    // An edge with only one end left is what would crash on advance later.
    edges.value = edges.value.filter((e) => e.fromPhaseId !== phaseId && e.toPhaseId !== phaseId)
  }

  function renamePhase(phaseId: string, name: string) {
    const phase = phases.value.find((p) => p.id === phaseId)
    if (phase) phase.name = name
  }

  /** Exactly one phase decides the tournament, so marking one unmarks the rest. */
  function setFinal(phaseId: string) {
    for (const phase of phases.value) phase.isFinal = phase.id === phaseId
  }

  function movePhase(phaseId: string, pos: { x: number; y: number }) {
    const phase = phases.value.find((p) => p.id === phaseId)
    if (phase) phase.pos = { x: Math.round(pos.x), y: Math.round(pos.y) }
  }

  function setConfig(phaseId: string, config: PhaseConfig) {
    const phase = phases.value.find((p) => p.id === phaseId)
    if (phase) phase.config = config
  }

  /**
   * Connects two phases, defaulting the range to the places not already
   * claimed by another edge out of the same source — so a second connection
   * off one table starts where the first one left off instead of overlapping
   * it and being rejected the moment it is drawn.
   */
  function connect(fromPhaseId: string, toPhaseId: string): PhaseEdge | undefined {
    if (fromPhaseId === toPhaseId) return undefined
    const exists = edges.value.some(
      (e) => e.fromPhaseId === fromPhaseId && e.toPhaseId === toPhaseId
    )
    if (exists) return undefined

    const source = phases.value.find((p) => p.id === fromPhaseId)
    const available = source ? phaseOutputCount(source, intakeOf(fromPhaseId)) : 0

    // A group phase's qualifiers are set in its own settings, so the range is
    // only recorded for completeness and never read — see resolvePhaseQualifiers.
    if (source?.kind === "group") {
      const edge = createPhaseEdge(fromPhaseId, toPhaseId, 1, Math.max(1, available))
      edges.value.push(edge)
      return edge
    }

    const claimed = edges.value
      .filter((e) => e.fromPhaseId === fromPhaseId)
      .reduce((max, e) => Math.max(max, e.toRank), 0)
    const from = claimed + 1
    const to = Math.max(from, Math.min(from + 1, available || from + 1))

    const edge = createPhaseEdge(fromPhaseId, toPhaseId, from, to)
    edges.value.push(edge)
    return edge
  }

  function disconnect(edgeId: string) {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
  }

  function setRange(edgeId: string, fromRank: number, toRank: number) {
    const edge = edges.value.find((e) => e.id === edgeId)
    if (!edge) return
    edge.fromRank = Math.max(1, Math.round(fromRank))
    edge.toRank = Math.max(edge.fromRank, Math.round(toRank))
  }

  /** Replaces the whole draft — used when reopening the modal on an existing one. */
  function load(draft: PhaseGraphDraft) {
    phases.value = draft.phases.map((p) => ({ ...p, pos: { ...p.pos } }))
    edges.value = draft.phaseEdges.map((e) => ({ ...e }))
  }

  function toDraft(): PhaseGraphDraft {
    return {
      phases: phases.value.map((p) => ({
        ...p,
        pos: { ...p.pos },
        config: JSON.parse(JSON.stringify(p.config)) as PhaseConfig,
        teamIds: [],
        status: "pending" as const,
      })),
      phaseEdges: edges.value.map((e) => ({ ...e })),
    }
  }

  function reset() {
    phases.value = []
    edges.value = []
  }

  return {
    phases,
    edges,
    errors,
    errorsFor,
    isValid,
    intakeOf,
    addPhase,
    removePhase,
    renamePhase,
    setFinal,
    movePhase,
    setConfig,
    connect,
    disconnect,
    setRange,
    load,
    toDraft,
    reset,
    defaultPhaseConfig,
  }
}
