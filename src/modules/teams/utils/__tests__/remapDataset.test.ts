import { describe, expect, it } from "vitest"
import { remapDatasetIds } from "../remapDataset"

describe("remapDatasetIds", () => {
  const teams = [{ id: "a" }, { id: "b" }]
  const players = [
    { id: "p1", teamId: "a" },
    { id: "p2", teamId: "b" },
  ]

  it("leaves everything alone when nothing collides", () => {
    const out = remapDatasetIds(teams, players, new Set(["x"]), () => "new")
    expect(out.teams).toEqual(teams)
    expect(out.players).toEqual(players)
    expect(out.idMap.size).toBe(0)
  })

  it("renames a colliding team and moves its squad with it", () => {
    let n = 0
    const out = remapDatasetIds(teams, players, new Set(["a"]), () => `n${++n}`)
    expect(out.teams.map((t) => t.id)).toEqual(["n1", "b"])
    expect(out.players.map((p) => p.teamId)).toEqual(["n1", "b"])
    expect(out.idMap.get("a")).toBe("n1")
  })

  it("does not mutate its input", () => {
    remapDatasetIds(teams, players, new Set(["a"]), () => "z")
    expect(teams[0].id).toBe("a")
    expect(players[0].teamId).toBe("a")
  })
})
