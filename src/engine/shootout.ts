// engine/shootout.ts
//
// A shootout as it is actually taken, kick by kick, rather than as a pair
// of totals invented up front.
//
// The distinction matters. The old model gave both sides five kicks every
// time and counted the goals, which can produce a 5-0 — a scoreline no
// shootout can ever reach, because it would have been abandoned at 3-0.
// Refereeing the abandonment rule here means the tallies the rest of the
// app stores are always tallies a real shootout could have produced, and
// the live match has a last kick worth watching.
export type ShootoutSide = "home" | "away"

export interface ShootoutKickOutcome {
  side: ShootoutSide
  scored: boolean
}

export interface ShootoutOutcome {
  penHome: number
  penAway: number
  /** Every kick actually taken, in order. Never contains a kick made irrelevant. */
  kicks: ShootoutKickOutcome[]
}

/** The best-of-five set each side starts with. */
export const REGULATION_KICKS = 5

/** Sudden death cannot run forever in a simulation; 20 pairs is far past plausible. */
const MAX_SUDDEN_DEATH_ROUNDS = 20

/**
 * Roll a complete shootout from two conversion rates.
 *
 * Deliberately player-free: it deals in booleans, so it stays a pure
 * function of the two rates and the rng. Naming the takers is the event
 * generator's job, which is the only place squads are known.
 */
export function rollShootout(
  homeRate: number,
  awayRate: number,
  rng: () => number = Math.random
): ShootoutOutcome {
  const kicks: ShootoutKickOutcome[] = []
  let home = 0
  let away = 0
  let homeTaken = 0
  let awayTaken = 0

  /** True once one side cannot be caught even if it misses everything left. */
  const decided = () =>
    home > away + (REGULATION_KICKS - awayTaken) || away > home + (REGULATION_KICKS - homeTaken)

  outer: for (let round = 0; round < REGULATION_KICKS; round++) {
    for (const side of ["home", "away"] as const) {
      if (decided()) break outer

      const scored = rng() < (side === "home" ? homeRate : awayRate)
      kicks.push({ side, scored })

      if (side === "home") {
        homeTaken++
        if (scored) home++
      } else {
        awayTaken++
        if (scored) away++
      }
    }
  }

  // Sudden death: both sides take, and the pair is only decisive when they
  // differ — so the tally can never end level on a completed round.
  let guard = MAX_SUDDEN_DEATH_ROUNDS
  while (home === away && guard-- > 0) {
    const homeScored = rng() < homeRate
    kicks.push({ side: "home", scored: homeScored })
    if (homeScored) home++

    const awayScored = rng() < awayRate
    kicks.push({ side: "away", scored: awayScored })
    if (awayScored) away++
  }

  // Only reachable if sudden death drew twenty rounds running. Award the kick
  // rather than return a level shootout, which no caller can act on.
  if (home === away) {
    kicks.push({ side: "home", scored: true })
    home++
  }

  return { penHome: home, penAway: away, kicks }
}

// ─── Reconstruction ──────────────────────────────────────────────
//
// Results saved before the kick-level model existed carry only the two
// totals, and a hand-entered shootout carries only what was typed. Both
// still need a sequence to display, so one is rebuilt from the totals.
//
// Rebuilding is a search rather than a formula, because most totals admit
// several legal shootouts and some — 5-0, say — admit none at all. A null
// return is the honest answer for those: the totals describe a shootout
// that could not have been taken.

/** Every k-sized subset of 0..n-1, as index arrays. */
function combinations(n: number, k: number): number[][] {
  if (k < 0 || k > n) return []
  if (k === 0) return [[]]
  const out: number[][] = []
  const build = (start: number, picked: number[]) => {
    if (picked.length === k) {
      out.push(picked)
      return
    }
    for (let i = start; i <= n - (k - picked.length); i++) build(i + 1, [...picked, i])
  }
  build(0, [])
  return out
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Replay a candidate make-pattern through the abandonment rule. */
function replayRegulation(
  homeMakes: Set<number>,
  awayMakes: Set<number>
): { kicks: ShootoutKickOutcome[]; home: number; away: number } {
  const kicks: ShootoutKickOutcome[] = []
  let home = 0
  let away = 0
  let homeTaken = 0
  let awayTaken = 0

  const decided = () =>
    home > away + (REGULATION_KICKS - awayTaken) || away > home + (REGULATION_KICKS - homeTaken)

  outer: for (let round = 0; round < REGULATION_KICKS; round++) {
    for (const side of ["home", "away"] as const) {
      if (decided()) break outer

      const scored = side === "home" ? homeMakes.has(round) : awayMakes.has(round)
      kicks.push({ side, scored })

      if (side === "home") {
        homeTaken++
        if (scored) home++
      } else {
        awayTaken++
        if (scored) away++
      }
    }
  }

  return { kicks, home, away }
}

/** A shootout settled in sudden death: five each, level, then paired rounds. */
function buildSuddenDeath(penHome: number, penAway: number): ShootoutKickOutcome[] | null {
  if (Math.abs(penHome - penAway) !== 1) return null

  const loser = Math.min(penHome, penAway)
  // As many of the loser's goals as possible come from the regulation set;
  // whatever is left over becomes rounds both sides converted.
  const regulation = Math.min(REGULATION_KICKS, loser)
  const bothScoredRounds = loser - regulation
  const homeWon = penHome > penAway

  const kicks: ShootoutKickOutcome[] = []
  for (let i = 0; i < REGULATION_KICKS; i++) {
    kicks.push({ side: "home", scored: i < regulation })
    kicks.push({ side: "away", scored: i < regulation })
  }
  for (let i = 0; i < bothScoredRounds; i++) {
    kicks.push({ side: "home", scored: true })
    kicks.push({ side: "away", scored: true })
  }
  kicks.push({ side: "home", scored: homeWon })
  kicks.push({ side: "away", scored: !homeWon })

  return kicks
}

/**
 * Rebuild a legal kick sequence from a pair of totals, or return null when
 * no legal shootout produces them.
 */
export function reconstructShootout(
  penHome: number,
  penAway: number,
  rng: () => number = Math.random
): ShootoutKickOutcome[] | null {
  if (penHome === penAway || penHome < 0 || penAway < 0) return null

  if (penHome > REGULATION_KICKS || penAway > REGULATION_KICKS) {
    return buildSuddenDeath(penHome, penAway)
  }

  const homeOptions = shuffled(combinations(REGULATION_KICKS, penHome), rng)
  const awayOptions = shuffled(combinations(REGULATION_KICKS, penAway), rng)

  for (const homeMakes of homeOptions) {
    for (const awayMakes of awayOptions) {
      const replay = replayRegulation(new Set(homeMakes), new Set(awayMakes))
      if (replay.home === penHome && replay.away === penAway) return replay.kicks
    }
  }

  // Level after five each is legal, but only as a prelude to sudden death.
  return buildSuddenDeath(penHome, penAway)
}
