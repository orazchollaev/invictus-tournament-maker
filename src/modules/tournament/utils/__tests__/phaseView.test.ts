// modules/tournament/utils/__tests__/phaseView.test.ts
//
// Every panel that shows a phase — the group cards, the tables, the bracket, the
// fixtures list — reads it through this view, so what it maps is what those
// panels branch on.
import { describe, expect, it } from "vitest"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { buildPhase, createCustomTournament, createPhase, createPhaseEdge } from "@/engine"
import { phaseTournamentView } from "../phaseView"

const TEAMS = makeTeams(16)

function custom(): { t: Tournament; group: TournamentPhase; cup: TournamentPhase } {
  const group = createPhase("group", { name: "Groups", teamCount: 16 })
  if (group.config.kind === "group") {
    group.config.group.groupCount = 4
    group.config.group.qualifiersPerGroup = 2
    group.config.group.wildcardCount = 2
  }
  const cup = createPhase("knockout", { name: "Cup", teamCount: 10, isFinal: true })
  if (cup.config.kind === "knockout") cup.config.knockout.hasThirdPlace = true
  const t = createCustomTournament("Custom", TEAMS, {
    phases: [group, cup],
    phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 2)],
  })!
  return { t, group: t.phases![0], cup: t.phases![1] }
}

describe("phaseTournamentView", () => {
  it("presents a group phase as the fixed group format", () => {
    const { t, group } = custom()
    const view = phaseTournamentView(t, group)

    expect(view.format).toBe("group+bracket")
    expect(view.groups).toBe(group.groups)
    expect(view.rounds).toEqual([])
    expect(view.league).toBeUndefined()
    // The qualification settings the group card tints its rows from.
    expect(view.qualifiersPerGroup).toBe(2)
    expect(view.wildcardCount).toBe(2)
  })

  it("presents a knockout phase as a pure bracket, third-place included", () => {
    const { t, cup } = custom()
    buildPhase(
      cup,
      TEAMS.slice(0, 10).map((x) => x.id),
      TEAMS
    )
    const view = phaseTournamentView(t, cup)

    expect(view.format).toBe("bracket")
    expect(view.rounds).toBe(cup.rounds)
    expect(view.hasThirdPlace).toBe(true)
    expect(view.thirdPlaceMatch).toBe(cup.thirdPlaceMatch)
    expect(view.groups).toBeUndefined()
    // A phase never carries wildcards of its own into a bracket.
    expect(view.wildcardCount).toBe(0)
  })

  it("presents league and swiss phases as their own formats", () => {
    const { t } = custom()
    const league = createPhase("league", { name: "Table", teamCount: 8 })
    const swiss = createPhase("swiss", { name: "Swiss", teamCount: 8 })
    expect(phaseTournamentView(t, league).format).toBe("league")
    expect(phaseTournamentView(t, swiss).format).toBe("swiss")
  })

  it("reports a phase as settled only once it has been advanced out of", () => {
    const { t, group } = custom()
    expect(phaseTournamentView(t, group).groupsDone).toBe(false)
    group.status = "done"
    expect(phaseTournamentView(t, group).groupsDone).toBe(true)
  })

  it("carries the tournament's identity and scoring, not its containers", () => {
    const { t, group } = custom()
    t.tiebreaker = "head-to-head"
    t.winPoints = 2
    t.teamPointAdjustments = { t1: -3 }
    const view = phaseTournamentView(t, group)

    expect(view.id).toBe(t.id)
    expect(view.name).toBe(t.name)
    expect(view.season).toBe(t.season)
    expect(view.tiebreaker).toBe("head-to-head")
    expect(view.winPoints).toBe(2)
    expect(view.teamPointAdjustments).toEqual({ t1: -3 })
    // The tournament's own tiers must never leak into a phase view — a panel
    // would render them as divisions of the phase.
    expect(view.tiers).toBeUndefined()
  })

  it("scopes teamIds to the phase's own field", () => {
    const { t, cup } = custom()
    buildPhase(
      cup,
      TEAMS.slice(0, 10).map((x) => x.id),
      TEAMS
    )
    expect(phaseTournamentView(t, cup).teamIds).toHaveLength(10)
    expect(phaseTournamentView(t, t.phases![0]).teamIds).toHaveLength(16)
  })

  it("carries the manager through, so their own fixtures stay editable", () => {
    const { t, group } = custom()
    t.manager = { teamId: "t1", formation: "4-3-3", style: "balanced", startedAt: 1 }
    expect(phaseTournamentView(t, group).manager?.teamId).toBe("t1")
  })
})
