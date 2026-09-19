// store/__tests__/phases.test.ts
//
// The custom format through the store: creating a graph, entering results into
// a phase, advancing between phases, and the reset/finish/new-season rules.
//
// The slices are called directly, as everywhere else in this folder — the
// composed store is only needed where a wrapper is the thing under test (see
// managerCustom.test.ts for those).
import { describe, expect, it } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { createPhase, createPhaseEdge, isPhaseComplete, phaseStandingIds } from "@/engine"
import { useCrudActions } from "../crud"
import { usePhasesActions } from "../phases"

const TEAMS = 16

function graph(teamCount = TEAMS) {
  const group = createPhase("group", { name: "Qualifying", teamCount })
  if (group.config.kind === "group") group.config.group.groupCount = 4
  const league = createPhase("league", { name: "Main Round", teamCount: 8 })
  const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
  return {
    group,
    league,
    cup,
    phases: [group, league, cup],
    phaseEdges: [
      createPhaseEdge(group.id, league.id, 1, 8),
      createPhaseEdge(league.id, cup.id, 1, 4),
    ],
  }
}

function setup(teams: Team[] = makeTeams(TEAMS)) {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)
  const getTeams = () => teams
  const crud = useCrudActions(tournaments, active, getTeams)
  const phases = usePhasesActions(tournaments, getTeams)
  return { tournaments, active, crud, phases, teams, ids: teams.map((t) => t.id) }
}

function create(s: ReturnType<typeof setup>, g = graph()) {
  const id = s.crud.createCustom("Custom", s.ids, { phases: g.phases, phaseEdges: g.phaseEdges })!
  const t = s.tournaments.value.find((x) => x.id === id)!
  return { id, t, g }
}

function phaseOf(t: Tournament, id: string): TournamentPhase {
  return t.phases!.find((p) => p.id === id)!
}

/** Plays every outstanding fixture of a phase through the store actions. */
function playPhase(s: ReturnType<typeof setup>, id: string, phaseId: string) {
  const t = s.tournaments.value.find((x) => x.id === id)!
  const phase = phaseOf(t, phaseId)
  if (phase.groups) s.phases.simAllPhaseGroups(id, phaseId)
  else if (phase.league) s.phases.simAllPhaseLeague(id, phaseId)
  else if (phase.rounds) s.phases.simAllPhaseBracket(id, phaseId)
}

describe("createCustom", () => {
  it("builds the entry phase and leaves the rest waiting", () => {
    const s = setup()
    const { t, g } = create(s)

    expect(t.format).toBe("custom")
    expect(phaseOf(t, g.group.id).status).toBe("active")
    expect(phaseOf(t, g.group.id).groups).toHaveLength(4)
    expect(phaseOf(t, g.league.id).status).toBe("pending")
    expect(phaseOf(t, g.cup.id).status).toBe("pending")
    expect(t.winnerId).toBeNull()
  })

  it("numbers seasons per name, like every other format", () => {
    const s = setup()
    create(s)
    const { t } = create(s)
    expect(t.season).toBe(2)
  })

  it("returns undefined for an invalid graph and stores nothing", () => {
    const s = setup()
    const a = createPhase("league", { name: "A" })
    const b = createPhase("league", { name: "B" })
    const cyclic = [createPhaseEdge(a.id, b.id, 1, 2), createPhaseEdge(b.id, a.id, 1, 2)]
    expect(s.crud.createCustom("Bad", s.ids, { phases: [a, b], phaseEdges: cyclic })).toBeUndefined()
    expect(s.tournaments.value).toHaveLength(0)
  })
})

describe("entering results into a phase", () => {
  it("updates that phase's table and nothing else", () => {
    const s = setup()
    const { id, t, g } = create(s)
    const phase = phaseOf(t, g.group.id)
    const first = phase.groups![0].matches[0]

    s.phases.setPhaseGroupResult(id, g.group.id, 0, 0, 3, 1)

    expect(first.result).toEqual({ home: 3, away: 1 })
    const row = phase.groups![0].standings.find((r) => r.teamId === first.homeId)!
    expect(row.pts).toBe(3)
    expect(row.gd).toBe(2)
    // The other groups are untouched.
    expect(phase.groups![1].standings.every((r) => r.played === 0)).toBe(true)
  })

  it("clears a result and re-ranks the table", () => {
    const s = setup()
    const { id, t, g } = create(s)
    s.phases.setPhaseGroupResult(id, g.group.id, 0, 0, 3, 1)
    s.phases.clearPhaseGroupResult(id, g.group.id, 0, 0)

    const phase = phaseOf(t, g.group.id)
    expect(phase.groups![0].matches[0].result).toBeNull()
    expect(phase.groups![0].standings.every((r) => r.played === 0)).toBe(true)
  })

  it("writes league results into the phase's own table", () => {
    const s = setup()
    const league = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const id = s.crud.createCustom("Solo", s.ids.slice(0, 8), {
      phases: [league],
      phaseEdges: [],
    })!
    const t = s.tournaments.value.find((x) => x.id === id)!

    s.phases.setPhaseLeagueResult(id, league.id, 0, 0, 2, 0)
    const match = phaseOf(t, league.id).league!.matchdays[0].matches[0]
    expect(match.result).toEqual({ home: 2, away: 0 })
    const row = phaseOf(t, league.id).league!.standings.find((r) => r.teamId === match.homeId)!
    expect(row.pts).toBe(3)
  })

  it("ignores an action aimed at a phase that does not exist", () => {
    const s = setup()
    const { id, t, g } = create(s)
    expect(() => s.phases.setPhaseGroupResult(id, "ghost", 0, 0, 1, 0)).not.toThrow()
    expect(phaseOf(t, g.group.id).groups![0].matches[0].result).toBeNull()
  })

  it("ignores a group action aimed at a league phase", () => {
    const s = setup()
    const { id, t, g } = create(s)
    playPhase(s, id, g.group.id)
    s.phases.advancePhase(id, g.league.id)
    expect(() => s.phases.setPhaseGroupResult(id, g.league.id, 0, 0, 1, 0)).not.toThrow()
    expect(phaseOf(t, g.league.id).groups).toBeUndefined()
  })
})

describe("advancePhase", () => {
  it("refuses while the source phase is unfinished", () => {
    const s = setup()
    const { id, t, g } = create(s)
    s.phases.setPhaseGroupResult(id, g.group.id, 0, 0, 1, 0)

    expect(s.phases.advancePhase(id, g.league.id)).toBe(false)
    expect(phaseOf(t, g.league.id).status).toBe("pending")
  })

  it("seeds the next phase from the edge's rank range once the source is done", () => {
    const s = setup()
    const { id, t, g } = create(s)
    playPhase(s, id, g.group.id)

    expect(s.phases.advancePhase(id, g.league.id)).toBe(true)
    const source = phaseOf(t, g.group.id)
    const target = phaseOf(t, g.league.id)
    expect(source.status).toBe("done")
    expect(target.status).toBe("active")
    expect(target.teamIds).toEqual(phaseStandingIds(source).slice(0, 8))
    expect(target.league!.matchdays.length).toBeGreaterThan(0)
  })

  it("refuses a second time, so a phase is never rebuilt over its own results", () => {
    const s = setup()
    const { id, t, g } = create(s)
    playPhase(s, id, g.group.id)
    s.phases.advancePhase(id, g.league.id)
    s.phases.setPhaseLeagueResult(id, g.league.id, 0, 0, 4, 0)

    expect(s.phases.advancePhase(id, g.league.id)).toBe(false)
    expect(phaseOf(t, g.league.id).league!.matchdays[0].matches[0].result).toEqual({
      home: 4,
      away: 0,
    })
  })

  it("advancePhaseManual seeds from the drawn order", () => {
    const s = setup()
    const { id, t, g } = create(s)
    playPhase(s, id, g.group.id)
    s.phases.advancePhase(id, g.league.id)
    playPhase(s, id, g.league.id)

    const qualifiers = phaseStandingIds(phaseOf(t, g.league.id)).slice(0, 4)
    const drawn = [qualifiers[3], qualifiers[0], qualifiers[2], qualifiers[1]]

    expect(s.phases.advancePhaseManual(id, g.cup.id, drawn)).toBe(true)
    const cup = phaseOf(t, g.cup.id)
    expect(cup.rounds![0].matches.map((m) => [m.homeId, m.awayId])).toEqual([
      [drawn[0], drawn[1]],
      [drawn[2], drawn[3]],
    ])
  })

  it("advancePhaseManual refuses before the source is finished", () => {
    const s = setup()
    const { id, t, g } = create(s)
    expect(s.phases.advancePhaseManual(id, g.league.id, ["t1", "t2"])).toBe(false)
    expect(phaseOf(t, g.league.id).status).toBe("pending")
  })

  it("crowns the winner only when the final phase is finished", () => {
    const s = setup()
    const { id, t, g } = create(s)

    playPhase(s, id, g.group.id)
    s.phases.advancePhase(id, g.league.id)
    playPhase(s, id, g.league.id)
    expect(t.winnerId).toBeNull()

    s.phases.advancePhase(id, g.cup.id)
    playPhase(s, id, g.cup.id)

    expect(t.winnerId).toBeTruthy()
    expect(t.winnerId).toBe(phaseStandingIds(phaseOf(t, g.cup.id))[0])
    expect(s.crud.isTournamentFinished(id)).toBe(true)
  })
})

describe("simulateCustomTournament", () => {
  it("plays and advances the whole graph in one go", () => {
    const s = setup()
    const { id, t } = create(s)

    s.phases.simulateCustomTournament(id)

    expect(t.phases!.every((p) => isPhaseComplete(p))).toBe(true)
    expect(t.winnerId).toBeTruthy()
    expect(s.crud.isTournamentFinished(id)).toBe(true)
  })

  it("resumes a graph that is already part-played", () => {
    const s = setup()
    const { id, t, g } = create(s)
    playPhase(s, id, g.group.id)
    s.phases.advancePhase(id, g.league.id)

    s.phases.simulateCustomTournament(id)
    expect(t.winnerId).toBeTruthy()
  })

  it("does nothing for a tournament with no phases", () => {
    const s = setup()
    const id = s.crud.create("Cup", s.ids)!
    expect(() => s.phases.simulateCustomTournament(id)).not.toThrow()
  })
})

describe("isTournamentFinished", () => {
  it("is false until the final phase has been played out", () => {
    const s = setup()
    const { id, g } = create(s)
    expect(s.crud.isTournamentFinished(id)).toBe(false)
    playPhase(s, id, g.group.id)
    expect(s.crud.isTournamentFinished(id)).toBe(false)
  })
})

describe("resetResults", () => {
  it("rebuilds the entry phase and puts every later phase back to pending", () => {
    const s = setup()
    const { id, t, g } = create(s)
    const groupsBefore = phaseOf(t, g.group.id).groups!.map((gr) => [...gr.teamIds])
    s.phases.simulateCustomTournament(id)

    s.crud.resetResults(id)

    const entry = phaseOf(t, g.group.id)
    expect(entry.status).toBe("active")
    expect(entry.teamIds).toHaveLength(TEAMS)
    expect(entry.groups!.every((gr) => gr.matches.every((m) => m.result === null))).toBe(true)
    // The draw survives: resetting results does not redraw the groups, the same
    // as in every other format.
    expect(entry.groups!.map((gr) => gr.teamIds)).toEqual(groupsBefore)
    expect(entry.groups!.every((gr) => gr.standings.every((r) => r.played === 0))).toBe(true)
    expect(phaseOf(t, g.league.id).status).toBe("pending")
    expect(phaseOf(t, g.league.id).league).toBeUndefined()
    expect(phaseOf(t, g.cup.id).status).toBe("pending")
    expect(phaseOf(t, g.cup.id).rounds).toBeUndefined()
    expect(t.winnerId).toBeNull()
  })

  it("leaves a reset tournament playable again", () => {
    const s = setup()
    const { id, t } = create(s)
    s.phases.simulateCustomTournament(id)
    s.crud.resetResults(id)
    s.phases.simulateCustomTournament(id)
    expect(t.winnerId).toBeTruthy()
  })
})

describe("newSeason", () => {
  it("replays the same graph with results cleared", () => {
    const s = setup()
    const { id, g } = create(s)
    s.phases.simulateCustomTournament(id)

    const nextId = s.crud.newSeason(id)!
    const next = s.tournaments.value.find((x) => x.id === nextId)!

    expect(next.season).toBe(2)
    expect(next.format).toBe("custom")
    expect(next.phases).toHaveLength(3)
    expect(next.phaseEdges).toHaveLength(2)
    expect(next.winnerId).toBeNull()
    // The entry phase is live again; the rest wait.
    expect(phaseOf(next, g.group.id).status).toBe("active")
    expect(phaseOf(next, g.league.id).status).toBe("pending")
    // Nothing is shared with the finished season.
    const prev = s.tournaments.value.find((x) => x.id === id)!
    expect(phaseOf(next, g.group.id).groups).not.toBe(phaseOf(prev, g.group.id).groups)
  })

  it("refuses before the tournament has a winner", () => {
    const s = setup()
    const { id } = create(s)
    expect(s.crud.newSeason(id)).toBeUndefined()
  })

  it("carries the managed team into the new season", () => {
    const s = setup()
    const { id, t } = create(s)
    // Played out first, then given a manager: a bulk simulation deliberately
    // stops at the managed side's own tie, so simulating with one set would
    // leave the tournament unfinished and newSeason would rightly refuse it.
    // That interplay is managerCustom.test.ts's subject; this is only the
    // carry-over.
    s.phases.simulateCustomTournament(id)
    t.manager = {
      teamId: s.ids[0],
      formation: "4-3-3",
      style: "balanced",
      startedAt: Date.now(),
    }

    const nextId = s.crud.newSeason(id)!
    const next = s.tournaments.value.find((x) => x.id === nextId)!
    expect(next.manager?.teamId).toBe(s.ids[0])
  })

  it("drops a manager whose team is not in the new season's field", () => {
    const s = setup()
    const { id, t } = create(s)
    s.phases.simulateCustomTournament(id)
    t.manager = {
      teamId: s.ids[0],
      formation: "4-3-3",
      style: "balanced",
      startedAt: Date.now(),
    }

    // The same rule every other format follows: the job only carries while the
    // club is still in the competition.
    const nextId = s.crud.newSeason(id, false, undefined, undefined, undefined, undefined, s.ids.slice(1))
    const next = s.tournaments.value.find((x) => x.id === nextId)!
    expect(next.manager).toBeUndefined()
  })
})
