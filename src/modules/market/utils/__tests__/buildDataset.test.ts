import { describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import { buildDataset, toMarketTeam } from "../buildDataset"
import { validateDataset } from "../validateDataset"

const team = (over: Partial<Team> = {}): Team => ({
  id: "t1",
  name: "Team",
  color: "#112233",
  power: 70,
  ...over,
})

describe("toMarketTeam", () => {
  it("drops images, crests, coach and categories", () => {
    const out = toMarketTeam(
      team({ image: "data:image/png;base64,AAAA", abbr: "TM", categories: { a: "b" } })
    )
    expect(Object.keys(out).sort()).toEqual(["color", "id", "name", "power"])
  })

  it("expands short hex colours and falls back on anything else", () => {
    expect(toMarketTeam(team({ color: "#abc" })).color).toBe("#aabbcc")
    expect(toMarketTeam(team({ color: "rgb(1,2,3)" })).color).toBe("#888888")
  })

  it("clamps power and truncates long names", () => {
    expect(toMarketTeam(team({ power: 250 })).power).toBe(100)
    expect(toMarketTeam(team({ power: 0 })).power).toBe(1)
    expect(toMarketTeam(team({ name: "x".repeat(80) })).name).toHaveLength(40)
  })
})

describe("buildDataset", () => {
  it("produces something validateDataset accepts", () => {
    const dataset = buildDataset({ label: " My set ", description: "Fun", type: "club" }, [
      team(),
      team({ id: "t2", flag: "tr", color: "#fff" }),
    ])
    expect(dataset.label).toBe("My set")
    expect(validateDataset(dataset)).not.toBeNull()
  })
})
