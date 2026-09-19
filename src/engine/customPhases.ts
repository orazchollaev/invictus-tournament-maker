// engine/customPhases.ts
//
// The custom format: a directed graph of phases the user wires up themselves.
// Everything here is pure in the sense the rest of the engine is — no Vue, no
// store, no DOM. A phase's fixture is built by the same builders every fixed
// format uses, and its container is the same shape, so nothing downstream
// (match iteration, manager mode, stats, history) has to know a phase exists.
//
// Two rules shape the whole design:
//
//   1. Exactly one phase has no incoming edge. All of the tournament's teams
//      enter there, which is what makes the rest of the graph resolvable.
//   2. What advances is a *rank range* on the edge, not a count on the phase.
//      One table can therefore split two ways -- 1-2 into the cup, 3-4 into a
//      secondary bracket -- and a group phase needs no separate wildcard rule.
import type { Team } from "../modules/teams/types"
import type {
  Group,
  GroupStanding,
  League,
  Match,
  PhaseEdge,
  PhaseKind,
  Round,
  Tournament,
  TournamentPhase,
} from "../modules/tournament/types"
import { uid, shuffle } from "./utils"
import { buildGroupFixture, recalcStandings, selectWildcards } from "./groups"
import {
  buildHalfLeagueMatchdays,
  buildLeagueMatchdays,
  recalcLeagueStandings,
  allLeagueDone,
} from "./league"
import { buildSwissLeague, SWISS_MIN_TEAMS } from "./swiss"
import {
  applyLegModes,
  applyThirdPlaceLegMode,
  buildBracketRounds,
  getLoserId,
  getWinnerId,
  packDirectSlots,
  propagateWinners,
  seedPairOrder,
} from "./bracket"
import { knockoutComplete, updateThirdPlaceSlotsIn } from "./knockoutOps"
import { resolvePower } from "./power"
import { legModeToCount } from "./legs"
import type { GroupHost, KnockoutHost, LeagueHost, ScoringHost } from "./hosts"

/** The fewest teams each kind of phase can be run with. */
export const PHASE_MIN_TEAMS: Record<PhaseKind, number> = {
  group: 4,
  league: 2,
  swiss: SWISS_MIN_TEAMS,
  knockout: 2,
}

function zeroStandings(teamIds: string[]): GroupStanding[] {
  return teamIds.map((teamId) => ({
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  }))
}

// ─── Graph shape ─────────────────────────────────────────────────

export function incomingEdges(edges: PhaseEdge[], phaseId: string): PhaseEdge[] {
  return edges.filter((e) => e.toPhaseId === phaseId)
}

export function outgoingEdges(edges: PhaseEdge[], phaseId: string): PhaseEdge[] {
  return edges.filter((e) => e.fromPhaseId === phaseId)
}

/** Phases nothing feeds — where the tournament's own teams enter. */
export function entryPhases(phases: TournamentPhase[], edges: PhaseEdge[]): TournamentPhase[] {
  return phases.filter((p) => incomingEdges(edges, p.id).length === 0)
}

/** Phases that feed nothing — where the tournament ends. */
export function terminalPhases(phases: TournamentPhase[], edges: PhaseEdge[]): TournamentPhase[] {
  return phases.filter((p) => outgoingEdges(edges, p.id).length === 0)
}

export function findPhase(t: Tournament, phaseId: string): TournamentPhase | undefined {
  return t.phases?.find((p) => p.id === phaseId)
}

/**
 * Phases in dependency order, or null when the graph has a cycle. Kahn's
 * algorithm, keeping the author's own phase order among the ready set so the
 * result is stable and reads the way the canvas was built.
 */
export function topoOrder(
  phases: TournamentPhase[],
  edges: PhaseEdge[]
): TournamentPhase[] | null {
  const known = new Set(phases.map((p) => p.id))
  const live = edges.filter((e) => known.has(e.fromPhaseId) && known.has(e.toPhaseId))
  const pending = new Map(phases.map((p) => [p.id, incomingEdges(live, p.id).length]))
  const out: TournamentPhase[] = []
  const remaining = [...phases]

  while (remaining.length) {
    const idx = remaining.findIndex((p) => (pending.get(p.id) ?? 0) === 0)
    if (idx === -1) return null // every phase left still waits on another: a cycle
    const [phase] = remaining.splice(idx, 1)
    out.push(phase)
    for (const e of outgoingEdges(live, phase.id)) {
      pending.set(e.toPhaseId, (pending.get(e.toPhaseId) ?? 1) - 1)
    }
  }
  return out
}

/** How many teams a rank range covers. */
export function edgeSize(edge: PhaseEdge): number {
  return Math.max(0, edge.toRank - edge.fromRank + 1)
}

/**
 * How many teams a group phase sends on: its automatic spots plus its
 * wildcards, both clamped to what the field can actually supply.
 *
 * This is why a group phase's edge has no range of its own — the count is a
 * property of the phase, exactly as it is in the fixed group format.
 */
export function groupOutputCount(phase: TournamentPhase, intake: number): number {
  if (phase.config.kind !== "group") return intake
  const cfg = phase.config.group
  // Defaulted rather than trusted: a record written by an older build has no
  // qualifier fields at all, and one arithmetic NaN here would spread into
  // every size the graph is checked against.
  const groupCount = Math.max(1, Math.min(cfg.groupCount || 2, Math.floor(intake / 2) || 1))
  const smallestGroup = Math.floor(intake / groupCount)
  const perGroup = Math.max(1, Math.min(cfg.qualifiersPerGroup || 2, smallestGroup))
  // A wildcard needs a team left over to be the best of — with every place
  // already qualifying there is nobody to pick.
  const wildcards =
    perGroup < smallestGroup ? Math.min(Math.max(0, cfg.wildcardCount || 0), groupCount) : 0
  return Math.min(intake, groupCount * perGroup + wildcards)
}

/** How many teams one edge carries, which the source phase's kind decides. */
export function edgeIntake(
  edge: PhaseEdge,
  source: TournamentPhase | undefined,
  sourceIntake: number
): number {
  if (source?.kind === "group") return groupOutputCount(source, sourceIntake)
  return edgeSize(edge)
}

/** The highest finishing place an edge out of this phase can name. */
export function phaseOutputCount(phase: TournamentPhase, intake: number): number {
  return phase.kind === "group" ? groupOutputCount(phase, intake) : intake
}

/**
 * How many teams reach each phase, given the tournament's own field size.
 * Entry phases get the whole field; every other phase gets the sum of its
 * incoming edges. Returns null when the graph cannot be ordered.
 */
export function phaseIntakeSizes(
  phases: TournamentPhase[],
  edges: PhaseEdge[],
  teamCount: number
): Map<string, number> | null {
  const order = topoOrder(phases, edges)
  if (!order) return null
  const byId = new Map(phases.map((p) => [p.id, p]))
  const sizes = new Map<string, number>()
  for (const phase of order) {
    const incoming = incomingEdges(edges, phase.id)
    if (!incoming.length) {
      sizes.set(phase.id, teamCount)
      continue
    }
    // Sources come first in topological order, so their own intake is known.
    sizes.set(
      phase.id,
      incoming.reduce((sum, e) => {
        const source = byId.get(e.fromPhaseId)
        return sum + edgeIntake(e, source, sizes.get(e.fromPhaseId) ?? 0)
      }, 0)
    )
  }
  return sizes
}

// ─── Validation ──────────────────────────────────────────────────

export interface PhaseGraphError {
  /** i18n key suffix under tournament.phases.errors — never a message. */
  code: string
  phaseId?: string
  edgeId?: string
  /** Interpolation values for the message, when it needs any. */
  params?: Record<string, number | string>
}

/**
 * Every reason a graph cannot be turned into a tournament, as i18n keys —
 * the same shape validateSwissConfig returns, for the same reason: the engine
 * decides what is wrong, the UI decides how to say it.
 */
export function validatePhaseGraph(
  phases: TournamentPhase[],
  edges: PhaseEdge[],
  teamCount: number
): PhaseGraphError[] {
  const errors: PhaseGraphError[] = []
  if (!phases.length) return [{ code: "noPhases" }]

  // Structural edge faults first, and unconditionally. They are what *causes*
  // the entry and cycle checks below to misreport — a self edge reads as a
  // cycle, an edge into nothing reads as a missing entry — so reporting them
  // only after those checks have passed would never report them at all.
  const byId = new Map(phases.map((p) => [p.id, p]))
  for (const edge of edges) {
    if (edge.fromPhaseId === edge.toPhaseId) {
      errors.push({ code: "selfEdge", edgeId: edge.id })
    } else if (!byId.has(edge.fromPhaseId) || !byId.has(edge.toPhaseId)) {
      errors.push({ code: "danglingEdge", edgeId: edge.id })
    }
  }

  const entries = entryPhases(phases, edges)
  if (entries.length === 0) errors.push({ code: "noEntry" })
  if (entries.length > 1) {
    for (const p of entries) errors.push({ code: "multipleEntry", phaseId: p.id })
  }

  if (!topoOrder(phases, edges)) {
    errors.push({ code: "cycle" })
    // Nothing below can be computed without an order.
    return errors
  }

  for (const phase of phases) {
    if (!phase.name.trim()) errors.push({ code: "unnamed", phaseId: phase.id })
    // A knockout ranks its field, but its losers are out — it is where a
    // branch of the graph ends, by design.
    if (phase.kind === "knockout" && outgoingEdges(edges, phase.id).length > 0) {
      errors.push({ code: "knockoutHasOutput", phaseId: phase.id })
    }
  }

  const finals = phases.filter((p) => p.isFinal)
  if (finals.length === 0) errors.push({ code: "noFinal" })
  if (finals.length > 1) {
    for (const p of finals) errors.push({ code: "multipleFinal", phaseId: p.id })
  }
  for (const p of finals) {
    if (outgoingEdges(edges, p.id).length > 0) {
      errors.push({ code: "finalNotTerminal", phaseId: p.id })
    }
  }

  const sizes = phaseIntakeSizes(phases, edges, teamCount) ?? new Map<string, number>()

  for (const edge of edges) {
    const from = byId.get(edge.fromPhaseId)
    // Already reported above; nothing here can be said about it.
    if (!from || !byId.has(edge.toPhaseId) || edge.fromPhaseId === edge.toPhaseId) continue
    // A group phase's edge has no range — its config decides who advances.
    if (from.kind === "group") continue
    const available = sizes.get(from.id) ?? 0
    if (edge.fromRank < 1 || edge.toRank < edge.fromRank || edge.toRank > available) {
      errors.push({
        code: "edgeRankRange",
        edgeId: edge.id,
        params: { from: edge.fromRank, to: edge.toRank, available },
      })
    }
  }

  for (const phase of phases) {
    const out = outgoingEdges(edges, phase.id)
    // A group phase sends its qualifiers on as one set, so splitting them two
    // ways has nothing to divide by: the count is a property of the phase, not
    // of the connection. Split a table phase instead.
    if (phase.kind === "group" && out.length > 1) {
      for (const e of out.slice(1)) {
        errors.push({ code: "groupSingleOutput", phaseId: phase.id, edgeId: e.id })
      }
      continue
    }
    // Two edges out of the same table must not claim the same finishing place.
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]
        const b = out[j]
        if (a.fromRank <= b.toRank && b.fromRank <= a.toRank) {
          errors.push({ code: "rangeOverlap", phaseId: phase.id, edgeId: b.id })
        }
      }
    }
  }

  for (const phase of phases) {
    const intake = sizes.get(phase.id) ?? 0
    const min = PHASE_MIN_TEAMS[phase.kind]
    if (intake < min) {
      errors.push({ code: "phaseTooSmall", phaseId: phase.id, params: { intake, min } })
      continue
    }
    if (phase.config.kind === "group") {
      const cfg = phase.config.group
      const groupCount = cfg.groupCount
      if (groupCount < 1) {
        errors.push({ code: "groupCount", phaseId: phase.id })
      } else if (Math.floor(intake / groupCount) < 2) {
        errors.push({
          code: "groupsTooSmall",
          phaseId: phase.id,
          params: { intake, groupCount },
        })
      } else if (cfg.qualifiersPerGroup < 1 || cfg.qualifiersPerGroup > Math.floor(intake / groupCount)) {
        errors.push({
          code: "groupQualifiers",
          phaseId: phase.id,
          params: { qualifiers: cfg.qualifiersPerGroup, max: Math.floor(intake / groupCount) },
        })
      } else if (cfg.wildcardCount < 0 || cfg.wildcardCount > groupCount) {
        errors.push({
          code: "groupWildcards",
          phaseId: phase.id,
          params: { wildcards: cfg.wildcardCount, max: groupCount },
        })
      }
    }
    if (phase.config.kind === "swiss") {
      const opponents = phase.config.swiss.opponentCount
      if (opponents < 1 || opponents > intake - 1) {
        errors.push({
          code: "swissOpponents",
          phaseId: phase.id,
          params: { opponents, max: Math.max(1, intake - 1) },
        })
      }
    }
    if (phase.config.kind !== phase.kind) {
      errors.push({ code: "configMismatch", phaseId: phase.id })
    }
  }

  return errors
}

export function isPhaseGraphValid(
  phases: TournamentPhase[],
  edges: PhaseEdge[],
  teamCount: number
): boolean {
  return validatePhaseGraph(phases, edges, teamCount).length === 0
}

// ─── Container hosts ─────────────────────────────────────────────
//
// The adapters that let the ordinary group/league/knockout helpers act on a
// phase. Each one hands back the phase's *own* arrays, never copies, so a
// simulated result lands on the phase and stays reactive.

export function phaseScoring(phase: TournamentPhase): ScoringHost {
  const cfg = phase.config
  const scoring =
    cfg.kind === "group"
      ? cfg.group
      : cfg.kind === "league"
        ? cfg.league
        : cfg.kind === "swiss"
          ? cfg.swiss
          : undefined
  if (!scoring) return {}
  return {
    tiebreaker: scoring.tiebreaker,
    winPoints: scoring.winPoints,
    drawPoints: scoring.drawPoints,
    lossPoints: scoring.lossPoints,
  }
}

export function groupHostOf(phase: TournamentPhase): GroupHost {
  return { ...phaseScoring(phase), groups: phase.groups }
}

export function leagueHostOf(phase: TournamentPhase): LeagueHost {
  return { ...phaseScoring(phase), teamIds: phase.teamIds, league: phase.league }
}

export function knockoutHostOf(phase: TournamentPhase): KnockoutHost {
  return {
    // An unbuilt phase has no rounds yet; the empty array keeps every read
    // safe without quietly giving the phase a container it has not earned.
    rounds: phase.rounds ?? [],
    hasThirdPlace: phase.config.kind === "knockout" ? phase.config.knockout.hasThirdPlace : false,
    thirdPlaceMatch: phase.thirdPlaceMatch,
  }
}

// ─── Building a phase ────────────────────────────────────────────

/**
 * The order a seeded draw places teams in, when the arriving order carries no
 * meaning of its own.
 *
 * Strongest first, then shuffled within each band of `bandSize`, which is what
 * makes a seeded group draw different every time while still spreading the
 * strong sides one per group. Without the shuffle a seeded entry phase produced
 * the identical groups every single season.
 */
function seededBands(ids: string[], teams: Team[], bandSize: number): string[] {
  const powerOf = new Map(teams.map((t) => [t.id, resolvePower(t)]))
  const sorted = [...ids].sort((a, b) => (powerOf.get(b) ?? 0) - (powerOf.get(a) ?? 0))
  const out: string[] = []
  for (let i = 0; i < sorted.length; i += bandSize) {
    out.push(...shuffle(sorted.slice(i, i + bandSize)))
  }
  return out
}

function buildGroupPhase(
  phase: TournamentPhase,
  ids: string[],
  teams: Team[],
  orderedIds?: string[],
  ranked = true
) {
  if (phase.config.kind !== "group") return
  const cfg = phase.config.group
  const groupCount = Math.max(1, Math.min(cfg.groupCount, Math.floor(ids.length / 2) || 1))
  // A drawn order wins outright — it is what the user just watched come out of
  // the pots, so re-shuffling it would make the ceremony a lie.
  //
  // Failing that: "random" shuffles. "seeded" spreads the strong sides one per
  // group, and what counts as strong depends on where the teams came from — a
  // previous phase handed them over in finishing order, which *is* the seeding,
  // while the entry field's order is just the order they were picked in and has
  // to be sorted by power first.
  const toPlace = orderedIds?.length
    ? orderedIds.filter((id) => ids.includes(id))
    : cfg.seedMode === "random"
      ? shuffle([...ids])
      : ranked
        ? [...ids]
        : seededBands(ids, teams, groupCount)
  const groups: Group[] = Array.from({ length: groupCount }, (_, g) => ({
    name: `Group ${String.fromCharCode(65 + g)}`,
    teamIds: [] as string[],
    matches: [],
    standings: [],
  }))
  toPlace.forEach((id, i) => groups[i % groupCount].teamIds.push(id))
  for (const group of groups) {
    group.matches = buildGroupFixture(group.teamIds, legModeToCount(cfg.legMode))
    group.standings = zeroStandings(group.teamIds)
  }
  phase.groups = groups
  phase.league = undefined
  phase.rounds = undefined
  phase.thirdPlaceMatch = undefined
}

function buildLeaguePhase(phase: TournamentPhase, ids: string[]) {
  if (phase.config.kind !== "league") return
  const cfg = phase.config.league
  const matchdays =
    cfg.legMode === "half"
      ? buildHalfLeagueMatchdays(ids)
      : buildLeagueMatchdays(ids, legModeToCount(cfg.legMode))
  const league: League = { matchdays, standings: zeroStandings(ids), legMode: cfg.legMode }
  phase.league = league
  phase.groups = undefined
  phase.rounds = undefined
  phase.thirdPlaceMatch = undefined
}

function buildSwissPhase(phase: TournamentPhase, ids: string[], teams: Team[]) {
  if (phase.config.kind !== "swiss") return
  const cfg = phase.config.swiss
  const pool = ids.map((id) => teams.find((t) => t.id === id)).filter((t): t is Team => !!t)
  phase.league = buildSwissLeague(pool, {
    opponentCount: cfg.opponentCount,
    potCount: cfg.potCount,
    balanceHomeAway: cfg.balanceHomeAway,
    seed: cfg.seed,
    legMode: cfg.legMode,
    drawType: cfg.potCount > 1 ? "seeded" : "random",
  })
  phase.groups = undefined
  phase.rounds = undefined
  phase.thirdPlaceMatch = undefined
}

function buildKnockoutPhase(
  phase: TournamentPhase,
  ids: string[],
  teams: Team[],
  orderedIds?: string[],
  ranked = true
) {
  if (phase.config.kind !== "knockout") return
  const cfg = phase.config.knockout
  const realCount = Math.max(2, ids.length)
  const size = Math.pow(2, Math.ceil(Math.log2(realCount)))
  const matchSlotCount = size / 2
  const byeCount = size - ids.length

  // A drawn order arrives bye-front, the layout packDirectSlots expects and the
  // one every other manual draw in the app produces — so it goes in untouched.
  //
  // Otherwise: seeded → byes to the best-placed arrivals, the rest paired
  // top-half vs bottom-half so rank 1 never meets rank 2 in round one; random →
  // shuffle. The same choice seedLeaguePlayoffBracket makes, for the same reason.
  const drawn = orderedIds?.filter((id) => ids.includes(id))
  // An unranked field (the entry phase) has to be sorted by power before it can
  // be seeded, and shuffled within each band so the draw is not the same one
  // every season — the same rule the seeded group draw above follows.
  const seedBase = ranked ? ids : seededBands(ids, teams, 2)
  const idsForSlots = drawn?.length
    ? drawn
    : cfg.seedMode === "random"
      ? shuffle([...ids])
      : [...seedBase.slice(0, byeCount), ...seedPairOrder(seedBase.slice(byeCount))]

  const rounds = buildBracketRounds(packDirectSlots(idsForSlots, byeCount, matchSlotCount, teams))
  applyLegModes(rounds, {
    knockoutLegMode: cfg.knockoutLegMode,
    roundLegModes: cfg.roundLegModes,
    finalLegMode: cfg.finalLegMode,
  })
  propagateWinners(rounds, teams)
  phase.rounds = rounds
  phase.groups = undefined
  phase.league = undefined

  if (cfg.hasThirdPlace && rounds.length >= 2) {
    const match: Match = { id: uid(), homeId: null, awayId: null, result: null }
    applyThirdPlaceLegMode(match, { thirdPlaceLegMode: cfg.thirdPlaceLegMode })
    phase.thirdPlaceMatch = match
    updateThirdPlaceSlotsIn(knockoutHostOf(phase))
  } else {
    phase.thirdPlaceMatch = undefined
  }
}

/**
 * Fills a phase's fixture from the teams that reached it. Mutates the phase in
 * place — the container arrays it writes are the ones every helper and the UI
 * then read.
 */
export function buildPhase(
  phase: TournamentPhase,
  ids: string[],
  teams: Team[],
  /** The order a draw ceremony produced, when one was run. */
  orderedIds?: string[],
  /**
   * Whether `ids` arrive in a meaningful order. True when a previous phase
   * handed them over in finishing order — that is the seeding, and re-sorting it
   * would throw away what the teams earned. False for the entry phase, whose
   * order is only the order the user ticked the boxes in.
   */
  ranked = true
) {
  phase.teamIds = [...ids]
  if (phase.kind === "group") buildGroupPhase(phase, ids, teams, orderedIds, ranked)
  else if (phase.kind === "league") buildLeaguePhase(phase, ids)
  else if (phase.kind === "swiss") buildSwissPhase(phase, ids, teams)
  else buildKnockoutPhase(phase, ids, teams, orderedIds, ranked)
  phase.status = "active"
}

/**
 * An ordering that rebuilds the entry phase exactly as it stands — the answer
 * to "use last season's draw".
 *
 * Group phases deal round-robin (position i goes to group i % groupCount), so
 * reading the groups column by column is what reproduces them. A knockout's
 * bye placement is not reversible this way, so its teams come back in plain
 * order and the draw is made afresh; that is the honest outcome rather than a
 * subtly different bracket presented as the old one.
 */
export function entryPhaseDrawOrder(t: Tournament): string[] {
  const entry = entryPhases(t.phases ?? [], t.phaseEdges ?? [])[0]
  if (!entry?.groups?.length) return [...t.teamIds]
  const groups = entry.groups
  const depth = groups.reduce((max, g) => Math.max(max, g.teamIds.length), 0)
  const out: string[] = []
  for (let pos = 0; pos < depth; pos++) {
    for (const group of groups) {
      const id = group.teamIds[pos]
      if (id) out.push(id)
    }
  }
  return out
}

/**
 * Clears a phase's results while keeping the fixture it was drawn into.
 *
 * What "reset results" means everywhere else in the app: the draw stands, the
 * scores go. Rebuilding the phase instead would hand the user a different group
 * stage than the one they were looking at.
 */
export function clearPhaseResults(phase: TournamentPhase) {
  for (const group of phase.groups ?? []) {
    for (const match of group.matches) match.result = null
  }
  for (const md of phase.league?.matchdays ?? []) {
    for (const match of md.matches) match.result = null
  }
  // A knockout's later rounds are filled in by propagation, so clearing a result
  // is not enough — the teams that got there have to go too, except in round one
  // where they were drawn rather than earned.
  phase.rounds?.forEach((round, ri) => {
    for (const match of round.matches) {
      match.result = null
      if (match.leg2Result !== undefined) match.leg2Result = null
      if (ri > 0) {
        match.homeId = null
        match.awayId = null
      }
    }
  })
  if (phase.thirdPlaceMatch) {
    phase.thirdPlaceMatch.homeId = null
    phase.thirdPlaceMatch.awayId = null
    phase.thirdPlaceMatch.result = null
    if (phase.thirdPlaceMatch.leg2Result !== undefined) phase.thirdPlaceMatch.leg2Result = null
  }
  // Byes are not results the user entered, so they come straight back.
  phase.rounds?.[0]?.matches.forEach((match) => {
    if (match.homeId && !match.awayId) match.result = { home: 1, away: 0 }
    if (!match.homeId && match.awayId) match.result = { home: 0, away: 1 }
  })
  recalcPhase(phase)
  phase.status = "active"
}

/** Empties a phase back to waiting for its sources. */
export function resetPhase(phase: TournamentPhase) {
  phase.teamIds = []
  phase.groups = undefined
  phase.league = undefined
  phase.rounds = undefined
  phase.thirdPlaceMatch = undefined
  phase.status = "pending"
}

// ─── Standings and completion ────────────────────────────────────

/** Brings a phase's table(s) up to date with its results. */
export function recalcPhase(phase: TournamentPhase) {
  const scoring = phaseScoring(phase)
  const args = [
    scoring.tiebreaker,
    scoring.winPoints ?? 3,
    scoring.drawPoints ?? 1,
    scoring.lossPoints ?? 0,
  ] as const
  if (phase.groups) for (const group of phase.groups) recalcStandings(group, ...args)
  if (phase.league) recalcLeagueStandings(phase.league, ...args)
}

/**
 * A group phase's field ranked as one list: every group winner first (best of
 * them leading), then every runner-up, and so on. This is what an outgoing
 * edge's rank range indexes into, and it is the same pts → gd → gf comparison
 * selectWildcards uses to pick between teams who finished level.
 */
function groupPhaseOrder(groups: Group[]): string[] {
  const depth = groups.reduce((max, g) => Math.max(max, g.standings.length), 0)
  const out: string[] = []
  for (let pos = 0; pos < depth; pos++) {
    const atPos = groups
      .map((g) => g.standings[pos])
      .filter((s): s is GroupStanding => !!s)
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    for (const s of atPos) out.push(s.teamId)
  }
  return out
}

/**
 * A knockout's field ranked by how far each side got: the winner, the beaten
 * finalist, then the losers of each earlier round in bracket order. A team
 * knocked out earlier never outranks one knocked out later.
 */
function knockoutPhaseOrder(rounds: Round[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (id: string | null) => {
    if (id && !seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  const final = rounds[rounds.length - 1]?.matches[0]
  if (final) {
    const winner = getWinnerId(final)
    push(winner)
    push(getLoserId(final))
  }
  for (let r = rounds.length - 2; r >= 0; r--) {
    for (const match of rounds[r].matches) push(getLoserId(match))
  }
  return out
}

/** A phase's field in finishing order, best first. */
export function phaseStandingIds(phase: TournamentPhase): string[] {
  if (phase.groups) return groupPhaseOrder(phase.groups)
  if (phase.league) return phase.league.standings.map((s) => s.teamId)
  if (phase.rounds) return knockoutPhaseOrder(phase.rounds)
  return []
}

export function isPhaseComplete(phase: TournamentPhase): boolean {
  if (phase.status === "pending") return false
  if (phase.groups) return phase.groups.every((g) => g.matches.every((m) => m.result !== null))
  if (phase.league) return allLeagueDone({ teamIds: phase.teamIds, league: phase.league })
  if (phase.rounds) return knockoutComplete(knockoutHostOf(phase))
  return false
}

/**
 * Who advances out of a group phase: the top `qualifiersPerGroup` of every
 * group, then the best `wildcardCount` of the teams finishing one place below
 * them — the same rule, and the same comparison, the fixed group format uses.
 *
 * Ordered so the automatic qualifiers come before the wildcards, group winners
 * before runners-up: that is the order the next phase seeds from.
 */
export function groupQualifierIds(phase: TournamentPhase): string[] {
  if (phase.config.kind !== "group" || !phase.groups) return []
  const groups = phase.groups
  const smallestGroup = groups.reduce(
    (min, g) => Math.min(min, g.standings.length),
    Number.POSITIVE_INFINITY
  )
  const cfg = phase.config.group
  const perGroup = Math.max(1, Math.min(cfg.qualifiersPerGroup, smallestGroup))

  const out: string[] = []
  for (let pos = 0; pos < perGroup; pos++) {
    const atPos = groups
      .map((g) => g.standings[pos])
      .filter((s): s is GroupStanding => !!s)
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    for (const s of atPos) out.push(s.teamId)
  }

  const wildcards = perGroup < smallestGroup ? Math.min(cfg.wildcardCount, groups.length) : 0
  if (wildcards > 0) {
    // selectWildcards wants Team objects only to hand them back; the standings
    // rows already carry everything the comparison needs, so the stand-ins are
    // enough and this stays free of the team list.
    const stubs = groups.flatMap((g) => g.standings.map((s) => ({ id: s.teamId }) as Team))
    for (const pick of selectWildcards(groups, perGroup, wildcards, stubs)) {
      if (!out.includes(pick.team.id)) out.push(pick.team.id)
    }
  }
  return out
}

/**
 * The teams an edge carries onward.
 *
 * A group phase hands over its qualifiers, decided by its own config; every
 * other kind hands over the named slice of its table.
 */
export function resolvePhaseQualifiers(phase: TournamentPhase, edge: PhaseEdge): string[] {
  if (phase.kind === "group") return groupQualifierIds(phase)
  return phaseStandingIds(phase).slice(Math.max(0, edge.fromRank - 1), edge.toRank)
}

// ─── Progressing the graph ───────────────────────────────────────

/** True when every source of `phaseId` has finished and it has not started. */
export function canAdvanceTo(t: Tournament, phaseId: string): boolean {
  const phases = t.phases ?? []
  const edges = t.phaseEdges ?? []
  const phase = phases.find((p) => p.id === phaseId)
  if (!phase || phase.status !== "pending") return false
  const incoming = incomingEdges(edges, phaseId)
  if (!incoming.length) return false
  return incoming.every((e) => {
    const src = phases.find((p) => p.id === e.fromPhaseId)
    return !!src && isPhaseComplete(src)
  })
}

/**
 * Where a phase's teams go next, in finishing order.
 *
 * The standings table draws these as colour bands so a table that splits two
 * ways shows which places go where, rather than only which places are good.
 */
export function phaseDestinations(
  t: Tournament,
  phaseId: string
): { edge: PhaseEdge; target: TournamentPhase; fromRank: number; toRank: number }[] {
  const phases = t.phases ?? []
  const phase = phases.find((p) => p.id === phaseId)
  if (!phase) return []
  const intake = phase.teamIds.length
  return outgoingEdges(t.phaseEdges ?? [], phaseId)
    .flatMap((edge) => {
      const target = phases.find((p) => p.id === edge.toPhaseId)
      if (!target) return []
      // A group phase has no range of its own: its qualifiers are the top
      // places of the combined ranking, so the band covers exactly them.
      const fromRank = phase.kind === "group" ? 1 : edge.fromRank
      const toRank = phase.kind === "group" ? groupOutputCount(phase, intake) : edge.toRank
      // A phase that has not been seeded yet has no field to measure, which
      // would give a group source an empty band rather than a wrong one.
      if (toRank < fromRank) return []
      return [{ edge, target, fromRank, toRank }]
    })
    .sort((a, b) => a.fromRank - b.fromRank)
}

/**
 * Every phase that is ready to be started right now. The detail header turns
 * these into its Advance button, one per phase, so a graph that branches two
 * ways offers both.
 */
export function advancablePhases(t: Tournament): TournamentPhase[] {
  return (t.phases ?? []).filter((p) => canAdvanceTo(t, p.id))
}

/**
 * Starts a phase from whatever its sources produced. Sources are read in the
 * author's own edge order, so a knockout fed 1-2 from a group and 1-2 from a
 * league seeds them in that order rather than some internal one.
 */
/**
 * The teams waiting to enter a phase, in the order its sources produced them.
 *
 * Needed before the phase is seeded as well as during it: the draw ceremony has
 * to know who is in the pots, and that is this list.
 */
export function incomingQualifierIds(t: Tournament, phaseId: string): string[] {
  const ids: string[] = []
  for (const edge of incomingEdges(t.phaseEdges ?? [], phaseId)) {
    const src = findPhase(t, edge.fromPhaseId)
    if (!src) continue
    for (const id of resolvePhaseQualifiers(src, edge)) {
      if (!ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

export function seedPhaseFrom(
  t: Tournament,
  phaseId: string,
  teams: Team[],
  orderedIds?: string[]
): boolean {
  if (!canAdvanceTo(t, phaseId)) return false
  const phase = findPhase(t, phaseId)
  if (!phase) return false
  const edges = incomingEdges(t.phaseEdges ?? [], phaseId)
  const ids = incomingQualifierIds(t, phaseId)
  if (!ids.length) return false
  buildPhase(phase, ids, teams, orderedIds)
  for (const edge of edges) {
    const src = findPhase(t, edge.fromPhaseId)
    if (src && isPhaseComplete(src)) src.status = "done"
  }
  return true
}

/** Marks finished phases done — called after any result is written. */
export function refreshPhaseStatuses(t: Tournament) {
  for (const phase of t.phases ?? []) {
    if (phase.status === "active" && isPhaseComplete(phase)) phase.status = "done"
    else if (phase.status === "done" && !isPhaseComplete(phase)) phase.status = "active"
  }
}

/** The phase the user marked as deciding the tournament. */
export function finalPhase(t: Tournament): TournamentPhase | undefined {
  return (t.phases ?? []).find((p) => p.isFinal)
}

/**
 * The tournament's winner: the top of the marked final phase's own standing,
 * once that phase is finished. Null before then.
 */
export function customWinnerId(t: Tournament): string | null {
  const phase = finalPhase(t)
  if (!phase || !isPhaseComplete(phase)) return null
  return phaseStandingIds(phase)[0] ?? null
}

/** Every phase has finished and the final one has crowned someone. */
export function isCustomFinished(t: Tournament): boolean {
  const phases = t.phases ?? []
  if (!phases.length) return false
  const phase = finalPhase(t)
  if (!phase || !isPhaseComplete(phase)) return false
  return !!t.winnerId
}

/** Which phase a match belongs to, by match id. */
export function phaseOfMatch(t: Tournament, matchId: string): TournamentPhase | undefined {
  for (const phase of t.phases ?? []) {
    const inGroups = phase.groups?.some((g) => g.matches.some((m) => m.id === matchId))
    if (inGroups) return phase
    const inLeague = phase.league?.matchdays.some((md) => md.matches.some((m) => m.id === matchId))
    if (inLeague) return phase
    const inRounds = phase.rounds?.some((r) => r.matches.some((m) => m.id === matchId))
    if (inRounds) return phase
    if (phase.thirdPlaceMatch?.id === matchId) return phase
  }
  return undefined
}
