// modules/tournament/services/tournamentSchema.ts
//
// What comes back out of IndexedDB is not a Tournament. It is whatever some
// earlier build of the app wrote, possibly half-written, possibly hand-edited,
// possibly truncated by a browser that ran out of quota mid-write. The type
// says Tournament because a cast said so.
//
// Every crash-on-launch this app has had came from that gap: one record with a
// missing `rounds` array, or an index that no longer parses, and the whole
// hydrate rejected — a blank screen with the data still sitting on disk. So
// nothing reaches the store without coming through here first.
//
// Two rules:
//   - Repair what can be repaired. A missing optional container is just an
//     absent container; a missing `rounds` is an empty one.
//   - Drop what cannot. One unreadable tournament is a recoverable loss; a
//     tournament that renders as undefined halfway down a template is not.
import type {
  Group,
  GroupMatch,
  GroupStanding,
  League,
  LeagueMatchday,
  LeagueTier,
  ManagerLineupSlot,
  ManagerState,
  Match,
  MatchResult,
  PhaseConfig,
  PhaseEdge,
  PhaseKind,
  PhaseStatus,
  Round,
  Tournament,
  TournamentFormat,
  TournamentPhase,
} from "../types"
import type { Formation, PlayStyle } from "@/modules/teams/types"
import type { PlayerPosition } from "@/modules/players/types"
import { PLAYER_POSITIONS } from "@/modules/players/types"
import { DEFAULT_FORMATION, DEFAULT_STYLE, FORMATION_LIST, PLAY_STYLES } from "@/engine"
import { reconcileLineupSlots } from "../utils/managerLineup"

const FORMATS: TournamentFormat[] = ["bracket", "group+bracket", "league", "swiss", "custom"]
const PHASE_KINDS: PhaseKind[] = ["group", "league", "swiss", "knockout"]
const PHASE_STATUSES: PhaseStatus[] = ["pending", "active", "done"]

type Raw = Record<string, unknown>

function isObject(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringArray(value: unknown): string[] {
  return arr(value).filter((v): v is string => typeof v === "string")
}

function numberRecord(value: unknown): Record<string, number> | undefined {
  if (!isObject(value)) return undefined
  const out: Record<string, number> = {}
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * A result is either absent, explicitly unplayed (null), or a pair of scores.
 * Anything else — a string score from a very old build, an object with no
 * numbers — reads as unplayed rather than as a NaN that spreads through every
 * table on the page.
 */
function normalizeResult(value: unknown): MatchResult | null {
  if (!isObject(value)) return null
  if (typeof value.home !== "number" || typeof value.away !== "number") return null
  if (!Number.isFinite(value.home) || !Number.isFinite(value.away)) return null
  // Passed through as-is beyond the score: stats, events and penalties are read
  // defensively everywhere and re-derivable, so a partial one is not fatal.
  return value as unknown as MatchResult
}

function normalizeGroupMatch(value: unknown): GroupMatch | null {
  if (!isObject(value)) return null
  const id = str(value.id)
  const homeId = str(value.homeId)
  const awayId = str(value.awayId)
  // A group match with a missing side is not a bye, it is corrupt — a group
  // fixture is always between two real teams.
  if (!id || !homeId || !awayId) return null
  return { id, homeId, awayId, result: normalizeResult(value.result) }
}

function normalizeMatch(value: unknown): Match | null {
  if (!isObject(value)) return null
  const id = str(value.id)
  if (!id) return null
  const match: Match = {
    id,
    homeId: strOrNull(value.homeId),
    awayId: strOrNull(value.awayId),
    result: normalizeResult(value.result),
  }
  // Three meanings to preserve exactly: absent = single leg, null = leg 2 not
  // played yet, object = played. Collapsing any two of them silently turns a
  // two-legged tie into a one-legged one, or the reverse.
  if ("leg2Result" in value && value.leg2Result !== undefined) {
    match.leg2Result = normalizeResult(value.leg2Result)
  }
  return match
}

function normalizeStanding(value: unknown): GroupStanding | null {
  if (!isObject(value)) return null
  const teamId = str(value.teamId)
  if (!teamId) return null
  return {
    teamId,
    played: num(value.played, 0),
    won: num(value.won, 0),
    drawn: num(value.drawn, 0),
    lost: num(value.lost, 0),
    gf: num(value.gf, 0),
    ga: num(value.ga, 0),
    gd: num(value.gd, 0),
    pts: num(value.pts, 0),
  }
}

function normalizeGroup(value: unknown, idx: number): Group | null {
  if (!isObject(value)) return null
  const teamIds = stringArray(value.teamIds)
  if (!teamIds.length) return null
  return {
    name: str(value.name) ?? `Group ${String.fromCharCode(65 + idx)}`,
    teamIds,
    matches: arr(value.matches)
      .map(normalizeGroupMatch)
      .filter((m): m is GroupMatch => m !== null),
    standings: arr(value.standings)
      .map(normalizeStanding)
      .filter((s): s is GroupStanding => s !== null),
  }
}

function normalizeGroups(value: unknown): Group[] | undefined {
  if (!Array.isArray(value)) return undefined
  const groups = arr(value)
    .map((g, i) => normalizeGroup(g, i))
    .filter((g): g is Group => g !== null)
  return groups.length ? groups : undefined
}

function normalizeMatchday(value: unknown, idx: number): LeagueMatchday | null {
  if (!isObject(value)) return null
  return {
    name: str(value.name) ?? `Matchday ${idx + 1}`,
    matches: arr(value.matches)
      .map(normalizeGroupMatch)
      .filter((m): m is GroupMatch => m !== null),
  }
}

function normalizeLeague(value: unknown): League | undefined {
  if (!isObject(value)) return undefined
  const matchdays = arr(value.matchdays)
    .map((md, i) => normalizeMatchday(md, i))
    .filter((md): md is LeagueMatchday => md !== null)
  return {
    matchdays,
    standings: arr(value.standings)
      .map(normalizeStanding)
      .filter((s): s is GroupStanding => s !== null),
    legMode: (str(value.legMode) ?? "single") as League["legMode"],
  }
}

function normalizeRound(value: unknown, idx: number): Round | null {
  if (!isObject(value)) return null
  const matches = arr(value.matches)
    .map(normalizeMatch)
    .filter((m): m is Match => m !== null)
  if (!matches.length) return null
  return { name: str(value.name) ?? `Round ${idx + 1}`, matches }
}

function normalizeRounds(value: unknown): Round[] {
  return arr(value)
    .map((r, i) => normalizeRound(r, i))
    .filter((r): r is Round => r !== null)
}

function normalizeTier(value: unknown, idx: number): LeagueTier | null {
  if (!isObject(value)) return null
  const league = normalizeLeague(value.league)
  if (!league) return null
  return {
    name: str(value.name) ?? `Division ${idx + 1}`,
    teamIds: stringArray(value.teamIds),
    league,
    playoff: isObject(value.playoff) ? (value.playoff as unknown as LeagueTier["playoff"]) : undefined,
  }
}

/**
 * A phase config has to match its phase's kind, because every reader
 * discriminates on it. A mismatch is unrepairable — we cannot invent a group
 * config for a knockout — so the phase goes.
 */
function normalizePhaseConfig(value: unknown, kind: PhaseKind): PhaseConfig | null {
  if (!isObject(value)) return null
  if (value.kind !== kind) return null
  const inner = value[kind]
  if (!isObject(inner)) return null

  // A group phase's counts decide who advances, so a record written before
  // those fields existed — or with one of them broken — has to come back with
  // numbers rather than with undefined arithmetic waiting to happen.
  if (kind === "group") {
    return {
      kind: "group",
      group: {
        ...inner,
        groupCount: Math.max(1, Math.round(num(inner.groupCount, 2))),
        qualifiersPerGroup: Math.max(1, Math.round(num(inner.qualifiersPerGroup, 2))),
        wildcardCount: Math.max(0, Math.round(num(inner.wildcardCount, 0))),
      },
    } as unknown as PhaseConfig
  }

  return value as unknown as PhaseConfig
}

function normalizePhase(value: unknown): TournamentPhase | null {
  if (!isObject(value)) return null
  const id = str(value.id)
  const kindRaw = str(value.kind) as PhaseKind | undefined
  if (!id || !kindRaw || !PHASE_KINDS.includes(kindRaw)) return null
  const config = normalizePhaseConfig(value.config, kindRaw)
  if (!config) return null

  const statusRaw = str(value.status) as PhaseStatus | undefined
  const pos = isObject(value.pos)
    ? { x: num(value.pos.x, 0), y: num(value.pos.y, 0) }
    : { x: 0, y: 0 }

  const phase: TournamentPhase = {
    id,
    name: str(value.name) ?? id,
    kind: kindRaw,
    isFinal: value.isFinal === true,
    pos,
    config,
    teamIds: stringArray(value.teamIds),
    status: statusRaw && PHASE_STATUSES.includes(statusRaw) ? statusRaw : "pending",
  }

  const groups = normalizeGroups(value.groups)
  if (groups) phase.groups = groups
  const league = value.league === undefined ? undefined : normalizeLeague(value.league)
  if (league) phase.league = league
  if (Array.isArray(value.rounds)) {
    const rounds = normalizeRounds(value.rounds)
    if (rounds.length) phase.rounds = rounds
  }
  const thirdPlace = normalizeMatch(value.thirdPlaceMatch)
  if (thirdPlace) phase.thirdPlaceMatch = thirdPlace

  // A phase claiming to be underway with nothing to play is worse than one
  // that is simply still pending: the detail page would show an empty panel
  // with no way forward. Put it back to pending so advancing rebuilds it.
  const hasFixture = !!phase.groups || !!phase.league || !!phase.rounds
  if (!hasFixture && phase.status !== "pending") phase.status = "pending"

  return phase
}

function normalizeEdge(value: unknown): PhaseEdge | null {
  if (!isObject(value)) return null
  const id = str(value.id)
  const fromPhaseId = str(value.fromPhaseId)
  const toPhaseId = str(value.toPhaseId)
  if (!id || !fromPhaseId || !toPhaseId) return null
  const fromRank = Math.max(1, Math.round(num(value.fromRank, 1)))
  const toRank = Math.max(fromRank, Math.round(num(value.toRank, fromRank)))
  return { id, fromPhaseId, toPhaseId, fromRank, toRank }
}

/**
 * The phase graph, with every edge that no longer has both ends dropped.
 *
 * A dangling edge is the one corruption that would otherwise survive every
 * other check and then crash on advance, because `seedPhaseFrom` reads the
 * source phase it names.
 */
function normalizePhaseGraph(raw: Raw): {
  phases?: TournamentPhase[]
  phaseEdges?: PhaseEdge[]
} {
  if (raw.phases === undefined && raw.phaseEdges === undefined) return {}
  const phases = arr(raw.phases)
    .map(normalizePhase)
    .filter((p): p is TournamentPhase => p !== null)
  if (!phases.length) return { phases: [], phaseEdges: [] }

  const ids = new Set(phases.map((p) => p.id))
  const seenEdges = new Set<string>()
  const phaseEdges = arr(raw.phaseEdges)
    .map(normalizeEdge)
    .filter((e): e is PhaseEdge => e !== null)
    .filter((e) => ids.has(e.fromPhaseId) && ids.has(e.toPhaseId) && e.fromPhaseId !== e.toPhaseId)
    .filter((e) => {
      if (seenEdges.has(e.id)) return false
      seenEdges.add(e.id)
      return true
    })

  return { phases, phaseEdges }
}

/**
 * The managed side, or undefined when there isn't a usable one.
 *
 * Two things have to be true for the rest of the app, and neither was checked
 * while this rode the passthrough list. A `teamId` outside `teamIds` makes
 * every "is this my match?" check silently false and locks bulk simulation out
 * of nothing. A `formation` outside `FORMATIONS` is worse: `FORMATIONS[value]`
 * is then `undefined` and the first read of a slot count throws, which is a
 * blank manager tab rather than a degraded one. Both are unrepairable as
 * written and both have an obvious floor — drop the manager for the first,
 * fall back to the default shape for the second.
 *
 * The lineup is reshaped onto whatever formation survives, so its length
 * always matches the formation's slot count, which is the invariant every
 * pitch renderer indexes against.
 */
function normalizeManager(value: unknown, teamIds: string[]): ManagerState | undefined {
  if (!isObject(value)) return undefined
  const teamId = str(value.teamId)
  if (!teamId || !teamIds.includes(teamId)) return undefined

  const formationRaw = str(value.formation) as Formation | undefined
  const formation =
    formationRaw && FORMATION_LIST.includes(formationRaw) ? formationRaw : DEFAULT_FORMATION

  const styleRaw = str(value.style) as PlayStyle | undefined
  const style = styleRaw && PLAY_STYLES.includes(styleRaw) ? styleRaw : DEFAULT_STYLE

  const slots = arr(value.lineup)
    .map((slot): ManagerLineupSlot | null => {
      if (!isObject(slot)) return null
      const position = str(slot.position) as PlayerPosition | undefined
      if (!position || !PLAYER_POSITIONS.includes(position)) return null
      return { position, playerId: strOrNull(slot.playerId) }
    })
    .filter((slot): slot is ManagerLineupSlot => slot !== null)

  return {
    teamId,
    formation,
    style,
    startedAt: num(value.startedAt, Date.now()),
    lineup: reconcileLineupSlots(slots, formation),
  }
}

/**
 * Turns one stored record into a Tournament, or null when it cannot be one.
 *
 * Null is returned only for the identity fields — without an id the record
 * cannot be addressed, saved or deleted, and without a known format nothing
 * downstream knows how to draw it. Everything else is repaired.
 */
export function normalizeTournament(raw: unknown): Tournament | null {
  if (!isObject(raw)) return null
  const id = str(raw.id)
  if (!id) return null
  const format = str(raw.format) as TournamentFormat | undefined
  if (!format || !FORMATS.includes(format)) return null

  const tournament: Tournament = {
    id,
    name: str(raw.name) ?? "",
    season: Math.max(1, Math.round(num(raw.season, 1))),
    format,
    teamIds: stringArray(raw.teamIds),
    rounds: normalizeRounds(raw.rounds),
    winnerId: strOrNull(raw.winnerId),
    createdAt: num(raw.createdAt, Date.now()),
  }

  const groups = normalizeGroups(raw.groups)
  if (groups) tournament.groups = groups
  if (raw.groupsDone !== undefined) tournament.groupsDone = raw.groupsDone === true
  if (raw.qualifiersPerGroup !== undefined) {
    tournament.qualifiersPerGroup = Math.max(1, Math.round(num(raw.qualifiersPerGroup, 2)))
  }
  if (raw.wildcardCount !== undefined) {
    tournament.wildcardCount = Math.max(0, Math.round(num(raw.wildcardCount, 0)))
  }

  if (raw.league !== undefined) {
    const league = normalizeLeague(raw.league)
    if (league) tournament.league = league
  }
  if (Array.isArray(raw.tiers)) {
    const tiers = raw.tiers
      .map((tier, i) => normalizeTier(tier, i))
      .filter((tier): tier is LeagueTier => tier !== null)
    if (tiers.length) tournament.tiers = tiers
  }

  const thirdPlace = normalizeMatch(raw.thirdPlaceMatch)
  if (thirdPlace) tournament.thirdPlaceMatch = thirdPlace
  // Only ever true alongside a real tie — the bracket panel reads the flag to
  // decide whether to render the match at all.
  tournament.hasThirdPlace = raw.hasThirdPlace === true && !!thirdPlace

  const graph = normalizePhaseGraph(raw)
  if (graph.phases) tournament.phases = graph.phases
  if (graph.phaseEdges) tournament.phaseEdges = graph.phaseEdges

  // Passed through untouched: presentation and configuration fields that are
  // already read with a default at every use site, so a wrong one degrades to
  // that default instead of throwing.
  const passthrough = [
    "playoffSeedMode",
    "drawType",
    "groupLegMode",
    "knockoutLegMode",
    "finalLegMode",
    "roundLegModes",
    "thirdPlaceLegMode",
    "tiebreaker",
    "leaguePlayoff",
    "swiss",
    "promotionCount",
    "winPoints",
    "drawPoints",
    "lossPoints",
  ] as const
  for (const key of passthrough) {
    if (raw[key] !== undefined) (tournament as unknown as Record<string, unknown>)[key] = raw[key]
  }

  const pointAdj = numberRecord(raw.teamPointAdjustments)
  if (pointAdj) tournament.teamPointAdjustments = pointAdj
  const powerAdj = numberRecord(raw.teamPowerAdjustments)
  if (powerAdj) tournament.teamPowerAdjustments = powerAdj

  const manager = normalizeManager(raw.manager, tournament.teamIds)
  if (manager) tournament.manager = manager

  return tournament
}

/** Parses and normalizes one stored JSON record. Never throws. */
export function parseStoredTournament(raw: unknown): Tournament | null {
  if (typeof raw !== "string") return normalizeTournament(raw)
  try {
    return normalizeTournament(JSON.parse(raw))
  } catch {
    return null
  }
}
