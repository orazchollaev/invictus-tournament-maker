import { describe, it, expect } from "vitest"
import { ref } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import { createLeague } from "@/engine"
import { makeTeams, playLeagueByPower } from "@/engine/__tests__/helpers"
import { useScoringActions } from "../scoring"

/** A finished four-team league where the stronger side won every match. */
function playedLeague() {
  const teams = makeTeams(4)
  const t = createLeague("L", teams, 1) as Tournament
  playLeagueByPower(t, teams)
  return t
}

function actionsFor(t: Tournament) {
  return useScoringActions(ref([t]))
}

describe("useScoringActions", () => {
  it("ignores an id that is not in the list", () => {
    const t = playedLeague()
    const before = JSON.stringify(t)
    actionsFor(t).setPointsConfig("nope", 5, 5, 5)
    expect(JSON.stringify(t)).toBe(before)
  })

  it("recomputes the table when the points config changes", () => {
    const t = playedLeague()
    expect(t.league!.standings[0].pts).toBe(9) // 3 wins at the default 3 points

    actionsFor(t).setPointsConfig(t.id, 5, 1, 0)
    expect(t.league!.standings[0].pts).toBe(15)
    expect(t.league!.standings[3].pts).toBe(0)
  })

  /**
   * The cascade used to be copy-pasted, and only the points path refreshed
   * the champion — so a reordering tiebreaker could leave the old winner
   * recorded.
   */
  it("refreshes the champion after a tiebreaker change, not just after a points change", () => {
    const t = playedLeague()
    // Playing the fixture fills the table but records no champion; that is the
    // store's job, and it used to happen on only one of these two paths.
    expect(t.winnerId).toBeFalsy()

    actionsFor(t).setTiebreaker(t.id, "head-to-head")
    expect(t.tiebreaker).toBe("head-to-head")
    expect(t.winnerId).toBe("t1")

    // A penalty big enough to drop the leader has to move the trophy too.
    actionsFor(t).setTeamPointAdjustment(t.id, "t1", -9)
    expect(t.league!.standings[0].teamId).not.toBe("t1")
    expect(t.winnerId).toBe(t.league!.standings[0].teamId)
  })

  it("keeps a point adjustment on the tournament rather than the team", () => {
    const t = playedLeague()
    actionsFor(t).setTeamPointAdjustment(t.id, "t2", -3)

    expect(t.teamPointAdjustments).toEqual({ t2: -3 })
    const t2 = t.league!.standings.find((s) => s.teamId === "t2")!
    expect(t2.pts).toBe(6 - 3)
  })
})
