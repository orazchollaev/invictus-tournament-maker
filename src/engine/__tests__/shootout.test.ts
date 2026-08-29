// engine/__tests__/shootout.test.ts
//
// The point of these is the abandonment rule. A shootout that always takes
// ten kicks can report 5-0, which no shootout has ever ended on, and gives
// the last kick nothing to decide.
import { describe, it, expect } from "vitest"
import { REGULATION_KICKS, reconstructShootout, rollShootout } from "../shootout"
import type { ShootoutKickOutcome } from "../shootout"

/** Deterministic rng cycling a fixed list, so a kick pattern can be dictated. */
function scriptedRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

/** Replays a sequence and reports what the scoreboard said at each point. */
function tally(kicks: ShootoutKickOutcome[]) {
  let home = 0
  let away = 0
  let homeTaken = 0
  let awayTaken = 0
  for (const kick of kicks) {
    if (kick.side === "home") {
      homeTaken++
      if (kick.scored) home++
    } else {
      awayTaken++
      if (kick.scored) away++
    }
  }
  return { home, away, homeTaken, awayTaken }
}

/**
 * A sequence is legal when no kick was taken after the tie was already out of
 * reach — the check the old model could not pass.
 */
function isLegalSequence(kicks: ShootoutKickOutcome[]): boolean {
  let home = 0
  let away = 0
  let homeTaken = 0
  let awayTaken = 0

  for (let i = 0; i < kicks.length; i++) {
    const inRegulation = homeTaken < REGULATION_KICKS || awayTaken < REGULATION_KICKS
    if (inRegulation) {
      const homeLeft = REGULATION_KICKS - homeTaken
      const awayLeft = REGULATION_KICKS - awayTaken
      if (home > away + awayLeft || away > home + homeLeft) return false
    } else if (home !== away && homeTaken === awayTaken) {
      // Sudden death only continues while the pairs keep coming out level.
      return false
    }

    const kick = kicks[i]
    if (kick.side === "home") {
      homeTaken++
      if (kick.scored) home++
    } else {
      awayTaken++
      if (kick.scored) away++
    }
  }

  return true
}

describe("rollShootout", () => {
  it("never ends level", () => {
    for (let i = 0; i < 300; i++) {
      const { penHome, penAway } = rollShootout(0.75, 0.7)
      expect(penHome).not.toBe(penAway)
    }
  })

  it("never produces a tally no shootout could reach", () => {
    for (let i = 0; i < 300; i++) {
      const outcome = rollShootout(0.75, 0.7)
      expect(isLegalSequence(outcome.kicks)).toBe(true)
      expect(tally(outcome.kicks)).toMatchObject({
        home: outcome.penHome,
        away: outcome.penAway,
      })
    }
  })

  it("stops the moment the tie is out of reach", () => {
    // Home converts everything, away misses everything. At 3-0 the away side
    // has three kicks left and could still level, so it takes the third — and
    // missing it ends the shootout two kicks early.
    const kicks = rollShootout(1, 0, scriptedRng([0.5])).kicks
    expect(tally(kicks)).toEqual({ home: 3, away: 0, homeTaken: 3, awayTaken: 3 })
  })

  it("goes to sudden death only when the sets finish level", () => {
    // Everybody scores: five each, then paired kicks until one pair differs.
    const outcome = rollShootout(1, 0.5, scriptedRng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9]))
    expect(outcome.kicks.length).toBeGreaterThan(2 * REGULATION_KICKS)
    expect(outcome.penHome).toBe(6)
    expect(outcome.penAway).toBe(5)
  })
})

describe("reconstructShootout", () => {
  it("rebuilds a legal sequence for tallies a shootout can produce", () => {
    for (const [home, away] of [
      [5, 4],
      [4, 3],
      [3, 2],
      [3, 1],
      [2, 3],
      [6, 5],
      [8, 7],
    ]) {
      const kicks = reconstructShootout(home, away)
      expect(kicks, `${home}-${away}`).not.toBeNull()
      expect(tally(kicks!)).toMatchObject({ home, away })
      expect(isLegalSequence(kicks!), `${home}-${away}`).toBe(true)
    }
  })

  it("round-trips every tally the roller produces", () => {
    for (let i = 0; i < 200; i++) {
      const { penHome, penAway } = rollShootout(0.8, 0.6)
      const kicks = reconstructShootout(penHome, penAway)
      expect(kicks, `${penHome}-${penAway}`).not.toBeNull()
      expect(tally(kicks!)).toMatchObject({ home: penHome, away: penAway })
    }
  })

  it("refuses tallies no shootout could have produced", () => {
    // 5-0 would have been abandoned at 3-0; a level tally is not a result.
    expect(reconstructShootout(5, 0)).toBeNull()
    expect(reconstructShootout(3, 3)).toBeNull()
  })
})
