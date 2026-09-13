import { describe, expect, it } from "vitest"
import type { Player } from "@/modules/players/types"
import { bestStartingXI } from "../managerLineup"

function player(id: string, teamId: string, position: Player["position"], power: number): Player {
  return { id, teamId, name: id, position, power }
}

describe("bestStartingXI", () => {
  it("picks the strongest player in each position, up to the formation's slots", () => {
    const squad = [
      player("gk1", "t1", "GK", 70),
      player("def1", "t1", "DEF", 60),
      player("def2", "t1", "DEF", 80),
      player("def3", "t1", "DEF", 50),
      player("def4", "t1", "DEF", 90),
      player("def5", "t1", "DEF", 40),
      player("mid1", "t1", "MID", 65),
      player("mid2", "t1", "MID", 75),
      player("mid3", "t1", "MID", 55),
      player("mid4", "t1", "MID", 45),
      player("fwd1", "t1", "FWD", 85),
      player("fwd2", "t1", "FWD", 30),
    ]
    const lineup = bestStartingXI(squad, "4-4-2")

    expect(lineup).toHaveLength(11)
    expect(lineup).toEqual(
      expect.arrayContaining([
        "gk1",
        "def4",
        "def2",
        "def1",
        "def3",
        "mid2",
        "mid1",
        "mid3",
        "mid4",
        "fwd1",
        "fwd2",
      ])
    )
  })

  it("leaves a position short rather than reaching into another one", () => {
    // Only one defender registered, formation wants four — the other three
    // stay for engine/events/lineup.ts's own cover-or-anonymous fallback.
    const squad = [
      player("gk1", "t1", "GK", 70),
      player("def1", "t1", "DEF", 60),
      player("mid1", "t1", "MID", 65),
      player("mid2", "t1", "MID", 55),
      player("mid3", "t1", "MID", 45),
      player("mid4", "t1", "MID", 35),
      player("fwd1", "t1", "FWD", 85),
      player("fwd2", "t1", "FWD", 30),
    ]
    const lineup = bestStartingXI(squad, "4-4-2")

    expect(lineup).toHaveLength(8)
    expect(lineup).toEqual(
      expect.arrayContaining(["gk1", "def1", "mid1", "mid2", "mid3", "mid4", "fwd1", "fwd2"])
    )
  })

  it("returns nothing for an empty squad", () => {
    expect(bestStartingXI([], "4-4-2")).toEqual([])
  })
})
