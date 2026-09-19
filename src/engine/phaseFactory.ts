// engine/phaseFactory.ts
//
// Defaults for a brand-new phase and the factory for a whole custom
// tournament. Kept out of customPhases.ts so that file stays about the rules
// of the graph, and out of tournament.ts so the fixed-format factories do not
// depend on the phase machinery.
//
// The defaults live in the engine rather than in the blueprint UI because the
// tests build phases too, and a phase that is valid in a test but not on the
// canvas (or the reverse) is the kind of drift this codebase pays for twice.
import type { Team } from "../modules/teams/types"
import type {
  LegMode,
  PhaseConfig,
  PhaseEdge,
  PhaseKind,
  Tiebreaker,
  Tournament,
  TournamentPhase,
} from "../modules/tournament/types"
import { randomSeed, uid } from "./utils"
import { clampSwissOpponentCount } from "./swiss"
import { buildPhase, entryPhases, isPhaseGraphValid } from "./customPhases"

export interface PhaseScoringDefaults {
  tiebreaker?: Tiebreaker
  winPoints?: number
  drawPoints?: number
  lossPoints?: number
}

const DEFAULT_SCORING = { tiebreaker: "goal-diff" as Tiebreaker, win: 3, draw: 1, loss: 0 }

/** A playable config for a phase of this kind, before the user touches it. */
export function defaultPhaseConfig(
  kind: PhaseKind,
  scoring: PhaseScoringDefaults = {},
  teamCount = 8
): PhaseConfig {
  const tiebreaker = scoring.tiebreaker ?? DEFAULT_SCORING.tiebreaker
  const winPoints = scoring.winPoints ?? DEFAULT_SCORING.win
  const drawPoints = scoring.drawPoints ?? DEFAULT_SCORING.draw
  const lossPoints = scoring.lossPoints ?? DEFAULT_SCORING.loss
  const legMode: LegMode = "single"

  if (kind === "group") {
    return {
      kind: "group",
      group: {
        // Two groups is the smallest arrangement that is actually a group
        // stage; four teams a group is the usual shape, hence the cap.
        groupCount: Math.max(2, Math.min(4, Math.floor(teamCount / 4) || 2)),
        // Two through per group and no wildcards is the shape a group stage
        // has unless the user says otherwise — the same default the fixed
        // group format picks.
        qualifiersPerGroup: 2,
        wildcardCount: 0,
        legMode,
        seedMode: "seeded",
        tiebreaker,
        winPoints,
        drawPoints,
        lossPoints,
      },
    }
  }
  if (kind === "league") {
    return { kind: "league", league: { legMode, tiebreaker, winPoints, drawPoints, lossPoints } }
  }
  if (kind === "swiss") {
    return {
      kind: "swiss",
      swiss: {
        opponentCount: clampSwissOpponentCount(teamCount, Math.min(4, teamCount - 1)),
        potCount: 1,
        legMode,
        balanceHomeAway: true,
        seed: randomSeed(),
        tiebreaker,
        winPoints,
        drawPoints,
        lossPoints,
      },
    }
  }
  return {
    kind: "knockout",
    knockout: {
      seedMode: "seeded",
      hasThirdPlace: false,
      knockoutLegMode: legMode,
      roundLegModes: {},
      finalLegMode: legMode,
      thirdPlaceLegMode: legMode,
    },
  }
}

export interface CreatePhaseOptions {
  name: string
  pos?: { x: number; y: number }
  isFinal?: boolean
  scoring?: PhaseScoringDefaults
  teamCount?: number
  config?: PhaseConfig
}

export function createPhase(kind: PhaseKind, opts: CreatePhaseOptions): TournamentPhase {
  return {
    id: uid(),
    name: opts.name,
    kind,
    isFinal: opts.isFinal,
    pos: opts.pos ?? { x: 0, y: 0 },
    config: opts.config ?? defaultPhaseConfig(kind, opts.scoring, opts.teamCount),
    teamIds: [],
    status: "pending",
  }
}

export function createPhaseEdge(
  fromPhaseId: string,
  toPhaseId: string,
  fromRank = 1,
  toRank = 2
): PhaseEdge {
  return { id: uid(), fromPhaseId, toPhaseId, fromRank, toRank }
}

export interface CreateCustomOptions {
  phases: TournamentPhase[]
  phaseEdges: PhaseEdge[]
  season?: number
  manager?: Tournament["manager"]
  /** The order the entry phase's draw ceremony produced, when one was run. */
  entryOrderedIds?: string[]
}

/**
 * A custom tournament with its entry phase already built and every other phase
 * left pending until the user advances into it.
 *
 * Returns null on an invalid graph rather than producing a tournament that
 * cannot be played — the create page keeps its button disabled on the same
 * check, so this is the backstop, not the explanation.
 */
export function createCustomTournament(
  name: string,
  teams: Team[],
  opts: CreateCustomOptions
): Tournament | null {
  const phases = opts.phases.map((p) => ({ ...p, teamIds: [], status: "pending" as const }))
  const edges = opts.phaseEdges.map((e) => ({ ...e }))
  const teamIds = teams.map((t) => t.id)
  if (!isPhaseGraphValid(phases, edges, teamIds.length)) return null

  const entry = entryPhases(phases, edges)[0]
  if (!entry) return null

  const tournament: Tournament = {
    id: uid(),
    name,
    season: opts.season ?? 1,
    format: "custom",
    teamIds,
    phases,
    phaseEdges: edges,
    // Every fixture lives inside a phase; the top-level containers stay empty.
    rounds: [],
    winnerId: null,
    createdAt: Date.now(),
  }
  if (opts.manager) tournament.manager = { ...opts.manager }

  // `ranked: false` — the entry field's order is the order the user picked the
  // teams in, which says nothing about how good they are, so a seeded draw has
  // to sort by power itself. Every later phase arrives already ranked.
  buildPhase(entry, teamIds, teams, opts.entryOrderedIds, false)
  return tournament
}

/**
 * A fresh copy of an existing graph, every phase back to pending. Used by the
 * next season, which keeps the shape the user designed and replays it.
 */
export function clonePhaseGraph(t: Tournament): {
  phases: TournamentPhase[]
  phaseEdges: PhaseEdge[]
} {
  const phases = (t.phases ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    isFinal: p.isFinal,
    pos: { ...p.pos },
    // A JSON round trip, not structuredClone: by the time this runs the phase
    // is a Vue reactive proxy, which structuredClone refuses outright. A phase
    // config is plain numbers, strings and records, so the round trip is both
    // safe and total.
    config: JSON.parse(JSON.stringify(p.config)),
    teamIds: [],
    status: "pending" as const,
  }))
  return { phases, phaseEdges: (t.phaseEdges ?? []).map((e) => ({ ...e })) }
}
