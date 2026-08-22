// engine/__tests__/events.test.ts
import { describe, it, expect } from "vitest"
import type { Player } from "../../modules/players/types"
import type { Tournament } from "../../modules/tournament/types"
import { buildLineup, FORMATION, LINEUP_SIZE, UNKNOWN_POWER } from "../events/lineup"
import { generateMatchStats } from "../events/generate"
import { generateTeamStats } from "../events/teamStats"
import { setSimConfig } from "../simulation"
import { computeRating, MIN_RATING, MAX_RATING } from "../events/rating"
import { ensureMatchStats, markLegacyMatchStats } from "../events/ensure"
import { makeTeams, makeGroup } from "./helpers"

function makePlayer(id: string, position: Player["position"], power = 70, teamId = "t1"): Player {
  return { id, teamId, name: `Player ${id}`, position, power }
}

/** Full 1-4-3-3 squad so nothing falls through to an unknown slot. */
function fullSquad(teamId: string): Player[] {
  const squad: Player[] = []
  ;(Object.keys(FORMATION) as Array<Player["position"]>).forEach((position) => {
    for (let i = 0; i < FORMATION[position]; i++) {
      squad.push(makePlayer(`${teamId}-${position}-${i}`, position, 70, teamId))
    }
  })
  return squad
}

describe("buildLineup", () => {
  it("always returns eleven slots, even with no squad", () => {
    expect(buildLineup([])).toHaveLength(LINEUP_SIZE)
    expect(buildLineup(fullSquad("t1"))).toHaveLength(LINEUP_SIZE)
  })

  it("leaves unfilled slots anonymous at baseline power", () => {
    const lineup = buildLineup([])
    expect(lineup.every((s) => s.playerId === null)).toBe(true)
    expect(lineup.every((s) => s.power === UNKNOWN_POWER)).toBe(true)
  })

  it("never fields the same player twice", () => {
    const lineup = buildLineup(fullSquad("t1"))
    const ids = lineup.map((s) => s.playerId).filter((id): id is string => id !== null)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("only places a player in his own position's slots", () => {
    const lineup = buildLineup([makePlayer("p1", "FWD")])
    const filled = lineup.filter((s) => s.playerId !== null)
    expect(filled).toHaveLength(1)
    expect(filled[0].position).toBe("FWD")
  })

  it("keeps a lone striker from taking every attacking slot", () => {
    const lineup = buildLineup([makePlayer("p1", "FWD")])
    expect(lineup.filter((s) => s.playerId === "p1")).toHaveLength(1)
    expect(lineup.filter((s) => s.position === "FWD" && s.playerId === null)).toHaveLength(
      FORMATION.FWD - 1
    )
  })
})

describe("generateMatchStats", () => {
  function run(
    homeGoals: number,
    awayGoals: number,
    homeSquad: Player[] = [],
    awaySquad: Player[] = []
  ) {
    return generateMatchStats({
      homeLineup: buildLineup(homeSquad),
      awayLineup: buildLineup(awaySquad),
      homePower: 75,
      awayPower: 65,
      homeGoals,
      awayGoals,
    })
  }

  it("generates exactly as many goal events per side as the score", () => {
    for (let i = 0; i < 40; i++) {
      const stats = run(3, 1, fullSquad("t1"), fullSquad("t2"))
      const scoring = ["goal", "penGoal", "ownGoal"]
      expect(
        stats.events.filter((e) => e.side === "home" && scoring.includes(e.type))
      ).toHaveLength(3)
      expect(
        stats.events.filter((e) => e.side === "away" && scoring.includes(e.type))
      ).toHaveLength(1)
    }
  })

  it("produces no goal events for a goalless draw", () => {
    const stats = run(0, 0, fullSquad("t1"), fullSquad("t2"))
    const scoring = ["goal", "penGoal", "ownGoal"]
    expect(stats.events.filter((e) => scoring.includes(e.type))).toHaveLength(0)
  })

  it("spreads a big score across a squad instead of onto its only player", () => {
    let soloGoals = 0
    const runs = 60
    for (let i = 0; i < runs; i++) {
      const stats = run(10, 0, [makePlayer("solo", "FWD", 90)])
      soloGoals += stats.lines.find((l) => l.playerId === "solo")?.goals ?? 0
    }
    // One of three forward slots, so roughly a third of ten goals — never all of them.
    const average = soloGoals / runs
    expect(average).toBeGreaterThan(0)
    expect(average).toBeLessThan(8)
  })

  it("attributes unfilled slots anonymously and never aggregates them as one player", () => {
    const stats = run(4, 0)
    expect(stats.events.every((e) => e.playerId === null)).toBe(true)
    expect(stats.lines.every((l) => l.playerId === null)).toBe(true)
  })

  it("emits a line for every slot on both sides", () => {
    const stats = run(1, 1, fullSquad("t1"), fullSquad("t2"))
    expect(stats.lines.filter((l) => l.side === "home")).toHaveLength(LINEUP_SIZE)
    expect(stats.lines.filter((l) => l.side === "away")).toHaveLength(LINEUP_SIZE)
  })

  it("never credits an own goal as one of the scorer's goals", () => {
    for (let i = 0; i < 80; i++) {
      const stats = run(5, 5, fullSquad("t1"), fullSquad("t2"))
      const ownGoals = stats.events.filter((e) => e.type === "ownGoal")
      for (const own of ownGoals) {
        const line = stats.lines.find((l) => l.playerId === own.playerId)
        if (!line) continue
        const credited = stats.events.filter(
          (e) =>
            e.side === line.side &&
            ["goal", "penGoal"].includes(e.type) &&
            e.playerId === line.playerId
        ).length
        expect(line.goals).toBe(credited)
      }
    }
  })

  it("never gives a goal its own scorer as the assist", () => {
    for (let i = 0; i < 60; i++) {
      const stats = run(4, 4, fullSquad("t1"), fullSquad("t2"))
      for (const e of stats.events) {
        if (e.assistId && e.playerId) expect(e.assistId).not.toBe(e.playerId)
      }
    }
  })

  it("orders the timeline by minute", () => {
    const stats = run(3, 3, fullSquad("t1"), fullSquad("t2"))
    const minutes = stats.events.map((e) => e.minute)
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
  })

  it("records clean sheets and keeper workload consistently", () => {
    const stats = run(2, 0, fullSquad("t1"), fullSquad("t2"))
    const homeKeeper = stats.lines.find((l) => l.side === "home" && l.position === "GK")!
    const awayKeeper = stats.lines.find((l) => l.side === "away" && l.position === "GK")!
    expect(homeKeeper.cleanSheet).toBe(true)
    expect(homeKeeper.conceded).toBe(0)
    expect(awayKeeper.cleanSheet).toBe(false)
    expect(awayKeeper.conceded).toBe(2)
    expect(awayKeeper.saves).toBeGreaterThanOrEqual(0)
  })
})

describe("shootout reconstruction", () => {
  function shootout(penHome: number, penAway: number) {
    return generateMatchStats({
      homeLineup: buildLineup(fullSquad("t1")),
      awayLineup: buildLineup(fullSquad("t2")),
      homePower: 75,
      awayPower: 75,
      homeGoals: 1,
      awayGoals: 1,
      penHome,
      penAway,
    }).shootout
  }

  it("is only generated when the tie went to penalties", () => {
    const noPens = generateMatchStats({
      homeLineup: buildLineup(fullSquad("t1")),
      awayLineup: buildLineup(fullSquad("t2")),
      homePower: 75,
      awayPower: 75,
      homeGoals: 2,
      awayGoals: 1,
    })
    expect(noPens.shootout).toBeUndefined()
    expect(shootout(4, 3)).toBeDefined()
  })

  it("scores exactly as many kicks as the recorded tally", () => {
    for (const [h, a] of [
      [5, 4],
      [3, 2],
      [8, 7],
      [0, 1],
    ]) {
      const kicks = shootout(h, a)!
      expect(kicks.filter((k) => k.side === "home" && k.scored)).toHaveLength(h)
      expect(kicks.filter((k) => k.side === "away" && k.scored)).toHaveLength(a)
    }
  })

  it("alternates sides and numbers the kicks in order", () => {
    const kicks = shootout(4, 3)!
    kicks.forEach((kick, i) => {
      expect(kick.order).toBe(i + 1)
      expect(kick.side).toBe(i % 2 === 0 ? "home" : "away")
    })
  })

  it("gives every kick a taker and never fewer than five rounds", () => {
    const kicks = shootout(9, 8)!
    expect(kicks.filter((k) => k.side === "home").length).toBeGreaterThanOrEqual(9)
    expect(kicks.every((k) => k.playerId !== null)).toBe(true)
  })
})

describe("generateTeamStats", () => {
  it("keeps goals <= on target <= shots for both sides", () => {
    for (let i = 0; i < 200; i++) {
      const homeGoals = Math.floor(Math.random() * 9)
      const awayGoals = Math.floor(Math.random() * 9)
      const stats = generateTeamStats(90, 20, homeGoals, awayGoals)
      expect(stats.onTarget[0]).toBeGreaterThanOrEqual(homeGoals)
      expect(stats.onTarget[1]).toBeGreaterThanOrEqual(awayGoals)
      expect(stats.shots[0]).toBeGreaterThanOrEqual(stats.onTarget[0])
      expect(stats.shots[1]).toBeGreaterThanOrEqual(stats.onTarget[1])
    }
  })

  it("keeps possession inside a believable range", () => {
    for (let i = 0; i < 100; i++) {
      const stats = generateTeamStats(99, 1, 5, 0)
      expect(stats.possession).toBeGreaterThanOrEqual(15)
      expect(stats.possession).toBeLessThanOrEqual(85)
    }
  })

  it("lets a far stronger side dominate the ball", () => {
    setSimConfig({ surpriseFactor: 50 })
    let total = 0
    const runs = 60
    for (let i = 0; i < runs; i++) total += generateTeamStats(90, 60, 2, 0).possession
    // A 30-point gap should read as clear control, not a coin toss.
    expect(total / runs).toBeGreaterThan(62)
  })

  it("outshoots the weaker side by a clear margin", () => {
    setSimConfig({ surpriseFactor: 50 })
    let stronger = 0
    let weaker = 0
    for (let i = 0; i < 60; i++) {
      const stats = generateTeamStats(90, 60, 2, 0)
      stronger += stats.shots[0]
      weaker += stats.shots[1]
    }
    expect(stronger).toBeGreaterThan(weaker * 1.5)
  })

  it("flattens the same mismatch when the surprise factor is maxed", () => {
    setSimConfig({ surpriseFactor: 0 })
    const ordered = averagePossession(90, 60)
    setSimConfig({ surpriseFactor: 100 })
    const chaotic = averagePossession(90, 60)
    setSimConfig({ surpriseFactor: 50 })
    expect(ordered).toBeGreaterThan(chaotic + 5)
  })

  it("lets the scoreline pull the bars toward whoever won", () => {
    setSimConfig({ surpriseFactor: 50 })
    const won = averagePossession(70, 70, 3, 0)
    const lost = averagePossession(70, 70, 0, 3)
    expect(won).toBeGreaterThan(lost)
  })
})

function averagePossession(hp: number, ap: number, hg = 2, ag = 0): number {
  let total = 0
  const runs = 60
  for (let i = 0; i < runs; i++) total += generateTeamStats(hp, ap, hg, ag).possession
  return total / runs
}

describe("computeRating", () => {
  it("stays inside 1-10 under extreme input", () => {
    const massacre = computeRating({
      position: "DEF",
      outcome: "win",
      goals: 10,
      assists: 10,
      cleanSheet: true,
    })
    const disaster = computeRating({
      position: "GK",
      outcome: "loss",
      goals: 0,
      assists: 0,
      cleanSheet: false,
      conceded: 20,
      saves: 0,
    })
    expect(massacre).toBeLessThanOrEqual(MAX_RATING)
    expect(disaster).toBeGreaterThanOrEqual(MIN_RATING)
  })

  it("rewards a defender's goal more than a striker's", () => {
    const base = { outcome: "win" as const, goals: 1, assists: 0, cleanSheet: false }
    expect(computeRating({ ...base, position: "DEF" })).toBeGreaterThan(
      computeRating({ ...base, position: "FWD" })
    )
  })

  it("is deterministic for identical input", () => {
    const line = {
      position: "MID" as const,
      outcome: "draw" as const,
      goals: 1,
      assists: 1,
      cleanSheet: false,
    }
    expect(computeRating(line)).toBe(computeRating(line))
  })

  it("separates a standout performance from an anonymous one", () => {
    const base = {
      position: "DEF" as const,
      outcome: "win" as const,
      goals: 0,
      assists: 0,
      cleanSheet: true,
    }
    expect(computeRating({ ...base, performance: 1 })).toBeGreaterThan(
      computeRating({ ...base, performance: 0 })
    )
  })

  it("tilts toward the stronger player within the same squad", () => {
    const base = {
      position: "MID" as const,
      outcome: "draw" as const,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      performance: 0.5,
      squadPower: 70,
    }
    expect(computeRating({ ...base, power: 95 })).toBeGreaterThan(
      computeRating({ ...base, power: 50 })
    )
  })

  it("caps the power tilt so a star cannot coast", () => {
    const base = {
      position: "FWD" as const,
      outcome: "loss" as const,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      performance: 0.5,
      squadPower: 40,
    }
    const star = computeRating({ ...base, power: 99 })
    const ordinary = computeRating({ ...base, power: 40 })
    expect(star - ordinary).toBeLessThanOrEqual(0.7)
  })
})

describe("ensureMatchStats", () => {
  function playedTournament(): Tournament {
    const teams = makeTeams(4)
    const group = makeGroup(teams.map((t) => t.id))
    group.matches.forEach((m, i) => {
      m.result = { home: (i % 3) + 1, away: i % 2 }
    })
    return {
      id: "tour",
      name: "Cup",
      season: 1,
      format: "group+bracket",
      teamIds: teams.map((t) => t.id),
      rounds: [],
      winnerId: null,
      groups: [group],
      createdAt: 0,
    }
  }

  it("fills every played match and reports that it changed something", () => {
    const t = playedTournament()
    const teams = makeTeams(4)
    expect(ensureMatchStats(t, teams, [])).toBe(true)
    expect(t.groups![0].matches.every((m) => m.result?.stats)).toBe(true)
  })

  it("is idempotent — a second sweep writes nothing", () => {
    const t = playedTournament()
    const teams = makeTeams(4)
    ensureMatchStats(t, teams, [])
    const first = t.groups![0].matches[0].result!.stats
    expect(ensureMatchStats(t, teams, [])).toBe(false)
    expect(t.groups![0].matches[0].result!.stats).toBe(first)
  })

  it("leaves matches marked as legacy alone", () => {
    const t = playedTournament()
    const teams = makeTeams(4)
    markLegacyMatchStats(t)
    expect(t.groups![0].matches.every((m) => m.result?.stats === null)).toBe(true)
    expect(ensureMatchStats(t, teams, [])).toBe(false)
    expect(t.groups![0].matches.every((m) => m.result?.stats === null)).toBe(true)
  })

  it("does not invent stats for unplayed matches", () => {
    const t = playedTournament()
    t.groups![0].matches[0].result = null
    ensureMatchStats(t, makeTeams(4), [])
    expect(t.groups![0].matches[0].result).toBeNull()
  })
})
