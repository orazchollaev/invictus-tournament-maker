// engine/events/packStats.ts
//
// A played match carries a full report — ~30 player lines, ~20 events, subs and
// team numbers. As objects that is ~6 KB of JSON and far more live heap per
// match, so a 60-team league (3 540 matches) came to ~19 MB on disk and in
// memory, which starved the Android WebView (white boxes, renderer crashes).
//
// The report is therefore *stored* packed: one short string of numbers, with
// every player id listed once per match and referenced by index, every enum as
// a small integer, and absent optional fields as -1. It is lossless —
// `unpackStats(packStats(x))` deep-equals `x` — and ~85% smaller. Strings are
// also cheap for the engine and the JS heap to hold: one flat allocation
// instead of ~100 objects.
//
// Nothing reads the packed form directly. `statsOf(result)` decodes on demand
// (with a small cache, since a screen asks for the same match repeatedly) and
// accepts the old unpacked object too, so records written before this format
// keep working until the next save re-packs them.
import { PLAYER_POSITIONS, type PlayerPosition } from "@/modules/players/types"
import type {
  MatchEvent,
  MatchEventType,
  MatchResult,
  MatchStats,
  PlayerMatchLine,
  ShootoutKick,
  Substitution,
  TeamMatchStats,
} from "@/modules/tournament/types"

/** The stored form. A string, so it is opaque to type-checking readers by design. */
export type PackedStats = string

const FORMAT_VERSION = 1

const EVENT_TYPES: MatchEventType[] = [
  "goal",
  "ownGoal",
  "penGoal",
  "penMiss",
  "yellow",
  "red",
  "sub",
]
const POSITIONS: PlayerPosition[] = PLAYER_POSITIONS
const REASONS = [undefined, "tactical", "injury"] as const

const ABSENT = -1
/** An `assistId` that is `undefined` (absent), as against `null` (explicitly nobody). */
const UNDEFINED_ID = -2

type Row = number[]

/**
 * Drops trailing "absent" cells. The rare optional fields are ordered last in
 * every row, so most rows end early; a reader treats a missing cell as absent.
 */
function trim(row: Row, absent: number = ABSENT): Row {
  let end = row.length
  while (end > 0 && row[end - 1] === absent) end--
  row.length = end
  return row
}
const cell = (r: Row, i: number, absent: number = ABSENT): number => r[i] ?? absent

function indexOrThrow<T>(list: readonly T[], value: T): number {
  const i = list.indexOf(value)
  if (i < 0) throw new Error(`packStats: unknown value ${String(value)}`)
  return i
}

class IdTable {
  private readonly index = new Map<string, number>()
  readonly ids: string[] = []

  /** `null` → -1, `undefined` → -2, otherwise the id's slot in the table. */
  ref(id: string | null | undefined): number {
    if (id === undefined) return UNDEFINED_ID
    if (id === null) return ABSENT
    let i = this.index.get(id)
    if (i === undefined) {
      i = this.ids.length
      this.ids.push(id)
      this.index.set(id, i)
    }
    return i
  }
}

const sideToNum = (side: "home" | "away") => (side === "home" ? 0 : 1)
const numToSide = (n: number): "home" | "away" => (n === 0 ? "home" : "away")
const optNum = (n: number | undefined) => (n === undefined ? ABSENT : n)
const optBool = (b: boolean | undefined) => (b === undefined ? ABSENT : b ? 1 : 0)

export function packStats(stats: MatchStats): PackedStats {
  const table = new IdTable()

  const lines: Row[] = stats.lines.map((l) =>
    trim([
      table.ref(l.playerId),
      sideToNum(l.side),
      indexOrThrow(POSITIONS, l.position),
      l.goals,
      l.assists,
      l.yellow,
      l.red,
      l.rating,
      optBool(l.cleanSheet),
      optNum(l.minutesPlayed),
      optNum(l.saves),
      optNum(l.conceded),
    ])
  )

  const events: Row[] = stats.events.map((e) =>
    trim(
      [
        e.minute,
        indexOrThrow(EVENT_TYPES, e.type),
        sideToNum(e.side),
        table.ref(e.playerId),
        table.ref(e.assistId),
      ],
      UNDEFINED_ID
    )
  )

  const t = stats.team
  const team: number[] = [
    t.possession,
    ...t.shots,
    ...t.onTarget,
    ...t.corners,
    ...t.fouls,
    ...t.xg,
    ...t.bigChances,
    ...t.offsides,
  ]

  const subs: Row[] | 0 = stats.substitutions
    ? stats.substitutions.map((s) =>
        trim([
          s.minute,
          sideToNum(s.side),
          table.ref(s.outPlayerId),
          table.ref(s.inPlayerId),
          indexOrThrow(POSITIONS, s.position),
          indexOrThrow(REASONS, s.reason),
          optNum(s.injuryMatches),
        ])
      )
    : 0

  const shootout: Row[] | 0 = stats.shootout
    ? stats.shootout.map((k) => [
        k.order,
        sideToNum(k.side),
        table.ref(k.playerId),
        k.scored ? 1 : 0,
      ])
    : 0

  return JSON.stringify([FORMAT_VERSION, table.ids, lines, events, team, subs, shootout])
}

export function unpackStats(packed: PackedStats): MatchStats {
  const [version, ids, lines, events, team, subs, shootout] = JSON.parse(packed) as [
    number,
    string[],
    Row[],
    Row[],
    number[],
    Row[] | 0,
    Row[] | 0,
  ]
  if (version !== FORMAT_VERSION) throw new Error(`packStats: unsupported version ${version}`)

  const id = (n: number): string | null => (n < 0 ? null : ids[n])
  const optId = (n: number): string | null | undefined => (n === UNDEFINED_ID ? undefined : id(n))

  const outLines: PlayerMatchLine[] = lines.map((r) => {
    const line: PlayerMatchLine = {
      playerId: id(r[0]),
      side: numToSide(r[1]),
      position: POSITIONS[r[2]],
      goals: r[3],
      assists: r[4],
      yellow: r[5],
      red: r[6],
      rating: r[7],
    }
    if (cell(r, 8) !== ABSENT) line.cleanSheet = r[8] === 1
    if (cell(r, 9) !== ABSENT) line.minutesPlayed = r[9]
    if (cell(r, 10) !== ABSENT) line.saves = r[10]
    if (cell(r, 11) !== ABSENT) line.conceded = r[11]
    return line
  })

  const outEvents: MatchEvent[] = events.map((r) => {
    const e: MatchEvent = {
      minute: r[0],
      type: EVENT_TYPES[r[1]],
      side: numToSide(r[2]),
      playerId: id(r[3]),
    }
    const assist = optId(cell(r, 4, UNDEFINED_ID))
    if (assist !== undefined) e.assistId = assist
    return e
  })

  const outTeam: TeamMatchStats = {
    possession: team[0],
    shots: [team[1], team[2]],
    onTarget: [team[3], team[4]],
    corners: [team[5], team[6]],
    fouls: [team[7], team[8]],
    xg: [team[9], team[10]],
    bigChances: [team[11], team[12]],
    offsides: [team[13], team[14]],
  }

  const out: MatchStats = { events: outEvents, lines: outLines, team: outTeam }

  if (subs !== 0) {
    out.substitutions = subs.map((r) => {
      const s: Substitution = {
        minute: r[0],
        side: numToSide(r[1]),
        outPlayerId: id(r[2]),
        inPlayerId: id(r[3]),
        position: POSITIONS[r[4]],
      }
      const reason = REASONS[cell(r, 5, 0)]
      if (reason !== undefined) s.reason = reason
      if (cell(r, 6) !== ABSENT) s.injuryMatches = r[6]
      return s
    })
  }

  if (shootout !== 0) {
    out.shootout = shootout.map((r): ShootoutKick => ({
      order: r[0],
      side: numToSide(r[1]),
      playerId: id(r[2]),
      scored: r[3] === 1,
    }))
  }

  return out
}

// ─── Reading ─────────────────────────────────────────────────────

/**
 * Decoded reports by packed string. A match modal, a fixture row and the
 * player tables all ask for the same match within a frame of each other; a
 * bulk pass (career totals, fatigue) walks thousands once. A bounded cache
 * keeps the first from re-parsing without letting the second pin everything
 * back in memory — which would undo the point of packing.
 */
const CACHE_LIMIT = 256
const cache = new Map<string, MatchStats>()

function decodeCached(packed: PackedStats): MatchStats {
  const hit = cache.get(packed)
  if (hit) {
    // Refresh recency: delete + set moves the key to the end.
    cache.delete(packed)
    cache.set(packed, hit)
    return hit
  }
  const stats = unpackStats(packed)
  cache.set(packed, stats)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
  return stats
}

/**
 * The report for a result, or null when it has none (not generated yet,
 * played before reports existed, or unreadable).
 *
 * Accepts a report that is still an unpacked object — data saved by an older
 * build, or set directly by a caller — so nothing breaks while it migrates.
 * The returned object is shared by the cache and must be treated as read-only.
 */
export function statsOf(result: Pick<MatchResult, "stats"> | null | undefined): MatchStats | null {
  const stored = result?.stats
  if (stored === undefined || stored === null) return null
  if (typeof stored !== "string") return stored
  try {
    return decodeCached(stored)
  } catch {
    return null
  }
}

/** Pack a report for storage on a result. `null`/`undefined` pass through untouched. */
export function packedStatsFor(
  stats: MatchStats | null | undefined
): PackedStats | null | undefined {
  if (stats === null || stats === undefined) return stats
  return packStats(stats)
}

/** Drop the decode cache. For tests. */
export function clearStatsCache(): void {
  cache.clear()
}
