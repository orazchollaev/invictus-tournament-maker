import { describe, it, expect } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { createTournament } from "@/engine"
import { makeTeams } from "@/engine/__tests__/helpers"
import { useBracketActions } from "../bracket"
import { useThirdPlaceActions } from "../third-place"

/** An eight-team bracket: quarters, semis, final. */
function bracket(): { t: Tournament; teams: Team[] } {
  const teams = makeTeams(8)
  return { t: createTournament("B", teams) as Tournament, teams }
}

function actionsFor(t: Tournament, teams: Team[]) {
  const tournaments = ref([t])
  const third = useThirdPlaceActions(tournaments, () => teams)
  const bracketActions = useBracketActions(tournaments, () => teams, third.simulateThirdPlace)
  return { ...bracketActions, ...third }
}

/** Win the whole quarter-final round so the semis have both sides filled. */
function playQuarters(actions: ReturnType<typeof actionsFor>, t: Tournament) {
  for (let m = 0; m < t.rounds[0].matches.length; m++) actions.setResult(t.id, 0, m, 2, 0)
}

describe("useBracketActions", () => {
  it("promotes the winner into the next round", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    const homeId = t.rounds[0].matches[0].homeId

    actions.setResult(t.id, 0, 0, 3, 1)
    expect(t.rounds[1].matches[0].homeId).toBe(homeId)
  })

  it("records the champion once the final is played", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    playQuarters(actions, t)
    actions.setResult(t.id, 1, 0, 1, 0)
    actions.setResult(t.id, 1, 1, 1, 0)

    const finalist = t.rounds[2].matches[0].homeId
    actions.setResult(t.id, 2, 0, 2, 1)
    expect(t.winnerId).toBe(finalist)
  })

  it("wipes downstream slots when an earlier round is re-entered", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    playQuarters(actions, t)
    actions.setResult(t.id, 1, 0, 1, 0)
    expect(t.rounds[2].matches[0].homeId).not.toBeNull()

    // The other quarter-final now goes the other way.
    actions.setResult(t.id, 0, 1, 0, 2)
    expect(t.rounds[2].matches[0].homeId).toBeNull()
    expect(t.rounds[1].matches[0].result).toBeNull()
  })

  it("clears the whole tie, both legs, when leg 1 is re-entered", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    t.rounds[0].matches[0].leg2Result = null

    actions.setResult(t.id, 0, 0, 1, 0)
    actions.setLeg2Result(t.id, 0, 0, 2, 0)
    expect(t.rounds[0].matches[0].leg2Result).not.toBeNull()

    actions.setResult(t.id, 0, 0, 0, 1)
    expect(t.rounds[0].matches[0].leg2Result).toBeNull()
  })

  /**
   * A semi-final changing invalidates the third-place tie. Leg 2 has to go
   * with leg 1, or a double-legged match keeps a leg played by the old pair
   * of losers.
   */
  it("drops both legs of the third-place match when a semi-final changes", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    playQuarters(actions, t)
    actions.toggleThirdPlace(t.id)
    actions.setThirdPlaceLegMode(t.id, "double")
    actions.setResult(t.id, 1, 0, 1, 0)
    actions.setResult(t.id, 1, 1, 1, 0)

    actions.setThirdPlaceResult(t.id, 2, 1)
    actions.setThirdPlaceLeg2Result(t.id, 1, 1)
    expect(t.thirdPlaceMatch!.result).not.toBeNull()
    expect(t.thirdPlaceMatch!.leg2Result).not.toBeNull()

    actions.setResult(t.id, 1, 0, 0, 1)
    expect(t.thirdPlaceMatch!.result).toBeNull()
    expect(t.thirdPlaceMatch!.leg2Result).toBeNull()
  })

  it("does nothing for an id that is not in the list", () => {
    const { t, teams } = bracket()
    const actions = actionsFor(t, teams)
    const before = JSON.stringify(t)
    actions.setResult("nope", 0, 0, 5, 0)
    expect(JSON.stringify(t)).toBe(before)
  })
})
