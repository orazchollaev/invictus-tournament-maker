import { describe, expect, it } from "vitest"
import type { MatchRow, Outcome } from "@/modules/teams/composables/useTeamMatchHistory"
import { summarizeHeadToHead } from "../headToHead"

function row(outcome: Outcome, goalsFor: number, goalsAgainst: number): MatchRow {
  return {
    tournamentName: "Cup",
    tournamentSeason: 1,
    round: "Final",
    roundPhase: "knockout",
    match: {} as MatchRow["match"],
    opponentId: "b",
    goalsFor,
    goalsAgainst,
    penGoalsFor: null,
    penGoalsAgainst: null,
    outcome,
  }
}

describe("summarizeHeadToHead", () => {
  it("is all zeros with no meetings", () => {
    expect(summarizeHeadToHead([])).toEqual({
      played: 0,
      winsA: 0,
      draws: 0,
      winsB: 0,
      goalsA: 0,
      goalsB: 0,
    })
  })

  it("tallies results and goals from A's side", () => {
    const summary = summarizeHeadToHead([
      row("W", 3, 1),
      row("D", 2, 2),
      row("L", 0, 1),
      row("W", 1, 0),
    ])
    expect(summary).toEqual({ played: 4, winsA: 2, draws: 1, winsB: 1, goalsA: 6, goalsB: 4 })
  })

  it("counts a penalty-decided knockout by its outcome, not the scoreline", () => {
    const pens = { ...row("W", 1, 1), penGoalsFor: 4, penGoalsAgainst: 3 }
    expect(summarizeHeadToHead([pens]).winsA).toBe(1)
  })
})
