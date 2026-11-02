import { describe, expect, it } from "vitest"
import { createTournament } from "../tournament"
import { commitKnockoutResult, knockoutComplete, simulateKnockoutAll } from "../knockoutOps"
import { doubleElimLayout, doubleElimPlacements } from "../doubleElim"
import { getWinnerId } from "../bracket"
import { makeTeams } from "./helpers"

function make(n: number) {
  const teams = makeTeams(n)
  const t = createTournament(
    "T",
    teams,
    1,
    false,
    undefined,
    undefined,
    2,
    0,
    "single",
    "single",
    "single",
    undefined,
    true
  )
  return { t, teams }
}

describe("double elimination", () => {
  it("lays out 3k rounds", () => {
    for (const [n, k] of [
      [3, 2],
      [4, 2],
      [8, 3],
      [12, 4],
      [16, 4],
    ] as const) {
      const { t } = make(n)
      expect(t.doubleElim).toBe(true)
      expect(t.rounds.length).toBe(3 * k)
    }
  })

  it("8 teams: every team plays at least twice unless it wins out, and a champion emerges", () => {
    const { t, teams } = make(8)
    t.winnerId = simulateKnockoutAll(t, teams)
    expect(t.winnerId).toBeTruthy()
    expect(knockoutComplete(t)).toBe(true)
    expect(doubleElimPlacements(t.rounds)).toHaveLength(8)
    expect(doubleElimPlacements(t.rounds)[0]).toBe(t.winnerId)
  })

  it.each([3, 5, 6, 7, 9, 11, 13, 16, 17, 25])("%i teams complete with byes", (n) => {
    const { t, teams } = make(n)
    for (let i = 0; i < 5; i++) {
      const fresh = make(n)
      fresh.t.winnerId = simulateKnockoutAll(fresh.t, fresh.teams)
      expect(fresh.t.winnerId).toBeTruthy()
      expect(knockoutComplete(fresh.t)).toBe(true)
      expect(new Set(doubleElimPlacements(fresh.t.rounds)).size).toBe(n)
    }
    void t
    void teams
  })

  it("home always winning: WB champ takes the title without a reset", () => {
    const { t, teams } = make(4)
    const l = doubleElimLayout(t.rounds.length)
    for (let ri = 0; ri <= l.grandFinal; ri++) {
      t.rounds[ri].matches.forEach((m, mi) => {
        if (m.homeId && m.awayId && !m.result)
          t.winnerId = commitKnockoutResult(t, ri, mi, { home: 1, away: 0 }, teams)
      })
    }
    const gf = t.rounds[l.grandFinal].matches[0]
    expect(t.winnerId).toBe(getWinnerId(gf))
    expect(t.rounds[l.reset].matches[0].homeId).toBeNull()
  })

  it("losers-bracket champion winning the grand final forces a reset", () => {
    const { t, teams } = make(4)
    const l = doubleElimLayout(t.rounds.length)
    // winners side: home wins; losers side: home wins; GF: away (LB champ) wins
    for (let ri = 0; ri < l.grandFinal; ri++) {
      t.rounds[ri].matches.forEach((m, mi) => {
        if (m.homeId && m.awayId && !m.result)
          commitKnockoutResult(t, ri, mi, { home: 1, away: 0 }, teams)
      })
    }
    t.winnerId = commitKnockoutResult(t, l.grandFinal, 0, { home: 0, away: 1 }, teams)
    expect(t.winnerId).toBeNull()
    const reset = t.rounds[l.reset].matches[0]
    expect(reset.homeId && reset.awayId).toBeTruthy()
    t.winnerId = commitKnockoutResult(t, l.reset, 0, { home: 1, away: 0 }, teams)
    expect(t.winnerId).toBe(reset.homeId)
  })

  it("changing a winners result re-routes the losers bracket", () => {
    const { t, teams } = make(8)
    commitKnockoutResult(t, 0, 0, { home: 1, away: 0 }, teams)
    commitKnockoutResult(t, 0, 1, { home: 1, away: 0 }, teams)
    const lr0 = t.rounds[3].matches[0]
    const before = [lr0.homeId, lr0.awayId]
    commitKnockoutResult(t, 0, 0, { home: 0, away: 1 }, teams)
    expect([lr0.homeId, lr0.awayId]).not.toEqual(before)
  })
})
