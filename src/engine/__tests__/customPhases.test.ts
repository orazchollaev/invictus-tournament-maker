// engine/__tests__/customPhases.test.ts
import { describe, expect, it } from "vitest"
import type { PhaseEdge, Tournament, TournamentPhase } from "@/modules/tournament/types"
import {
  PHASE_MIN_TEAMS,
  advancablePhases,
  buildPhase,
  canAdvanceTo,
  clearPhaseResults,
  customWinnerId,
  edgeSize,
  entryPhases,
  entryPhaseDrawOrder,
  incomingQualifierIds,
  phaseDestinations,
  groupOutputCount,
  groupQualifierIds,
  isCustomFinished,
  isPhaseComplete,
  phaseIntakeSizes,
  phaseOfMatch,
  phaseStandingIds,
  recalcPhase,
  resetPhase,
  resolvePhaseQualifiers,
  seedPhaseFrom,
  terminalPhases,
  topoOrder,
  validatePhaseGraph,
} from "../customPhases"
import { createPhase, createPhaseEdge, createCustomTournament, clonePhaseGraph } from "../phaseFactory"
import { simulateKnockoutAll } from "../knockoutOps"
import { getLoserId, getWinnerId } from "../bracket"
import { makeTeams } from "./helpers"

/** The canonical three-phase chain: groups feed a table, the table feeds a cup. */
function chain(teamCount = 16) {
  const teams = makeTeams(teamCount)
  const group = createPhase("group", { name: "Qualifying", teamCount })
  const league = createPhase("league", { name: "Main Round", teamCount: 8 })
  const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
  const edges = [
    createPhaseEdge(group.id, league.id, 1, 8),
    createPhaseEdge(league.id, cup.id, 1, 4),
  ]
  return { teams, group, league, cup, phases: [group, league, cup], edges }
}

function codes(errors: { code: string }[]): string[] {
  return errors.map((e) => e.code)
}

describe("graph shape", () => {
  it("finds the single entry and terminal phases", () => {
    const { phases, edges, group, cup } = chain()
    expect(entryPhases(phases, edges).map((p) => p.id)).toEqual([group.id])
    expect(terminalPhases(phases, edges).map((p) => p.id)).toEqual([cup.id])
  })

  it("orders a linear chain by dependency", () => {
    const { phases, edges, group, league, cup } = chain()
    const order = topoOrder(phases, edges)
    expect(order?.map((p) => p.id)).toEqual([group.id, league.id, cup.id])
  })

  it("orders a diamond with both branches after their shared source", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cupA = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const cupB = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const phases = [cupA, cupB, table]
    const edges = [createPhaseEdge(table.id, cupA.id, 1, 4), createPhaseEdge(table.id, cupB.id, 5, 8)]
    const order = topoOrder(phases, edges)
    expect(order?.[0].id).toBe(table.id)
    expect(order?.slice(1).map((p) => p.id).sort()).toEqual([cupA.id, cupB.id].sort())
  })

  it("returns null for a cycle", () => {
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const edges = [createPhaseEdge(a.id, b.id, 1, 2), createPhaseEdge(b.id, a.id, 1, 2)]
    expect(topoOrder([a, b], edges)).toBeNull()
  })

  it("ignores edges pointing at phases that are not in the list", () => {
    const a = createPhase("league", { name: "A" })
    const edges = [createPhaseEdge(a.id, "ghost", 1, 2)]
    expect(topoOrder([a], edges)?.map((p) => p.id)).toEqual([a.id])
  })

  it("sizes the intake: the whole field at the entry, the edge ranges after it", () => {
    const { phases, edges, group, league, cup } = chain(16)
    const sizes = phaseIntakeSizes(phases, edges, 16)
    expect(sizes?.get(group.id)).toBe(16)
    expect(sizes?.get(league.id)).toBe(8)
    expect(sizes?.get(cup.id)).toBe(4)
  })

  it("sums several incoming edges into one intake", () => {
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const cup = createPhase("knockout", { name: "Cup", isFinal: true })
    // Two sources, but `a` is the only entry; b is fed from a.
    const edges = [
      createPhaseEdge(a.id, b.id, 1, 4),
      createPhaseEdge(a.id, cup.id, 5, 6),
      createPhaseEdge(b.id, cup.id, 1, 2),
    ]
    const sizes = phaseIntakeSizes([a, b, cup], edges, 8)
    expect(sizes?.get(cup.id)).toBe(4)
  })

  it("counts an inclusive rank range", () => {
    expect(edgeSize({ id: "e", fromPhaseId: "a", toPhaseId: "b", fromRank: 1, toRank: 2 })).toBe(2)
    expect(edgeSize({ id: "e", fromPhaseId: "a", toPhaseId: "b", fromRank: 3, toRank: 3 })).toBe(1)
  })
})

describe("validatePhaseGraph", () => {
  it("accepts the canonical chain", () => {
    const { phases, edges } = chain(16)
    expect(validatePhaseGraph(phases, edges, 16)).toEqual([])
  })

  it("rejects an empty graph", () => {
    expect(codes(validatePhaseGraph([], [], 16))).toEqual(["noPhases"])
  })

  it("rejects two phases with no incoming edge", () => {
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const cup = createPhase("knockout", { name: "Cup", isFinal: true })
    const edges = [createPhaseEdge(a.id, cup.id, 1, 2), createPhaseEdge(b.id, cup.id, 1, 2)]
    expect(codes(validatePhaseGraph([a, b, cup], edges, 16))).toContain("multipleEntry")
  })

  it("rejects a cycle and stops there", () => {
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const edges = [createPhaseEdge(a.id, b.id, 1, 2), createPhaseEdge(b.id, a.id, 1, 2)]
    expect(codes(validatePhaseGraph([a, b], edges, 16))).toContain("cycle")
  })

  it("rejects a disconnected phase as a second entry", () => {
    // An island has no incoming edge, which is exactly what "entry" means — so
    // the single-entry rule is what catches it, and no separate reachability
    // check is needed. Without a cycle, one entry always reaches everything.
    const { phases, edges, group, league, cup } = chain(16)
    const island = createPhase("league", { name: "Island", teamCount: 4 })
    const errors = validatePhaseGraph([...phases, island], edges, 16)
    expect(errors.some((e) => e.code === "multipleEntry" && e.phaseId === island.id)).toBe(true)
    // The three phases of the chain are otherwise untouched.
    expect(errors.filter((e) => e.phaseId === league.id)).toEqual([])
    expect(errors.filter((e) => e.phaseId === cup.id)).toEqual([])
    expect(errors.filter((e) => e.phaseId === group.id).map((e) => e.code)).toEqual([
      "multipleEntry",
    ])
  })

  it("rejects an outgoing edge from a knockout", () => {
    const { phases, edges, cup } = chain(16)
    const extra = createPhase("league", { name: "After", teamCount: 2 })
    const withExtra = [...phases, extra]
    const withEdge = [...edges, createPhaseEdge(cup.id, extra.id, 1, 2)]
    const errors = validatePhaseGraph(withExtra, withEdge, 16)
    expect(errors.some((e) => e.code === "knockoutHasOutput" && e.phaseId === cup.id)).toBe(true)
  })

  it("requires exactly one final phase, and it must be terminal", () => {
    const { phases, edges, group, league, cup } = chain(16)
    const noFinal = phases.map((p) => ({ ...p, isFinal: false }))
    expect(codes(validatePhaseGraph(noFinal, edges, 16))).toContain("noFinal")

    const twoFinals = [group, { ...league, isFinal: true }, cup]
    const errors = validatePhaseGraph(twoFinals, edges, 16)
    expect(codes(errors)).toContain("multipleFinal")
    expect(errors.some((e) => e.code === "finalNotTerminal" && e.phaseId === league.id)).toBe(true)
  })

  it("rejects a rank range the source cannot fill", () => {
    const { phases, group, league, cup } = chain(16)
    const edges = [
      createPhaseEdge(group.id, league.id, 1, 8),
      createPhaseEdge(league.id, cup.id, 1, 20), // the table only holds 8
    ]
    const errors = validatePhaseGraph(phases, edges, 16)
    const hit = errors.find((e) => e.code === "edgeRankRange")
    expect(hit).toBeDefined()
    expect(hit?.params).toMatchObject({ from: 1, to: 20, available: 8 })
  })

  it("rejects an inverted rank range", () => {
    const { phases, group, league, cup } = chain(16)
    const edges = [
      createPhaseEdge(group.id, league.id, 1, 8),
      createPhaseEdge(league.id, cup.id, 4, 2),
    ]
    expect(codes(validatePhaseGraph(phases, edges, 16))).toContain("edgeRankRange")
  })

  it("ignores the range on an edge out of a group — its own config decides", () => {
    const { phases, group, league, cup } = chain(16)
    // Nonsense range, and no complaint: the group's qualifiers are what travel.
    const edges = [
      createPhaseEdge(group.id, league.id, 99, 1),
      createPhaseEdge(league.id, cup.id, 1, 4),
    ]
    expect(validatePhaseGraph(phases, edges, 16)).toEqual([])
  })

  it("rejects a group phase with two outgoing connections", () => {
    const { phases, group, league, cup } = chain(16)
    const plate = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const edges = [
      createPhaseEdge(group.id, league.id, 1, 8),
      createPhaseEdge(group.id, plate.id, 1, 4),
      createPhaseEdge(league.id, cup.id, 1, 4),
    ]
    const errors = validatePhaseGraph([...phases, plate], edges, 16)
    expect(errors.some((e) => e.code === "groupSingleOutput" && e.phaseId === group.id)).toBe(true)
  })

  it("allows a table phase to split two ways, unlike a group", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cupA = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const cupB = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const edges = [
      createPhaseEdge(table.id, cupA.id, 1, 4),
      createPhaseEdge(table.id, cupB.id, 5, 8),
    ]
    expect(validatePhaseGraph([table, cupA, cupB], edges, 8)).toEqual([])
  })

  it("rejects more qualifiers per group than a group holds", () => {
    const { phases, group, edges } = chain(16)
    if (group.config.kind === "group") group.config.group.qualifiersPerGroup = 9
    const errors = validatePhaseGraph(phases, edges, 16)
    const hit = errors.find((e) => e.code === "groupQualifiers")
    expect(hit?.phaseId).toBe(group.id)
    // Four groups of four, so four through at most.
    expect(hit?.params).toMatchObject({ qualifiers: 9, max: 4 })
  })

  it("rejects more wildcards than there are groups", () => {
    const { phases, group, edges } = chain(16)
    if (group.config.kind === "group") group.config.group.wildcardCount = 9
    const errors = validatePhaseGraph(phases, edges, 16)
    const hit = errors.find((e) => e.code === "groupWildcards")
    expect(hit?.phaseId).toBe(group.id)
    expect(hit?.params).toMatchObject({ wildcards: 9, max: 4 })
  })

  it("rejects two outgoing edges claiming the same places", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cupA = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const cupB = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const edges = [
      createPhaseEdge(table.id, cupA.id, 1, 4),
      createPhaseEdge(table.id, cupB.id, 3, 6), // overlaps 3-4
    ]
    expect(codes(validatePhaseGraph([table, cupA, cupB], edges, 8))).toContain("rangeOverlap")
  })

  it("accepts two outgoing edges that split the table cleanly", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cupA = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const cupB = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const edges = [
      createPhaseEdge(table.id, cupA.id, 1, 4),
      createPhaseEdge(table.id, cupB.id, 5, 8),
    ]
    expect(validatePhaseGraph([table, cupA, cupB], edges, 8)).toEqual([])
  })

  it("rejects a phase too small for its kind", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const swiss = createPhase("swiss", { name: "Swiss", teamCount: 8, isFinal: true })
    const edges = [createPhaseEdge(table.id, swiss.id, 1, 2)] // swiss needs more
    const errors = validatePhaseGraph([table, swiss], edges, 8)
    const hit = errors.find((e) => e.code === "phaseTooSmall")
    expect(hit?.phaseId).toBe(swiss.id)
    expect(hit?.params).toMatchObject({ intake: 2, min: PHASE_MIN_TEAMS.swiss })
  })

  it("rejects groups that would hold fewer than two teams each", () => {
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") group.config.group.groupCount = 8
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const edges = [createPhaseEdge(group.id, cup.id, 1, 4)]
    const errors = validatePhaseGraph([group, cup], edges, 8)
    expect(errors.some((e) => e.code === "groupsTooSmall" && e.phaseId === group.id)).toBe(true)
  })

  it("rejects a swiss opponent count the field cannot support", () => {
    const swiss = createPhase("swiss", { name: "Swiss", teamCount: 8 })
    if (swiss.config.kind === "swiss") swiss.config.swiss.opponentCount = 12
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const edges = [createPhaseEdge(swiss.id, cup.id, 1, 4)]
    expect(codes(validatePhaseGraph([swiss, cup], edges, 8))).toContain("swissOpponents")
  })

  it("rejects an unnamed phase", () => {
    const { phases, edges } = chain(16)
    const renamed = [{ ...phases[0], name: "   " }, ...phases.slice(1)]
    expect(codes(validatePhaseGraph(renamed, edges, 16))).toContain("unnamed")
  })

  it("rejects an edge whose ends are gone, and a self edge", () => {
    const a = createPhase("league", { name: "A", isFinal: true })
    const dangling: PhaseEdge = {
      id: "e1",
      fromPhaseId: a.id,
      toPhaseId: "ghost",
      fromRank: 1,
      toRank: 2,
    }
    const self: PhaseEdge = {
      id: "e2",
      fromPhaseId: a.id,
      toPhaseId: a.id,
      fromRank: 1,
      toRank: 2,
    }
    const errors = codes(validatePhaseGraph([a], [dangling, self], 8))
    expect(errors).toContain("danglingEdge")
    expect(errors).toContain("selfEdge")
  })
})

describe("buildPhase", () => {
  it("deals a group phase into groups and builds every fixture", () => {
    const teams = makeTeams(16)
    const phase = createPhase("group", { name: "Groups", teamCount: 16 })
    if (phase.config.kind === "group") phase.config.group.groupCount = 4
    buildPhase(phase, teams.map((t) => t.id), teams)

    expect(phase.status).toBe("active")
    expect(phase.groups).toHaveLength(4)
    expect(phase.groups?.every((g) => g.teamIds.length === 4)).toBe(true)
    // Round robin of 4 = 6 matches, standings seeded at zero.
    expect(phase.groups?.every((g) => g.matches.length === 6)).toBe(true)
    expect(phase.groups?.every((g) => g.standings.every((s) => s.played === 0))).toBe(true)
    // Seeded deal spreads the arrival order one per group.
    expect(phase.groups?.map((g) => g.teamIds[0])).toEqual(["t1", "t2", "t3", "t4"])
    expect(phase.league).toBeUndefined()
    expect(phase.rounds).toBeUndefined()
  })

  it("builds a league phase as a full round robin", () => {
    const teams = makeTeams(6)
    const phase = createPhase("league", { name: "Table" })
    buildPhase(phase, teams.map((t) => t.id), teams)
    expect(phase.league?.matchdays).toHaveLength(5)
    expect(phase.league?.standings).toHaveLength(6)
    expect(phase.groups).toBeUndefined()
  })

  it("builds a swiss phase with each team facing the configured opponents", () => {
    const teams = makeTeams(8)
    const phase = createPhase("swiss", { name: "Swiss", teamCount: 8 })
    if (phase.config.kind === "swiss") phase.config.swiss.opponentCount = 4
    buildPhase(phase, teams.map((t) => t.id), teams)

    const played = new Map<string, number>()
    for (const md of phase.league?.matchdays ?? []) {
      for (const m of md.matches) {
        played.set(m.homeId, (played.get(m.homeId) ?? 0) + 1)
        played.set(m.awayId, (played.get(m.awayId) ?? 0) + 1)
      }
    }
    expect([...played.values()].every((n) => n === 4)).toBe(true)
  })

  it("builds a knockout phase sized to the next power of two, spreading byes", () => {
    const teams = makeTeams(6)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 6 })
    buildPhase(phase, teams.slice(0, 6).map((t) => t.id), teams)

    expect(phase.rounds).toHaveLength(3) // 8-team bracket: QF, SF, F
    expect(phase.rounds?.[0].matches).toHaveLength(4)
    // Two byes, already resolved so the winner is through.
    const byes = phase.rounds?.[0].matches.filter((m) => !m.homeId || !m.awayId) ?? []
    expect(byes).toHaveLength(2)
    expect(byes.every((m) => m.result !== null)).toBe(true)
    // Byes go to the top ranks of the arriving order.
    const byeTeams = byes.map((m) => m.homeId ?? m.awayId)
    expect(byeTeams).toContain("t1")
    expect(byeTeams).toContain("t2")
  })

  it("adds a third-place tie only when the knockout config asks for one", () => {
    const teams = makeTeams(4)
    const ids = teams.map((t) => t.id)
    const plain = createPhase("knockout", { name: "Cup", teamCount: 4 })
    buildPhase(plain, ids, teams)
    expect(plain.thirdPlaceMatch).toBeUndefined()

    const withThird = createPhase("knockout", { name: "Cup", teamCount: 4 })
    if (withThird.config.kind === "knockout") withThird.config.knockout.hasThirdPlace = true
    buildPhase(withThird, ids, teams)
    expect(withThird.thirdPlaceMatch).toBeDefined()
  })

  it("marks double-leg ties when the knockout config says so", () => {
    const teams = makeTeams(4)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 4 })
    if (phase.config.kind === "knockout") {
      phase.config.knockout.roundLegModes = { semifinal: "double" }
    }
    buildPhase(phase, teams.map((t) => t.id), teams)
    expect(phase.rounds?.[0].matches.every((m) => m.leg2Result === null)).toBe(true)
    expect(phase.rounds?.[1].matches.every((m) => m.leg2Result === undefined)).toBe(true)
  })

  it("clearPhaseResults keeps the draw and drops the scores", () => {
    const teams = makeTeams(8)
    const phase = createPhase("group", { name: "Groups", teamCount: 8 })
    if (phase.config.kind === "group") phase.config.group.groupCount = 2
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams
    )
    const drawn = phase.groups!.map((g) => [...g.teamIds])
    for (const g of phase.groups!) {
      for (const m of g.matches) m.result = { home: 2, away: 1 }
    }
    recalcPhase(phase)

    clearPhaseResults(phase)

    expect(phase.groups!.map((g) => g.teamIds)).toEqual(drawn)
    expect(phase.groups!.every((g) => g.matches.every((m) => m.result === null))).toBe(true)
    expect(phase.groups!.every((g) => g.standings.every((r) => r.played === 0))).toBe(true)
    expect(phase.status).toBe("active")
  })

  it("clearPhaseResults keeps a knockout's round one and clears what was earned", () => {
    const teams = makeTeams(6)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 6 })
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams
    )
    const round1 = phase.rounds![0].matches.map((m) => [m.homeId, m.awayId])
    simulateKnockoutAll({ rounds: phase.rounds! }, teams, {})

    clearPhaseResults(phase)

    // The drawn round stands; every later round goes back to empty slots.
    expect(phase.rounds![0].matches.map((m) => [m.homeId, m.awayId])).toEqual(round1)
    for (let r = 1; r < phase.rounds!.length; r++) {
      expect(phase.rounds![r].matches.every((m) => !m.homeId && !m.awayId && !m.result)).toBe(true)
    }
    // Byes were never a result the user entered, so they come straight back.
    const byes = phase.rounds![0].matches.filter((m) => !m.homeId || !m.awayId)
    expect(byes).toHaveLength(2)
    expect(byes.every((m) => m.result !== null)).toBe(true)
    // Real ties are unplayed again.
    expect(
      phase.rounds![0].matches.filter((m) => m.homeId && m.awayId).every((m) => m.result === null)
    ).toBe(true)
  })

  it("resetPhase empties a built phase back to pending", () => {
    const teams = makeTeams(6)
    const phase = createPhase("league", { name: "Table" })
    buildPhase(phase, teams.map((t) => t.id), teams)
    resetPhase(phase)
    expect(phase.status).toBe("pending")
    expect(phase.teamIds).toEqual([])
    expect(phase.league).toBeUndefined()
  })
})

describe("phaseStandingIds", () => {
  it("ranks a group phase by finishing place first, then by record", () => {
    const teams = makeTeams(8)
    const phase = createPhase("group", { name: "Groups", teamCount: 8 })
    if (phase.config.kind === "group") phase.config.group.groupCount = 2
    buildPhase(phase, teams.map((t) => t.id), teams)

    // Strongest team always wins, so each group's table follows power order.
    const byId = new Map(teams.map((t) => [t.id, t]))
    for (const group of phase.groups ?? []) {
      for (const m of group.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 2, away: 0 } : { home: 0, away: 2 }
      }
    }
    recalcPhase(phase)

    const order = phaseStandingIds(phase)
    const winners = phase.groups!.map((g) => g.standings[0].teamId)
    const runnersUp = phase.groups!.map((g) => g.standings[1].teamId)
    // Both group winners come before either runner-up.
    expect(order.slice(0, 2).sort()).toEqual(winners.sort())
    expect(order.slice(2, 4).sort()).toEqual(runnersUp.sort())
    expect(order).toHaveLength(8)
  })

  it("ranks a league phase by its table", () => {
    const teams = makeTeams(4)
    const phase = createPhase("league", { name: "Table" })
    buildPhase(phase, teams.map((t) => t.id), teams)
    const byId = new Map(teams.map((t) => [t.id, t]))
    for (const md of phase.league!.matchdays) {
      for (const m of md.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 1, away: 0 } : { home: 0, away: 1 }
      }
    }
    recalcPhase(phase)
    expect(phaseStandingIds(phase)).toEqual(["t1", "t2", "t3", "t4"])
  })

  it("ranks a knockout by how far each side got", () => {
    const teams = makeTeams(4)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 4 })
    buildPhase(phase, teams.map((t) => t.id), teams)
    simulateKnockoutAll(phase as unknown as { rounds: NonNullable<typeof phase.rounds> }, teams, {})

    const order = phaseStandingIds(phase)
    expect(order).toHaveLength(4)
    const finalMatch = phase.rounds![phase.rounds!.length - 1].matches[0]
    // The winner leads, the beaten finalist is second, the semifinal losers
    // follow. Asked through getWinnerId rather than comparing the scoreline: a
    // final can end level and be decided on penalties, and a raw comparison
    // then names the wrong side — which is exactly how this test went flaky.
    expect(order[0]).toBe(getWinnerId(finalMatch))
    expect(order[1]).toBe(getLoserId(finalMatch))
    expect(new Set(order).size).toBe(4)
  })

  it("is empty for a phase that has not been built", () => {
    const phase = createPhase("league", { name: "Table" })
    expect(phaseStandingIds(phase)).toEqual([])
  })
})

describe("group qualification", () => {
  /** A played group phase where the stronger team always wins. */
  function playedGroups(groupCount: number, perGroup: number, wildcards: number, teamCount = 16) {
    const teams = makeTeams(teamCount)
    const phase = createPhase("group", { name: "Groups", teamCount })
    if (phase.config.kind === "group") {
      phase.config.group.groupCount = groupCount
      phase.config.group.qualifiersPerGroup = perGroup
      phase.config.group.wildcardCount = wildcards
    }
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams
    )
    const byId = new Map(teams.map((t) => [t.id, t]))
    for (const group of phase.groups ?? []) {
      for (const m of group.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 2, away: 0 } : { home: 0, away: 2 }
      }
    }
    recalcPhase(phase)
    return { phase, teams }
  }

  it("counts the automatic spots plus the wildcards", () => {
    const { phase } = playedGroups(4, 2, 2)
    expect(groupOutputCount(phase, 16)).toBe(10)
  })

  it("drops wildcards when every place already qualifies", () => {
    // Four groups of four, all four through — there is nobody left to be the
    // best of, so the wildcards are not counted.
    const { phase } = playedGroups(4, 4, 2)
    expect(groupOutputCount(phase, 16)).toBe(16)
  })

  it("clamps qualifiers to the smallest group", () => {
    const { phase } = playedGroups(4, 9, 0)
    expect(groupOutputCount(phase, 16)).toBe(16)
  })

  it("takes the top N of every group, winners before runners-up", () => {
    const { phase } = playedGroups(4, 2, 0)
    const ids = groupQualifierIds(phase)
    expect(ids).toHaveLength(8)

    const winners = phase.groups!.map((g) => g.standings[0].teamId)
    const runnersUp = phase.groups!.map((g) => g.standings[1].teamId)
    expect(ids.slice(0, 4).sort()).toEqual(winners.sort())
    expect(ids.slice(4).sort()).toEqual(runnersUp.sort())
    // Nobody who finished third is in there.
    const thirds = phase.groups!.map((g) => g.standings[2].teamId)
    expect(ids.filter((id) => thirds.includes(id))).toEqual([])
  })

  it("adds the best of the teams one place below as wildcards", () => {
    const { phase } = playedGroups(4, 2, 2)
    const ids = groupQualifierIds(phase)
    expect(ids).toHaveLength(10)

    const thirds = phase.groups!.map((g) => g.standings[2])
    const bestTwoThirds = [...thirds]
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .slice(0, 2)
      .map((s) => s.teamId)
    // The wildcards come last, after every automatic qualifier.
    expect(ids.slice(8).sort()).toEqual(bestTwoThirds.sort())
    expect(new Set(ids).size).toBe(10)
  })

  it("is what the outgoing edge carries, whatever range it holds", () => {
    const { phase } = playedGroups(4, 2, 2)
    const edge = createPhaseEdge(phase.id, "next", 3, 4)
    expect(resolvePhaseQualifiers(phase, edge)).toEqual(groupQualifierIds(phase))
  })

  it("sizes the next phase from the qualifiers, not from a range", () => {
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") {
      group.config.group.groupCount = 4
      group.config.group.qualifiersPerGroup = 2
      group.config.group.wildcardCount = 2
    }
    const cup = createPhase("knockout", { name: "Cup", teamCount: 10, isFinal: true })
    const edges = [createPhaseEdge(group.id, cup.id, 1, 2)]
    const sizes = phaseIntakeSizes([group, cup], edges, 16)
    expect(sizes?.get(cup.id)).toBe(10)
  })

  it("seeds the next phase with exactly those teams", () => {
    const teams = makeTeams(16)
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") {
      group.config.group.groupCount = 4
      group.config.group.qualifiersPerGroup = 2
      group.config.group.wildcardCount = 2
    }
    const cup = createPhase("knockout", { name: "Cup", teamCount: 10, isFinal: true })
    const t = createCustomTournament("Custom", teams, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 2)],
    })!

    const groupPhase = t.phases!.find((p) => p.id === group.id)!
    const byId = new Map(teams.map((x) => [x.id, x]))
    for (const g of groupPhase.groups ?? []) {
      for (const m of g.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 2, away: 0 } : { home: 0, away: 2 }
      }
    }
    recalcPhase(groupPhase)

    expect(seedPhaseFrom(t, cup.id, teams)).toBe(true)
    const cupPhase = t.phases!.find((p) => p.id === cup.id)!
    expect(cupPhase.teamIds).toEqual(groupQualifierIds(groupPhase))
    expect(cupPhase.teamIds).toHaveLength(10)
    // 10 into a 16-slot bracket: six byes, and they go to the best-placed.
    expect(cupPhase.rounds?.[0].matches).toHaveLength(8)
  })
})

describe("resolvePhaseQualifiers", () => {
  function playedTable(): TournamentPhase {
    const teams = makeTeams(8)
    const phase = createPhase("league", { name: "Table" })
    buildPhase(phase, teams.map((t) => t.id), teams)
    const byId = new Map(teams.map((t) => [t.id, t]))
    for (const md of phase.league!.matchdays) {
      for (const m of md.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 1, away: 0 } : { home: 0, away: 1 }
      }
    }
    recalcPhase(phase)
    return phase
  }

  it("takes the named inclusive slice of the table", () => {
    const phase = playedTable()
    expect(resolvePhaseQualifiers(phase, createPhaseEdge(phase.id, "x", 1, 2))).toEqual(["t1", "t2"])
    expect(resolvePhaseQualifiers(phase, createPhaseEdge(phase.id, "x", 3, 3))).toEqual(["t3"])
  })

  it("splits one table two ways without overlap", () => {
    const phase = playedTable()
    const top = resolvePhaseQualifiers(phase, createPhaseEdge(phase.id, "cup", 1, 4))
    const rest = resolvePhaseQualifiers(phase, createPhaseEdge(phase.id, "plate", 5, 8))
    expect(top).toEqual(["t1", "t2", "t3", "t4"])
    expect(rest).toEqual(["t5", "t6", "t7", "t8"])
    expect(top.filter((id) => rest.includes(id))).toEqual([])
  })

  it("clamps a range that runs past the end of the table", () => {
    const phase = playedTable()
    expect(resolvePhaseQualifiers(phase, createPhaseEdge(phase.id, "x", 7, 99))).toEqual([
      "t7",
      "t8",
    ])
  })
})

describe("advancing the graph", () => {
  function playPhase(phase: TournamentPhase, teams: ReturnType<typeof makeTeams>) {
    const byId = new Map(teams.map((t) => [t.id, t]))
    const decide = (homeId: string | null, awayId: string | null) => {
      const home = homeId ? byId.get(homeId) : undefined
      const away = awayId ? byId.get(awayId) : undefined
      if (!home || !away) return null
      return home.power > away.power ? { home: 2, away: 0 } : { home: 0, away: 2 }
    }
    for (const group of phase.groups ?? []) {
      for (const m of group.matches) m.result = decide(m.homeId, m.awayId)
    }
    for (const md of phase.league?.matchdays ?? []) {
      for (const m of md.matches) m.result = decide(m.homeId, m.awayId)
    }
    if (phase.rounds) {
      simulateKnockoutAll({ rounds: phase.rounds }, teams, {})
    }
    recalcPhase(phase)
  }

  it("refuses to advance before the source phase is finished", () => {
    const { teams, phases, edges, league } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!
    expect(canAdvanceTo(t, league.id)).toBe(false)
    expect(seedPhaseFrom(t, league.id, teams)).toBe(false)
    expect(t.phases!.find((p) => p.id === league.id)!.status).toBe("pending")
  })

  it("advances once the source is finished, and marks the source done", () => {
    const { teams, phases, edges, group, league } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!
    const groupPhase = t.phases!.find((p) => p.id === group.id)!
    playPhase(groupPhase, teams)

    expect(isPhaseComplete(groupPhase)).toBe(true)
    expect(canAdvanceTo(t, league.id)).toBe(true)
    expect(advancablePhases(t).map((p) => p.id)).toEqual([league.id])

    expect(seedPhaseFrom(t, league.id, teams)).toBe(true)
    const leaguePhase = t.phases!.find((p) => p.id === league.id)!
    expect(leaguePhase.status).toBe("active")
    expect(leaguePhase.teamIds).toHaveLength(8)
    expect(groupPhase.status).toBe("done")
    // The eight who advanced are exactly the eight the edge named.
    expect(leaguePhase.teamIds).toEqual(phaseStandingIds(groupPhase).slice(0, 8))
  })

  it("merges two incoming edges in the author's edge order", () => {
    const teams = makeTeams(8)
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const mid = createPhase("league", { name: "Mid", teamCount: 4 })
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const edges = [
      createPhaseEdge(table.id, mid.id, 1, 4),
      createPhaseEdge(table.id, cup.id, 5, 6),
      createPhaseEdge(mid.id, cup.id, 1, 2),
    ]
    const t = createCustomTournament("Split", teams, {
      phases: [table, mid, cup],
      phaseEdges: edges,
    })!

    playPhase(t.phases!.find((p) => p.id === table.id)!, teams)
    expect(seedPhaseFrom(t, mid.id, teams)).toBe(true)
    playPhase(t.phases!.find((p) => p.id === mid.id)!, teams)

    expect(seedPhaseFrom(t, cup.id, teams)).toBe(true)
    const cupPhase = t.phases!.find((p) => p.id === cup.id)!
    expect(cupPhase.teamIds).toHaveLength(4)
    // Table's 5-6 arrive first because that edge was declared first.
    expect(cupPhase.teamIds.slice(0, 2)).toEqual(["t5", "t6"])
  })

  it("crowns the winner of the marked final phase, and only then", () => {
    const { teams, phases, edges, group, league, cup } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!

    playPhase(t.phases!.find((p) => p.id === group.id)!, teams)
    expect(customWinnerId(t)).toBeNull()
    seedPhaseFrom(t, league.id, teams)
    playPhase(t.phases!.find((p) => p.id === league.id)!, teams)
    expect(customWinnerId(t)).toBeNull()
    expect(isCustomFinished(t)).toBe(false)

    seedPhaseFrom(t, cup.id, teams)
    playPhase(t.phases!.find((p) => p.id === cup.id)!, teams)

    const winner = customWinnerId(t)
    expect(winner).toBeTruthy()
    expect(winner).toBe(phaseStandingIds(t.phases!.find((p) => p.id === cup.id)!)[0])
    t.winnerId = winner
    expect(isCustomFinished(t)).toBe(true)
  })

  it("crowns the league table's leader when the final phase is a table", () => {
    const teams = makeTeams(8)
    const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const t = createCustomTournament("League only", teams, { phases: [table], phaseEdges: [] })!
    playPhase(t.phases![0], teams)
    expect(customWinnerId(t)).toBe("t1")
  })

  it("plays a whole group -> league -> knockout graph down to one winner", () => {
    const { teams, phases, edges, group, league, cup } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!

    for (const id of [group.id, league.id, cup.id]) {
      if (id !== group.id) expect(seedPhaseFrom(t, id, teams)).toBe(true)
      playPhase(t.phases!.find((p) => p.id === id)!, teams)
    }

    expect(t.phases!.every((p) => isPhaseComplete(p))).toBe(true)
    expect(customWinnerId(t)).toBeTruthy()
  })
})

describe("drawn orders", () => {
  it("deals a group phase in the order the draw produced", () => {
    const teams = makeTeams(8)
    const phase = createPhase("group", { name: "Groups", teamCount: 8 })
    if (phase.config.kind === "group") {
      phase.config.group.groupCount = 2
      // Random seeding, so only the drawn order can explain the result.
      phase.config.group.seedMode = "random"
    }
    const drawn = ["t5", "t1", "t8", "t3", "t6", "t2", "t7", "t4"]
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams,
      drawn
    )

    // Dealt round-robin: even positions to group A, odd to group B.
    expect(phase.groups![0].teamIds).toEqual(["t5", "t8", "t6", "t7"])
    expect(phase.groups![1].teamIds).toEqual(["t1", "t3", "t2", "t4"])
  })

  it("packs a knockout phase from the drawn order, byes first", () => {
    const teams = makeTeams(6)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 6 })
    // Bye-front, then home/away pairs — the layout every draw in the app emits.
    const drawn = ["t1", "t2", "t3", "t6", "t4", "t5"]
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams,
      drawn
    )

    const round1 = phase.rounds![0].matches
    const byes = round1.filter((m) => !m.homeId || !m.awayId)
    expect(byes.map((m) => m.homeId ?? m.awayId)).toEqual(["t1", "t2"])
    const ties = round1.filter((m) => m.homeId && m.awayId)
    expect(ties.map((m) => [m.homeId, m.awayId])).toEqual([
      ["t3", "t6"],
      ["t4", "t5"],
    ])
  })

  it("ignores ids in a drawn order that are not in the phase", () => {
    const teams = makeTeams(4)
    const phase = createPhase("league", { name: "Table" })
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams,
      ["ghost", "t1"]
    )
    // A league has no draw to honour, so it is built as usual and stays whole.
    expect(phase.league?.standings).toHaveLength(4)
  })

  it("seeds a phase from a drawn order when advancing", () => {
    const teams = makeTeams(8)
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const t = createCustomTournament("Custom", teams, {
      phases: [table, cup],
      phaseEdges: [createPhaseEdge(table.id, cup.id, 1, 4)],
    })!

    const tablePhase = t.phases![0]
    const byId = new Map(teams.map((x) => [x.id, x]))
    for (const md of tablePhase.league!.matchdays) {
      for (const m of md.matches) {
        const home = byId.get(m.homeId)!
        const away = byId.get(m.awayId)!
        m.result = home.power > away.power ? { home: 1, away: 0 } : { home: 0, away: 1 }
      }
    }
    recalcPhase(tablePhase)

    const qualifiers = incomingQualifierIds(t, cup.id)
    expect(qualifiers).toEqual(["t1", "t2", "t3", "t4"])

    // Drawn in an order the seeding would never pick on its own.
    expect(seedPhaseFrom(t, cup.id, teams, ["t4", "t1", "t3", "t2"])).toBe(true)
    const cupPhase = t.phases![1]
    expect(cupPhase.rounds![0].matches.map((m) => [m.homeId, m.awayId])).toEqual([
      ["t4", "t1"],
      ["t3", "t2"],
    ])
  })

  it("falls back to the configured seeding with no drawn order", () => {
    const teams = makeTeams(4)
    const phase = createPhase("knockout", { name: "Cup", teamCount: 4 })
    buildPhase(
      phase,
      teams.map((t) => t.id),
      teams
    )
    // Seeded: top half against bottom half, so rank 1 never meets rank 2.
    expect(phase.rounds![0].matches.map((m) => [m.homeId, m.awayId])).toEqual([
      ["t1", "t4"],
      ["t2", "t3"],
    ])
  })
})

describe("seeded entry draws", () => {
  function groupsOf(t: Tournament) {
    return t.phases![0].groups!.map((g) => g.teamIds.join(","))
  }

  it("does not produce the same groups every time", () => {
    const teams = makeTeams(16)
    const make = () => {
      const group = createPhase("group", { name: "Groups", teamCount: 16 })
      if (group.config.kind === "group") group.config.group.groupCount = 4
      const cup = createPhase("knockout", { name: "Cup", teamCount: 8, isFinal: true })
      return createCustomTournament("Custom", teams, {
        phases: [group, cup],
        phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 8)],
      })!
    }

    // Ten draws of the same field: a seeded draw that never varies — which is
    // what a plain pass-through of the entry order produced — would give one
    // single arrangement every time.
    const seen = new Set<string>()
    for (let i = 0; i < 10; i++) seen.add(groupsOf(make()).join("|"))
    expect(seen.size).toBeGreaterThan(1)
  })

  it("still spreads the strongest sides one per group", () => {
    const teams = makeTeams(16)
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") group.config.group.groupCount = 4
    const cup = createPhase("knockout", { name: "Cup", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Custom", teams, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 8)],
    })!

    // The four strongest are t1..t4, and a seeded draw must not put two of them
    // together however it shuffles the band.
    const top4 = new Set(["t1", "t2", "t3", "t4"])
    for (const g of t.phases![0].groups!) {
      expect(g.teamIds.filter((id) => top4.has(id))).toHaveLength(1)
    }
  })

  it("keeps a downstream phase's finishing order as its seeding", () => {
    const teams = makeTeams(8)
    const phase = createPhase("group", { name: "Groups", teamCount: 8 })
    if (phase.config.kind === "group") phase.config.group.groupCount = 2
    // Ranked by default: these arrived in finishing order, and that is the
    // seeding — sorting them by power instead would throw it away.
    buildPhase(phase, ["t8", "t7", "t6", "t5", "t4", "t3", "t2", "t1"], teams)
    expect(phase.groups![0].teamIds).toEqual(["t8", "t6", "t4", "t2"])
    expect(phase.groups![1].teamIds).toEqual(["t7", "t5", "t3", "t1"])
  })

  it("reproduces the entry phase's groups from entryPhaseDrawOrder", () => {
    const teams = makeTeams(16)
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") group.config.group.groupCount = 4
    const cup = createPhase("knockout", { name: "Cup", teamCount: 8, isFinal: true })
    const first = createCustomTournament("Custom", teams, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 8)],
    })!

    const order = entryPhaseDrawOrder(first)
    const graph = clonePhaseGraph(first)
    const again = createCustomTournament("Custom", teams, {
      phases: graph.phases,
      phaseEdges: graph.phaseEdges,
      entryOrderedIds: order,
    })!

    expect(groupsOf(again)).toEqual(groupsOf(first))
  })

  it("falls back to the team list when the entry phase is a knockout", () => {
    const teams = makeTeams(8)
    const cup = createPhase("knockout", { name: "Cup", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Cup only", teams, { phases: [cup], phaseEdges: [] })!
    expect(entryPhaseDrawOrder(t)).toEqual(t.teamIds)
  })
})

describe("phaseDestinations", () => {
  it("reports each outgoing range with the phase it feeds, in place order", () => {
    const teams = makeTeams(8)
    const table = createPhase("league", { name: "Table", teamCount: 8 })
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const plate = createPhase("knockout", { name: "Plate", teamCount: 4 })
    const t = createCustomTournament("Split", teams, {
      phases: [table, cup, plate],
      // Declared out of order on purpose: the result is sorted by place.
      phaseEdges: [
        createPhaseEdge(table.id, plate.id, 5, 8),
        createPhaseEdge(table.id, cup.id, 1, 4),
      ],
    })!

    const destinations = phaseDestinations(t, table.id)
    expect(
      destinations.map((d) => [d.fromRank, d.toRank, d.target.name])
    ).toEqual([
      [1, 4, "Cup"],
      [5, 8, "Plate"],
    ])
  })

  it("covers a group phase's qualifiers as one band", () => {
    const teams = makeTeams(16)
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    if (group.config.kind === "group") {
      group.config.group.groupCount = 4
      group.config.group.qualifiersPerGroup = 2
      group.config.group.wildcardCount = 2
    }
    const cup = createPhase("knockout", { name: "Cup", teamCount: 10, isFinal: true })
    const t = createCustomTournament("Custom", teams, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 2)],
    })!

    // The band is the qualifiers, not the edge's stored range.
    expect(phaseDestinations(t, group.id).map((d) => [d.fromRank, d.toRank])).toEqual([[1, 10]])
  })

  it("is empty for a group phase that has not been seeded", () => {
    const teams = makeTeams(16)
    const group = createPhase("group", { name: "Groups", teamCount: 16 })
    const mid = createPhase("league", { name: "Mid", teamCount: 8 })
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const t = createCustomTournament("Custom", teams, {
      phases: [group, mid, cup],
      phaseEdges: [createPhaseEdge(group.id, mid.id, 1, 8), createPhaseEdge(mid.id, cup.id, 1, 4)],
    })!
    // `mid` is still pending, so it has no field to take places out of.
    resetPhase(t.phases!.find((p) => p.id === group.id)!)
    expect(phaseDestinations(t, group.id)).toEqual([])
  })

  it("is empty for a terminal phase", () => {
    const teams = makeTeams(4)
    const table = createPhase("league", { name: "Table", teamCount: 4, isFinal: true })
    const t = createCustomTournament("Solo", teams, { phases: [table], phaseEdges: [] })!
    expect(phaseDestinations(t, table.id)).toEqual([])
  })
})

describe("createCustomTournament", () => {
  it("builds the entry phase and leaves the rest pending", () => {
    const { teams, phases, edges, group, league, cup } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })

    expect(t).not.toBeNull()
    expect(t!.format).toBe("custom")
    expect(t!.teamIds).toHaveLength(16)
    // The top-level containers stay empty — every fixture is inside a phase.
    expect(t!.rounds).toEqual([])
    expect(t!.groups).toBeUndefined()
    expect(t!.league).toBeUndefined()

    const byId = new Map(t!.phases!.map((p) => [p.id, p]))
    expect(byId.get(group.id)!.status).toBe("active")
    expect(byId.get(group.id)!.teamIds).toHaveLength(16)
    expect(byId.get(league.id)!.status).toBe("pending")
    expect(byId.get(cup.id)!.status).toBe("pending")
  })

  it("refuses an invalid graph rather than making an unplayable tournament", () => {
    const teams = makeTeams(16)
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const cyclic = [createPhaseEdge(a.id, b.id, 1, 2), createPhaseEdge(b.id, a.id, 1, 2)]
    expect(createCustomTournament("Bad", teams, { phases: [a, b], phaseEdges: cyclic })).toBeNull()
  })

  it("ignores any state on the phases it is handed", () => {
    const { teams, phases, edges, league } = chain(16)
    // A graph coming back from a previous season still carries its results.
    const dirty = phases.map((p) =>
      p.id === league.id ? { ...p, status: "done" as const, teamIds: ["x"] } : p
    )
    const t = createCustomTournament("Custom", teams, { phases: dirty, phaseEdges: edges })!
    const leaguePhase = t.phases!.find((p) => p.id === league.id)!
    expect(leaguePhase.status).toBe("pending")
    expect(leaguePhase.teamIds).toEqual([])
  })

  it("clonePhaseGraph keeps the shape and drops every result", () => {
    const { teams, phases, edges, group } = chain(16)
    const t = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!
    const clone = clonePhaseGraph(t)

    expect(clone.phases).toHaveLength(3)
    expect(clone.phaseEdges).toHaveLength(2)
    expect(clone.phases.every((p) => p.status === "pending" && p.teamIds.length === 0)).toBe(true)
    // Config is copied, not shared.
    const source = t.phases!.find((p) => p.id === group.id)!
    const copy = clone.phases.find((p) => p.id === group.id)!
    expect(copy.config).toEqual(source.config)
    expect(copy.config).not.toBe(source.config)
  })
})

describe("phaseOfMatch", () => {
  it("finds the phase a match id belongs to, in every container", () => {
    const { teams, phases, edges, group, cup } = chain(16)
    const t: Tournament = createCustomTournament("Custom", teams, { phases, phaseEdges: edges })!
    const groupPhase = t.phases!.find((p) => p.id === group.id)!
    const matchId = groupPhase.groups![0].matches[0].id
    expect(phaseOfMatch(t, matchId)?.id).toBe(group.id)

    // A knockout phase that has been built is found the same way.
    const cupPhase = t.phases!.find((p) => p.id === cup.id)!
    buildPhase(cupPhase, teams.slice(0, 4).map((x) => x.id), teams)
    expect(phaseOfMatch(t, cupPhase.rounds![0].matches[0].id)?.id).toBe(cup.id)
    expect(phaseOfMatch(t, "nope")).toBeUndefined()
  })
})
