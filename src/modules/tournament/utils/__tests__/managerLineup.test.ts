import { describe, expect, it } from "vitest"
import type { Player } from "@/modules/players/types"
import type { ManagerLineupSlot } from "@/modules/tournament/types"
import { assignLineupSlot, bestStartingXI, clearLineupPlayer, reconcileLineupSlots } from "../managerLineup"

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
    expect(lineup.every((slot) => slot.playerId !== null)).toBe(true)
    expect(lineup.map((slot) => slot.playerId)).toEqual(
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
    // def5 (weakest defender) missed the cut.
    expect(lineup.map((slot) => slot.playerId)).not.toContain("def5")
  })

  it("leaves a position short rather than reaching into another one", () => {
    // Only one defender registered, formation wants four — the other three
    // stay empty for engine/events/lineup.ts's own cover-or-anonymous fallback.
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

    // Always one entry per formation slot — eleven, even when the squad is short.
    expect(lineup).toHaveLength(11)
    expect(lineup.filter((slot) => slot.playerId !== null).map((slot) => slot.playerId)).toEqual(
      expect.arrayContaining(["gk1", "def1", "mid1", "mid2", "mid3", "mid4", "fwd1", "fwd2"])
    )
    const defSlots = lineup.filter((slot) => slot.position === "DEF")
    expect(defSlots).toHaveLength(4)
    expect(defSlots.filter((slot) => slot.playerId === null)).toHaveLength(3)
  })

  it("still returns every formation slot for an empty squad, all unfilled", () => {
    const lineup = bestStartingXI([], "4-4-2")
    expect(lineup).toHaveLength(11)
    expect(lineup.every((slot) => slot.playerId === null)).toBe(true)
  })
})

describe("reconcileLineupSlots", () => {
  it("keeps a pick whose position still has room under the new formation", () => {
    const slots: ManagerLineupSlot[] = [
      { position: "GK", playerId: "gk1" },
      { position: "DEF", playerId: "def1" },
      { position: "FWD", playerId: "fwd1" },
    ]
    const next = reconcileLineupSlots(slots, "3-5-2")
    expect(next.find((s) => s.position === "GK")?.playerId).toBe("gk1")
    expect(next.filter((s) => s.position === "DEF").map((s) => s.playerId)).toContain("def1")
  })

  it("drops the picks a shrunk position no longer has room for, keeps the rest", () => {
    // 4-4-2 (4 MID) down to 4-3-3 (3 MID): one midfielder must fall out.
    const slots: ManagerLineupSlot[] = [
      { position: "MID", playerId: "m1" },
      { position: "MID", playerId: "m2" },
      { position: "MID", playerId: "m3" },
      { position: "MID", playerId: "m4" },
    ]
    const next = reconcileLineupSlots(slots, "4-3-3")
    const midIds = next.filter((s) => s.position === "MID").map((s) => s.playerId)
    expect(midIds).toHaveLength(3)
    expect(midIds).toEqual(["m1", "m2", "m3"])
  })

  it("never produces more entries than the new formation's own slot count", () => {
    const oversized: ManagerLineupSlot[] = Array.from({ length: 20 }, (_, i) => ({
      position: "DEF",
      playerId: `d${i}`,
    }))
    const next = reconcileLineupSlots(oversized, "4-4-2")
    expect(next.filter((s) => s.position === "DEF")).toHaveLength(4)
  })
})

describe("assignLineupSlot / clearLineupPlayer", () => {
  it("replaces exactly the targeted slot", () => {
    const slots: ManagerLineupSlot[] = [
      { position: "GK", playerId: null },
      { position: "DEF", playerId: null },
    ]
    const next = assignLineupSlot(slots, 1, "def1")
    expect(next[0].playerId).toBeNull()
    expect(next[1].playerId).toBe("def1")
  })

  it("empties whichever slot a player currently occupies", () => {
    const slots: ManagerLineupSlot[] = [
      { position: "GK", playerId: "gk1" },
      { position: "DEF", playerId: "def1" },
    ]
    const next = clearLineupPlayer(slots, "def1")
    expect(next.find((s) => s.playerId === "def1")).toBeUndefined()
    expect(next[0].playerId).toBe("gk1")
  })
})
