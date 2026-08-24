// engine/swiss.ts
//
// Swiss league phase (the post-2024 Champions League "league phase"):
// one shared table, but each team faces only `opponentCount` of the field,
// drawn once up front from power-ranked pots.
//
// The fixture is stored in the ordinary `League` container, so every league
// helper downstream — standings, tiebreakers, result entry, simulation,
// `leaguePlayoff` seeding, match iteration, history — works unchanged.
//
// Pairing is built analytically rather than by trial and error:
//   • within a pot   → a q-regular circulant graph
//   • between pots   → q rotated perfect matchings (bipartite q-regular)
// Both are always constructible once `validateSwissConfig` passes, so the
// draw can never fail or hang. Randomness comes from shuffling the team order
// inside each pot and from picking the rotation offsets.

import type { Team } from "../modules/teams/types"
import type {
  GroupMatch,
  GroupStanding,
  League,
  LeagueMatchday,
  LegMode,
  SwissConfig,
  Tournament,
  Tiebreaker,
  KnockoutStage,
  LeaguePlayoffSeedMode,
  DrawType,
} from "../modules/tournament/types"
import { uid, makeRng, shuffleWith, randomSeed } from "./utils"
import { resolvePower } from "./power"
import { legModeToCount } from "./tournament"
import type { Pot } from "./drawCeremony"

export const SWISS_MIN_TEAMS = 4

export type SwissPairing = [string, string]

// ─── Pots ────────────────────────────────────────────────────────

/**
 * Power-ranked pots, strongest first. `potCount <= 1` yields a single pot
 * holding everyone, which is exactly what the "random" draw type wants.
 * Sizes are as even as possible; `validateSwissConfig` is what refuses the
 * uneven case, this function never throws.
 */
export function buildSwissPots(teams: Team[], potCount: number): Pot[] {
  const count = Math.max(1, Math.floor(potCount))
  if (count <= 1) return [{ label: "Pot 1", teamIds: teams.map((t) => t.id) }]

  const sorted = [...teams].sort((a, b) => resolvePower(b) - resolvePower(a))
  const size = Math.ceil(sorted.length / count)
  const pots: Pot[] = []
  for (let i = 0; i < sorted.length; i += size) {
    pots.push({
      label: `Pot ${pots.length + 1}`,
      teamIds: sorted.slice(i, i + size).map((t) => t.id),
    })
  }
  return pots
}

// ─── Validation ──────────────────────────────────────────────────

/**
 * Returns i18n key suffixes for every problem with the requested shape;
 * an empty array means `buildSwissPairings` is guaranteed to succeed.
 *
 * The pot rules exist because a q-per-pot quota is only satisfiable when the
 * pots are the same size (team A owing q opponents to pot 2 implies pot 2 owes
 * the same back), and because a q-regular graph on S vertices needs S·q even.
 */
export function validateSwissConfig(
  teamCount: number,
  opponentCount: number,
  potCount: number
): string[] {
  const errors: string[] = []
  const pots = Math.max(1, Math.floor(potCount))

  if (teamCount < SWISS_MIN_TEAMS) errors.push("minTeams")
  if (opponentCount < 1) errors.push("minOpponents")
  if (opponentCount > teamCount - 1) errors.push("tooManyOpponents")
  if ((teamCount * opponentCount) % 2 !== 0) errors.push("oddProduct")

  if (pots > 1) {
    if (teamCount % pots !== 0) errors.push("potSizeUneven")
    if (opponentCount % pots !== 0) errors.push("potDivision")

    // Only meaningful once the divisibility rules above hold. A quota larger
    // than the pot needs no rule of its own: with equal pots it would require
    // opponentCount > teamCount - potCount, and the only multiple of potCount
    // in that range is teamCount itself, already caught by tooManyOpponents.
    if (teamCount % pots === 0 && opponentCount % pots === 0) {
      const potSize = teamCount / pots
      const quota = opponentCount / pots
      if ((potSize * quota) % 2 !== 0) errors.push("oddPotQuota")
    }
  }

  return errors
}

// ─── Pairing graphs ──────────────────────────────────────────────

/**
 * q-regular graph on one pot, built as a circulant: pick `floor(q/2)` distinct
 * step sizes and connect every team to the teams that many places away around
 * the ring. An odd `q` adds the diametric matching, which needs an even pot.
 */
function ownPotEdges(ids: string[], quota: number, rng: () => number): SwissPairing[] {
  const n = ids.length
  if (quota < 1 || n < 2) return []

  const edges: SwissPairing[] = []
  const pairSteps = Math.floor(quota / 2)
  // Steps k and n-k describe the same edge set, so only 1..floor((n-1)/2) count.
  const available: number[] = []
  for (let k = 1; k <= Math.floor((n - 1) / 2); k++) available.push(k)
  const steps = shuffleWith(available, rng).slice(0, pairSteps)

  for (const k of steps) {
    for (let i = 0; i < n; i++) edges.push([ids[i], ids[(i + k) % n]])
  }

  if (quota % 2 === 1) {
    // Requires an even pot — guaranteed by the `oddPotQuota` validation rule.
    const half = n / 2
    for (let i = 0; i < half; i++) edges.push([ids[i], ids[i + half]])
  }

  return edges
}

/**
 * Bipartite q-regular graph between two equally sized pots: `q` distinct
 * rotations of one side against the other. Each rotation is a perfect matching
 * and distinct rotations never repeat an edge.
 */
function crossPotEdges(a: string[], b: string[], quota: number, rng: () => number): SwissPairing[] {
  const n = Math.min(a.length, b.length)
  if (quota < 1 || n < 1) return []

  const offsets = shuffleWith(
    Array.from({ length: n }, (_, i) => i),
    rng
  ).slice(0, Math.min(quota, n))

  const edges: SwissPairing[] = []
  for (const off of offsets) {
    for (let i = 0; i < n; i++) edges.push([a[i], b[(i + off) % n]])
  }
  return edges
}

/**
 * The analytic opponent graph — correct quotas, but no notion of matchdays.
 * Used as the fallback when the round-by-round search below cannot find a
 * schedule, so a draw always produces something playable.
 */
function buildPairingsAnalytically(
  pots: string[][],
  opponentCount: number,
  rng: () => number
): SwissPairing[] {
  const quota = opponentCount / pots.length
  // Shuffling each pot is what makes the circulant/rotation structure look like
  // a real draw rather than a fixed pattern.
  const shuffled = pots.map((p) => shuffleWith(p, rng))

  const edges: SwissPairing[] = []
  for (let p = 0; p < shuffled.length; p++) {
    edges.push(...ownPotEdges(shuffled[p], quota, rng))
    for (let q = p + 1; q < shuffled.length; q++) {
      edges.push(...crossPotEdges(shuffled[p], shuffled[q], quota, rng))
    }
  }

  return shuffleWith(edges, rng)
}

const ROUND_ATTEMPTS = 60
const SCHEDULE_ATTEMPTS = 40

interface ScheduleState {
  /** How many more opponents each team still owes to each pot. */
  need: Map<string, number[]>
  potOf: Map<string, number>
  played: Set<string>
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

function initState(pots: string[][], quota: number): ScheduleState {
  const need = new Map<string, number[]>()
  const potOf = new Map<string, number>()
  pots.forEach((ids, p) =>
    ids.forEach((id) => {
      potOf.set(id, p)
      need.set(id, new Array(pots.length).fill(quota))
    })
  )
  return { need, potOf, played: new Set() }
}

function canPair(st: ScheduleState, a: string, b: string): boolean {
  if (a === b) return false
  if (st.played.has(pairKey(a, b))) return false
  return st.need.get(a)![st.potOf.get(b)!] > 0 && st.need.get(b)![st.potOf.get(a)!] > 0
}

/**
 * One matchday: a matching over the teams that still owe fixtures, built
 * most-constrained-first (the team with the fewest legal partners is paired
 * first) so the round does not strand anyone. Returns null if it could not
 * reach `desired` matches.
 */
function tryBuildRound(
  st: ScheduleState,
  teams: string[],
  desired: number,
  rng: () => number
): SwissPairing[] | null {
  const pool = shuffleWith(
    teams.filter((id) => st.need.get(id)!.some((n) => n > 0)),
    rng
  )
  const used = new Set<string>()
  const round: SwissPairing[] = []

  while (round.length < desired) {
    const open = pool.filter((id) => !used.has(id))
    let best: string | null = null
    let bestPartners: string[] = []
    for (const u of open) {
      const partners = open.filter((v) => canPair(st, u, v))
      if (best === null || partners.length < bestPartners.length) {
        best = u
        bestPartners = partners
      }
      if (partners.length === 0) break
    }
    if (best === null || bestPartners.length === 0) return null

    // Among the legal partners prefer the busiest, so teams that still owe a
    // lot of fixtures do not pile up in the final rounds.
    const totalNeed = (id: string) => st.need.get(id)!.reduce((a, b) => a + b, 0)
    const maxNeed = Math.max(...bestPartners.map(totalNeed))
    const busiest = bestPartners.filter((v) => totalNeed(v) === maxNeed)
    const partner = busiest[Math.floor(rng() * busiest.length)]

    used.add(best)
    used.add(partner)
    round.push([best, partner])
  }

  return round
}

function commitRound(st: ScheduleState, round: SwissPairing[]) {
  for (const [a, b] of round) {
    st.played.add(pairKey(a, b))
    st.need.get(a)![st.potOf.get(b)!]--
    st.need.get(b)![st.potOf.get(a)!]--
  }
}

/**
 * Builds the fixture one matchday at a time instead of pairing everyone up
 * first and slicing the result into rounds afterwards.
 *
 * That ordering is the whole point: slicing an existing graph into rounds is
 * edge colouring, and a greedy pass at it strands the busiest teams — the last
 * matchdays end up with a handful of games while the first are full. Choosing
 * a full matching *as* each round is generated keeps every matchday at
 * `floor(teams / 2)` matches.
 *
 * Returns null if no schedule was found within the retry budget; the caller
 * falls back to the analytic graph.
 */
export function buildSwissSchedule(
  potIds: string[][],
  opponentCount: number,
  rng: () => number
): SwissPairing[][] | null {
  const pots = potIds.filter((p) => p.length > 0)
  if (!pots.length) return null

  const teams = pots.flat()
  const teamCount = teams.length
  if (validateSwissConfig(teamCount, opponentCount, pots.length).length) return null

  const quota = opponentCount / pots.length
  const perRound = Math.floor(teamCount / 2)
  const totalEdges = (teamCount * opponentCount) / 2
  // An odd field cannot seat everyone every matchday, so it needs a round more
  // than the opponent count — and then the leftovers have to be spread across
  // all of them rather than dumped into the last one.
  const roundCount = Math.ceil(totalEdges / perRound)

  for (let attempt = 0; attempt < SCHEDULE_ATTEMPTS; attempt++) {
    const st = initState(pots, quota)
    const rounds: SwissPairing[][] = []
    let placed = 0
    let failed = false

    while (placed < totalEdges && rounds.length < roundCount + 2) {
      const owing = teams.filter((id) => st.need.get(id)!.some((n) => n > 0)).length
      const roundsLeft = Math.max(1, roundCount - rounds.length)
      const desired = Math.min(
        perRound,
        Math.floor(owing / 2),
        Math.ceil((totalEdges - placed) / roundsLeft)
      )
      if (desired < 1) {
        failed = true
        break
      }

      // Hold out for the balanced size first; only shrink the round if no
      // arrangement of that size exists, which keeps matchdays even in practice.
      let round: SwissPairing[] | null = null
      for (let size = desired; size >= 1 && !round; size--) {
        const budget = size === desired ? ROUND_ATTEMPTS : 4
        for (let i = 0; i < budget && !round; i++) {
          round = tryBuildRound(st, teams, size, rng)
        }
      }
      if (!round) {
        failed = true
        break
      }

      commitRound(st, round)
      rounds.push(round)
      placed += round.length
    }

    if (!failed && placed === totalEdges) return rounds
  }

  return null
}

/**
 * The full opponent graph. Every team ends up with exactly `opponentCount`
 * distinct opponents, and — when there is more than one pot — exactly
 * `opponentCount / potCount` of them from each pot.
 *
 * Returns null only if the configuration is invalid; callers should have run
 * `validateSwissConfig` first.
 */
export function buildSwissPairings(
  potIds: string[][],
  opponentCount: number,
  rng: () => number
): SwissPairing[] | null {
  const pots = potIds.filter((p) => p.length > 0)
  if (!pots.length) return null

  const teamCount = pots.reduce((n, p) => n + p.length, 0)
  if (validateSwissConfig(teamCount, opponentCount, pots.length).length) return null

  const schedule = buildSwissSchedule(pots, opponentCount, rng)
  return schedule ? schedule.flat() : buildPairingsAnalytically(pots, opponentCount, rng)
}

// ─── Home / away ─────────────────────────────────────────────────

/**
 * Turns unordered pairings into matches.
 *
 * With `balance` on this is an Eulerian orientation: pairing up the odd-degree
 * teams with temporary edges makes every degree even, so each component has an
 * Euler circuit; walking it and orienting each edge the way it was traversed
 * gives every team an equal number of home and away games. Dropping the
 * temporary edges afterwards can leave a team one off, which is the best any
 * orientation can do when its match count is odd.
 *
 * A plain left-to-right greedy is not enough here — it drifts to a gap of two
 * or more once the pairing graph is dense.
 */
export function assignHomeAway(
  pairs: SwissPairing[],
  balance: boolean,
  rng: () => number
): SwissPairing[] {
  if (!balance) {
    return pairs.map(([a, b]) => (rng() < 0.5 ? [a, b] : [b, a]) as SwissPairing)
  }
  if (!pairs.length) return []

  // Adjacency over edge indices; indices >= pairs.length are the temporary
  // edges added to even out odd degrees and are discarded at the end.
  const adj = new Map<string, number[]>()
  const ends: SwissPairing[] = [...pairs]
  const link = (a: string, b: string, idx: number) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(idx)
    adj.get(b)!.push(idx)
  }
  pairs.forEach(([a, b], i) => link(a, b, i))

  const odd = shuffleWith(
    [...adj.keys()].filter((id) => adj.get(id)!.length % 2 === 1),
    rng
  )
  for (let i = 0; i + 1 < odd.length; i += 2) {
    ends.push([odd[i], odd[i + 1]])
    link(odd[i], odd[i + 1], ends.length - 1)
  }

  const usedEdge = new Array<boolean>(ends.length).fill(false)
  const cursor = new Map<string, number>()
  const directed = new Array<SwissPairing | null>(pairs.length).fill(null)

  // Hierholzer, once per component.
  for (const start of adj.keys()) {
    if (adj.get(start)!.every((e) => usedEdge[e])) continue
    const stack: string[] = [start]
    while (stack.length) {
      const v = stack[stack.length - 1]
      const list = adj.get(v)!
      let i = cursor.get(v) ?? 0
      while (i < list.length && usedEdge[list[i]]) i++
      cursor.set(v, i)
      if (i === list.length) {
        stack.pop()
        continue
      }
      const edgeIdx = list[i]
      usedEdge[edgeIdx] = true
      const [x, y] = ends[edgeIdx]
      const next = x === v ? y : x
      // Traversed v → next, so v hosts.
      if (edgeIdx < pairs.length) directed[edgeIdx] = [v, next]
      stack.push(next)
    }
  }

  return directed.map((d, i) => d ?? pairs[i])
}

// ─── Matchdays ───────────────────────────────────────────────────

/**
 * Fallback packer for a fixture that was built without matchdays in mind
 * (the analytic graph). Slicing an existing graph into rounds is edge
 * colouring and greedy passes at it leave the last rounds nearly empty, which
 * is exactly why `buildSwissSchedule` is the primary path — this only runs
 * when that search comes up empty.
 *
 * A matchday always takes at least one match, so this always terminates.
 */
export function packSwissRounds(pairs: SwissPairing[], teamCount: number): SwissPairing[][] {
  const perRound = Math.max(1, Math.floor(teamCount / 2))
  const remaining = [...pairs]
  const rounds: SwissPairing[][] = []

  const remDeg = new Map<string, number>()
  for (const [a, b] of pairs) {
    remDeg.set(a, (remDeg.get(a) ?? 0) + 1)
    remDeg.set(b, (remDeg.get(b) ?? 0) + 1)
  }
  const deg = (id: string) => remDeg.get(id) ?? 0

  while (remaining.length) {
    const order = remaining
      .map((pair, idx) => ({ idx, weight: deg(pair[0]) + deg(pair[1]) }))
      .sort((x, y) => y.weight - x.weight)

    const used = new Set<string>()
    const round: SwissPairing[] = []
    const taken = new Set<number>()
    for (const { idx } of order) {
      if (round.length >= perRound) break
      const [home, away] = remaining[idx]
      if (used.has(home) || used.has(away)) continue
      used.add(home)
      used.add(away)
      taken.add(idx)
      round.push(remaining[idx])
      remDeg.set(home, deg(home) - 1)
      remDeg.set(away, deg(away) - 1)
    }

    rounds.push(round)
    for (let i = remaining.length - 1; i >= 0; i--) if (taken.has(i)) remaining.splice(i, 1)
  }

  return rounds
}

/**
 * Repeats the rounds once per leg, flipping home/away on every odd leg so a
 * two-legged Swiss gives each pairing one home and one away fixture — the same
 * convention `buildGroupFixture` uses.
 */
export function buildSwissMatchdays(baseRounds: SwissPairing[][], legs = 1): LeagueMatchday[] {
  const matchdays: LeagueMatchday[] = []

  for (let leg = 0; leg < Math.max(1, legs); leg++) {
    for (const round of baseRounds) {
      const matches: GroupMatch[] = round.map(([home, away]) => {
        const [h, a] = leg % 2 === 0 ? [home, away] : [away, home]
        return { id: uid(), homeId: h, awayId: a, result: null }
      })
      matchdays.push({ name: `Matchday ${matchdays.length + 1}`, matches })
    }
  }

  return matchdays
}

// ─── League assembly ─────────────────────────────────────────────

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

export interface SwissDrawInput extends SwissConfig {
  legMode: LegMode
  drawType?: DrawType
}

/**
 * The largest workable opponent count for a field of this size: never more
 * rivals than exist, and never an odd number of total match slots. Adding or
 * removing a team mid-setup can invalidate a previously fine config, and a
 * fixture that quietly comes back empty is far worse than one that shrinks.
 */
export function clampSwissOpponentCount(teamCount: number, opponentCount: number): number {
  let n = Math.min(Math.max(1, Math.floor(opponentCount)), teamCount - 1)
  if ((teamCount * n) % 2 !== 0) n -= 1
  return Math.max(0, n)
}

/**
 * Builds the whole Swiss league phase from a config. Falls back to a single
 * pot if the pot-constrained draw is not satisfiable, so a stale or hand-edited
 * config can still produce a playable tournament rather than an empty one.
 */
export function buildSwissLeague(teams: Team[], cfg: SwissDrawInput): League {
  const teamIds = teams.map((t) => t.id)
  const legMode = cfg.legMode
  const legs = legModeToCount(legMode)
  const empty: League = { matchdays: [], standings: zeroStandings(teamIds), legMode }
  const opponents = clampSwissOpponentCount(teamIds.length, cfg.opponentCount)
  if (teamIds.length < 2 || opponents < 1) return empty

  const rng = makeRng(cfg.seed)
  // "random" draw means one big pot; pots are what the "seeded" draw adds.
  const potCount = cfg.drawType === "random" ? 1 : Math.max(1, cfg.potCount)
  const pots = buildSwissPots(teams, potCount).map((p) => p.teamIds)

  // A pot config that cannot be satisfied (usually because the roster changed
  // after the draw was set up) degrades to a single pot rather than failing.
  const rounds =
    buildSwissSchedule(pots, opponents, rng) ??
    buildSwissSchedule([teamIds], opponents, makeRng(cfg.seed)) ??
    packSwissRounds(buildPairingsAnalytically([teamIds], opponents, rng), teamIds.length)
  if (!rounds.length) return empty

  // Orient the whole fixture at once — home/away balance is a property of the
  // full edge set, not of any one round — then put the rounds back together.
  const directed = assignHomeAway(rounds.flat(), cfg.balanceHomeAway, rng)
  let cursor = 0
  const directedRounds = rounds.map((round) => round.map(() => directed[cursor++]))

  return {
    matchdays: buildSwissMatchdays(directedRounds, legs),
    standings: zeroStandings(teamIds),
    legMode,
  }
}

export interface CreateSwissOptions {
  opponentCount: number
  potCount: number
  balanceHomeAway: boolean
  legMode?: LegMode
  drawType?: DrawType
  seed?: number
  playoffEnabled?: boolean
  playoffQualifierCount?: number
  playoffSeedMode?: LeaguePlayoffSeedMode
  knockoutLegMode?: LegMode
  finalLegMode?: LegMode
  roundLegModes?: Partial<Record<KnockoutStage, LegMode>>
  tiebreaker?: Tiebreaker
  winPoints?: number
  drawPoints?: number
  lossPoints?: number
}

export function createSwissTournament(
  name: string,
  teams: Team[],
  season = 1,
  opts: CreateSwissOptions
): Tournament {
  const teamIds = teams.map((t) => t.id)
  const swiss: SwissConfig = {
    opponentCount: opts.opponentCount,
    potCount: Math.max(1, opts.potCount),
    balanceHomeAway: opts.balanceHomeAway,
    seed: opts.seed ?? randomSeed(),
  }
  const drawType: DrawType = opts.drawType ?? "seeded"
  const league = buildSwissLeague(teams, { ...swiss, legMode: opts.legMode ?? "single", drawType })

  return {
    id: uid(),
    name,
    season,
    format: "swiss",
    teamIds,
    league,
    swiss,
    drawType,
    leaguePlayoff: {
      enabled: opts.playoffEnabled ?? true,
      qualifierCount: Math.max(2, Math.min(opts.playoffQualifierCount ?? 8, teamIds.length)),
      seedMode: opts.playoffSeedMode ?? "seeded",
      started: false,
    },
    knockoutLegMode: opts.knockoutLegMode ?? "single",
    finalLegMode: opts.finalLegMode ?? "single",
    roundLegModes: opts.roundLegModes,
    tiebreaker: opts.tiebreaker,
    winPoints: opts.winPoints,
    drawPoints: opts.drawPoints,
    lossPoints: opts.lossPoints,
    rounds: [],
    winnerId: null,
    createdAt: Date.now(),
  }
}
