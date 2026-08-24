// engine/__tests__/swiss.test.ts
import { describe, expect, it } from "vitest"
import type { League } from "../../modules/tournament/types"
import {
  assignHomeAway,
  buildSwissLeague,
  buildSwissMatchdays,
  buildSwissPairings,
  buildSwissSchedule,
  buildSwissPots,
  clampSwissOpponentCount,
  createSwissTournament,
  validateSwissConfig,
} from "../swiss"
import { swissPlan, buildPots } from "../drawCeremony"
import { recalcLeagueStandings, simulateAllLeague } from "../league"
import { getLeaguePlayoffQualifierIds, seedLeaguePlayoffBracket } from "../leaguePlayoff"
import { allMatches } from "../matchIterator"
import { makeRng } from "../utils"
import { makeTeams } from "./helpers"

// ─── helpers ─────────────────────────────────────────────────────

function opponentMap(pairs: Array<[string, string]>): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const push = (a: string, b: string) => map.set(a, [...(map.get(a) ?? []), b])
  for (const [home, away] of pairs) {
    push(home, away)
    push(away, home)
  }
  return map
}

function leagueOpponentCounts(league: League): Map<string, string[]> {
  return opponentMap(
    league.matchdays.flatMap((md) =>
      md.matches.map((m) => [m.homeId, m.awayId] as [string, string])
    )
  )
}

// ─── validateSwissConfig ─────────────────────────────────────────

describe("validateSwissConfig", () => {
  it("accepts the Champions League shape (36 teams, 8 opponents, 4 pots)", () => {
    expect(validateSwissConfig(36, 8, 4)).toEqual([])
  })

  it("accepts a potless draw when teams × opponents is even", () => {
    expect(validateSwissConfig(20, 7, 1)).toEqual([])
    expect(validateSwissConfig(21, 6, 1)).toEqual([])
  })

  it("rejects an odd number of total match slots", () => {
    expect(validateSwissConfig(21, 7, 1)).toContain("oddProduct")
  })

  it("rejects more opponents than there are rivals", () => {
    expect(validateSwissConfig(8, 8, 1)).toContain("tooManyOpponents")
  })

  it("rejects too few teams", () => {
    expect(validateSwissConfig(3, 2, 1)).toContain("minTeams")
  })

  it("rejects pots that do not divide the field evenly", () => {
    expect(validateSwissConfig(34, 8, 4)).toContain("potSizeUneven")
  })

  it("rejects an opponent count the pots cannot split", () => {
    expect(validateSwissConfig(36, 6, 4)).toContain("potDivision")
  })

  it("rejects a quota the pots cannot supply", () => {
    // 8 teams in 4 pots of 2 cannot give anyone 8 opponents.
    expect(validateSwissConfig(8, 8, 4)).toContain("tooManyOpponents")
  })

  it("rejects an own-pot quota that cannot form a regular graph", () => {
    // pots of 9 with a quota of 1 → 9 half-edges inside the pot, impossible.
    expect(validateSwissConfig(36, 4, 4)).toContain("oddPotQuota")
  })
})

// ─── buildSwissPots ──────────────────────────────────────────────

describe("buildSwissPots", () => {
  it("splits the field by power, strongest pot first", () => {
    const pots = buildSwissPots(makeTeams(36), 4)
    expect(pots).toHaveLength(4)
    expect(pots.every((p) => p.teamIds.length === 9)).toBe(true)
    expect(pots[0].teamIds[0]).toBe("t1")
    expect(pots[3].teamIds.at(-1)).toBe("t36")
  })

  it("collapses to a single pot when pot count is 1", () => {
    const pots = buildSwissPots(makeTeams(10), 1)
    expect(pots).toHaveLength(1)
    expect(pots[0].teamIds).toHaveLength(10)
  })
})

// ─── buildSwissPairings ──────────────────────────────────────────

describe("buildSwissPairings", () => {
  it("gives every team exactly N distinct opponents", () => {
    const ids = makeTeams(20).map((t) => t.id)
    const pairs = buildSwissPairings([ids], 7, makeRng(1))!
    const map = opponentMap(pairs)

    expect(pairs).toHaveLength((20 * 7) / 2)
    for (const id of ids) {
      const opps = map.get(id)!
      expect(opps).toHaveLength(7)
      expect(new Set(opps).size).toBe(7)
      expect(opps).not.toContain(id)
    }
  })

  it("honours the per-pot quota (Champions League shape)", () => {
    const teams = makeTeams(36)
    const pots = buildSwissPots(teams, 4).map((p) => p.teamIds)
    const potOf = new Map<string, number>()
    pots.forEach((p, i) => p.forEach((id) => potOf.set(id, i)))

    const pairs = buildSwissPairings(pots, 8, makeRng(42))!
    const map = opponentMap(pairs)

    expect(pairs).toHaveLength((36 * 8) / 2)
    for (const [id, opps] of map) {
      expect(new Set(opps).size).toBe(8)
      const perPot = [0, 0, 0, 0]
      for (const o of opps) perPot[potOf.get(o)!]++
      expect(perPot).toEqual([2, 2, 2, 2])
      expect(opps).not.toContain(id)
    }
  })

  it("is deterministic per seed", () => {
    const ids = makeTeams(12).map((t) => t.id)
    const a = buildSwissPairings([ids], 5, makeRng(7))
    const b = buildSwissPairings([ids], 5, makeRng(7))
    const c = buildSwissPairings([ids], 5, makeRng(8))
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it("handles the minimum field (4 teams, 3 opponents = round robin)", () => {
    const ids = ["a", "b", "c", "d"]
    const pairs = buildSwissPairings([ids], 3, makeRng(3))!
    expect(pairs).toHaveLength(6)
    for (const opps of opponentMap(pairs).values()) expect(new Set(opps).size).toBe(3)
  })

  it("returns null for an impossible configuration", () => {
    expect(buildSwissPairings([["a", "b", "c"]], 3, makeRng(1))).toBeNull()
    expect(buildSwissPairings([], 4, makeRng(1))).toBeNull()
  })
})

// ─── assignHomeAway ──────────────────────────────────────────────

describe("assignHomeAway", () => {
  it("keeps every team within one home game of an even split", () => {
    const ids = makeTeams(20).map((t) => t.id)
    const pairs = buildSwissPairings([ids], 8, makeRng(11))!
    const directed = assignHomeAway(pairs, true, makeRng(11))

    const home = new Map<string, number>()
    const away = new Map<string, number>()
    for (const [h, a] of directed) {
      home.set(h, (home.get(h) ?? 0) + 1)
      away.set(a, (away.get(a) ?? 0) + 1)
    }
    for (const id of ids) {
      expect(Math.abs((home.get(id) ?? 0) - (away.get(id) ?? 0))).toBeLessThanOrEqual(1)
    }
  })

  it("preserves every pairing regardless of balancing", () => {
    const pairs: Array<[string, string]> = [
      ["a", "b"],
      ["c", "d"],
    ]
    const key = (p: Array<[string, string]>) => p.map(([x, y]) => [x, y].sort().join("-")).sort()
    expect(key(assignHomeAway(pairs, false, makeRng(1)))).toEqual(key(pairs))
    expect(key(assignHomeAway(pairs, true, makeRng(1)))).toEqual(key(pairs))
  })
})

// ─── matchdays ───────────────────────────────────────────────────

describe("buildSwissSchedule", () => {
  it("fills every matchday with the same number of matches", () => {
    const teams = makeTeams(36)
    const pots = buildSwissPots(teams, 4).map((p) => p.teamIds)
    const rounds = buildSwissSchedule(pots, 8, makeRng(5))!

    expect(rounds).toHaveLength(8)
    for (const round of rounds) expect(round).toHaveLength(18)
  })

  it("still balances a potless draw", () => {
    const ids = makeTeams(20).map((t) => t.id)
    const rounds = buildSwissSchedule([ids], 7, makeRng(3))!
    expect(rounds).toHaveLength(7)
    for (const round of rounds) expect(round).toHaveLength(10)
  })

  it("keeps the quotas the analytic graph guarantees", () => {
    const teams = makeTeams(36)
    const pots = buildSwissPots(teams, 4).map((p) => p.teamIds)
    const potOf = new Map<string, number>()
    pots.forEach((p, i) => p.forEach((id) => potOf.set(id, i)))

    const map = opponentMap(buildSwissSchedule(pots, 8, makeRng(21))!.flat())
    for (const opps of map.values()) {
      expect(new Set(opps).size).toBe(8)
      const perPot = [0, 0, 0, 0]
      for (const o of opps) perPot[potOf.get(o)!]++
      expect(perPot).toEqual([2, 2, 2, 2])
    }
  })

  it("spreads an odd field as evenly as it can", () => {
    // 21 teams cannot all play every matchday, so one sits out each round.
    const ids = makeTeams(21).map((t) => t.id)
    const rounds = buildSwissSchedule([ids], 6, makeRng(4))!
    const sizes = rounds.map((r) => r.length)
    expect(sizes.reduce((a, b) => a + b, 0)).toBe((21 * 6) / 2)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })
})

describe("buildSwissMatchdays", () => {
  it("never puts a team in the same matchday twice", () => {
    const ids = makeTeams(36).map((t) => t.id)
    const rounds = buildSwissSchedule([ids], 8, makeRng(5))!
    const matchdays = buildSwissMatchdays(rounds, 1)

    for (const md of matchdays) {
      const seen = new Set<string>()
      for (const m of md.matches) {
        expect(seen.has(m.homeId)).toBe(false)
        expect(seen.has(m.awayId)).toBe(false)
        seen.add(m.homeId)
        seen.add(m.awayId)
      }
    }
  })

  it("repeats every pairing once per leg with the sides flipped", () => {
    const ids = ["a", "b", "c", "d"]
    const rounds = buildSwissSchedule([ids], 3, makeRng(2))!
    const single = buildSwissMatchdays(rounds, 1)
    const double = buildSwissMatchdays(rounds, 2)

    expect(double).toHaveLength(single.length * 2)
    const counts = opponentMap(
      double.flatMap((md) => md.matches.map((m) => [m.homeId, m.awayId] as [string, string]))
    )
    for (const opps of counts.values()) {
      expect(opps).toHaveLength(6) // 3 opponents × 2 legs
      for (const o of new Set(opps)) {
        expect(opps.filter((x) => x === o)).toHaveLength(2)
      }
    }

    const homeFirstLeg = single.flatMap((md) => md.matches.map((m) => m.homeId))
    const homeSecondLeg = double
      .slice(single.length)
      .flatMap((md) => md.matches.map((m) => m.homeId))
    expect(homeSecondLeg).not.toEqual(homeFirstLeg)
  })

  it("gives every match a unique id", () => {
    const ids = makeTeams(12).map((t) => t.id)
    const rounds = buildSwissSchedule([ids], 5, makeRng(9))!
    const matchIds = buildSwissMatchdays(rounds, 2).flatMap((md) => md.matches.map((m) => m.id))
    expect(new Set(matchIds).size).toBe(matchIds.length)
  })
})

// ─── buildSwissLeague ────────────────────────────────────────────

describe("buildSwissLeague", () => {
  it("gives every matchday the same number of matches", () => {
    const bad: string[] = []
    for (const n of [8, 12, 16, 20, 24, 30, 36, 40]) {
      for (const opp of [3, 4, 5, 6, 8]) {
        for (const pots of [1, 2, 4]) {
          if (validateSwissConfig(n, opp, pots).length) continue
          const league = buildSwissLeague(makeTeams(n), {
            opponentCount: opp,
            potCount: pots,
            balanceHomeAway: true,
            seed: n * 100 + opp * 10 + pots,
            legMode: "single",
            drawType: pots > 1 ? "seeded" : "random",
          })
          const sizes = league.matchdays.map((md) => md.matches.length)
          const spread = Math.max(...sizes) - Math.min(...sizes)
          const total = sizes.reduce((a, b) => a + b, 0)
          // An odd field cannot seat everyone, so allow a single match of slack.
          if (spread > 1 || total !== (n * opp) / 2) {
            bad.push(`${n}/${opp}/${pots} → ${sizes.join(",")}`)
          }
        }
      }
    }
    expect(bad).toEqual([])
  })

  it("builds a playable league phase with zeroed standings", () => {
    const teams = makeTeams(36)
    const league = buildSwissLeague(teams, {
      opponentCount: 8,
      potCount: 4,
      balanceHomeAway: true,
      seed: 123,
      legMode: "single",
      drawType: "seeded",
    })

    expect(league.standings).toHaveLength(36)
    expect(league.standings.every((s) => s.played === 0 && s.pts === 0)).toBe(true)
    expect(league.matchdays.flatMap((md) => md.matches)).toHaveLength((36 * 8) / 2)
    for (const opps of leagueOpponentCounts(league).values()) {
      expect(new Set(opps).size).toBe(8)
    }
  })

  it("ignores pots when the draw type is random", () => {
    const teams = makeTeams(10)
    const league = buildSwissLeague(teams, {
      opponentCount: 5,
      potCount: 4, // would be invalid as pots; random collapses it to one
      balanceHomeAway: false,
      seed: 4,
      legMode: "single",
      drawType: "random",
    })
    expect(league.matchdays.flatMap((md) => md.matches)).toHaveLength((10 * 5) / 2)
  })

  it("falls back to a single pot when the pot config is unsatisfiable", () => {
    const teams = makeTeams(10)
    const league = buildSwissLeague(teams, {
      opponentCount: 5,
      potCount: 4,
      balanceHomeAway: false,
      seed: 4,
      legMode: "single",
      drawType: "seeded",
    })
    expect(league.matchdays.flatMap((md) => md.matches)).toHaveLength((10 * 5) / 2)
  })

  it("is reproducible from its seed", () => {
    const teams = makeTeams(16)
    const cfg = {
      opponentCount: 6,
      potCount: 2,
      balanceHomeAway: true,
      seed: 99,
      legMode: "single" as const,
      drawType: "seeded" as const,
    }
    const pairsOf = (l: League) =>
      l.matchdays.flatMap((md) => md.matches.map((m) => `${m.homeId}>${m.awayId}`))
    expect(pairsOf(buildSwissLeague(teams, cfg))).toEqual(pairsOf(buildSwissLeague(teams, cfg)))
    expect(pairsOf(buildSwissLeague(teams, { ...cfg, seed: 100 }))).not.toEqual(
      pairsOf(buildSwissLeague(teams, cfg))
    )
  })
})

describe("clampSwissOpponentCount", () => {
  it("leaves a valid count alone", () => {
    expect(clampSwissOpponentCount(36, 8)).toBe(8)
  })

  it("caps at the number of rivals available", () => {
    expect(clampSwissOpponentCount(6, 9)).toBe(5)
  })

  it("steps down to keep the total match slots even", () => {
    expect(clampSwissOpponentCount(5, 4)).toBe(4)
    expect(clampSwissOpponentCount(5, 3)).toBe(2)
  })

  it("keeps a shrinking field playable", () => {
    // 36 teams / 8 opponents, then the field drops to 6.
    const teams = makeTeams(6)
    const league = buildSwissLeague(teams, {
      opponentCount: 8,
      potCount: 4,
      balanceHomeAway: true,
      seed: 1,
      legMode: "single",
      drawType: "seeded",
    })
    expect(league.matchdays.flatMap((md) => md.matches)).toHaveLength((6 * 5) / 2)
  })
})

// ─── tournament integration ──────────────────────────────────────

describe("createSwissTournament", () => {
  const opts = {
    opponentCount: 8,
    potCount: 4,
    balanceHomeAway: true,
    seed: 2024,
    playoffEnabled: true,
    playoffQualifierCount: 24,
  }

  it("produces a swiss tournament wired for the league playoff", () => {
    const teams = makeTeams(36)
    const t = createSwissTournament("UCL", teams, 1, opts)

    expect(t.format).toBe("swiss")
    expect(t.teamIds).toHaveLength(36)
    expect(t.tiers).toBeUndefined()
    expect(t.rounds).toHaveLength(0)
    expect(t.swiss).toEqual({
      opponentCount: 8,
      potCount: 4,
      balanceHomeAway: true,
      seed: 2024,
    })
    expect(t.leaguePlayoff).toMatchObject({
      enabled: true,
      qualifierCount: 24,
      started: false,
    })
  })

  it("feeds the shared league standings pipeline", () => {
    const teams = makeTeams(36)
    const t = createSwissTournament("UCL", teams, 1, opts)
    simulateAllLeague(t, teams)
    recalcLeagueStandings(t.league!)

    expect(t.league!.standings).toHaveLength(36)
    for (const row of t.league!.standings) {
      expect(row.played).toBe(8)
      expect(row.won + row.drawn + row.lost).toBe(8)
      expect(row.gd).toBe(row.gf - row.ga)
    }
    const pts = t.league!.standings.map((s) => s.pts)
    expect([...pts].sort((a, b) => b - a)).toEqual(pts)
  })

  it("seeds a playoff bracket with byes for the top qualifiers", () => {
    const teams = makeTeams(36)
    const t = createSwissTournament("UCL", teams, 1, opts)
    simulateAllLeague(t, teams)

    const qualifiers = getLeaguePlayoffQualifierIds(t)
    expect(qualifiers).toHaveLength(24)
    expect(qualifiers).toEqual(t.league!.standings.slice(0, 24).map((s) => s.teamId))

    seedLeaguePlayoffBracket(t, teams, "seeded")
    expect(t.leaguePlayoff!.started).toBe(true)
    // 24 qualifiers → a bracket of 32 whose first round has 8 byes.
    expect(t.rounds[0].matches).toHaveLength(16)
    const byes = t.rounds[0].matches.filter((m) => !m.homeId || !m.awayId)
    expect(byes).toHaveLength(8)
    expect(t.rounds.map((r) => r.matches.length)).toEqual([16, 8, 4, 2, 1])
  })

  it("exposes every swiss match to the format-agnostic iterator", () => {
    const teams = makeTeams(12)
    const t = createSwissTournament("Mini", teams, 1, {
      opponentCount: 5,
      potCount: 1,
      balanceHomeAway: true,
      seed: 8,
      playoffQualifierCount: 4,
    })
    expect(allMatches(t)).toHaveLength((12 * 5) / 2)
    expect(allMatches(t).every((e) => e.source.kind === "league")).toBe(true)
  })
})

// ─── draw ceremony ───────────────────────────────────────────────

describe("swiss draw plan", () => {
  const swiss = { opponentCount: 8, potCount: 4, balanceHomeAway: true, seed: 77 }

  it("reveals each team once with its full opponent list", () => {
    const teams = makeTeams(36)
    const pots = buildPots({ kind: "swiss", teams, drawMode: "seeded", swiss })
    const plan = swissPlan(pots, 8, 77)

    expect(pots).toHaveLength(4)
    expect(plan.sequence).toHaveLength(36)
    expect(new Set(plan.sequence.map((s) => s.teamId)).size).toBe(36)
    for (const step of plan.sequence) {
      expect(step.opponentIds).toHaveLength(8)
      expect(step.opponentIds).not.toContain(step.teamId)
    }
  })

  it("matches the fixture the same seed commits", () => {
    const teams = makeTeams(36)
    const pots = buildPots({ kind: "swiss", teams, drawMode: "seeded", swiss })
    const plan = swissPlan(pots, 8, 77)
    const league = buildSwissLeague(teams, { ...swiss, legMode: "single", drawType: "seeded" })
    const actual = leagueOpponentCounts(league)

    for (const step of plan.sequence) {
      expect([...step.opponentIds!].sort()).toEqual([...actual.get(step.teamId)!].sort())
    }
  })

  it("uses one pot for a random draw", () => {
    const teams = makeTeams(36)
    const pots = buildPots({ kind: "swiss", teams, drawMode: "random", swiss })
    expect(pots).toHaveLength(1)
    expect(pots[0].teamIds).toHaveLength(36)
  })
})
