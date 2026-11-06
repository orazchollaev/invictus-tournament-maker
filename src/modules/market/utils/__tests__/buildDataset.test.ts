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
  it("keeps the abbreviation but drops uploaded images and categories", () => {
    const out = toMarketTeam(
      team({ image: "data:image/png;base64,AAAA", abbr: "TM", categories: { a: "b" } })
    )
    expect(Object.keys(out).sort()).toEqual(["abbr", "color", "id", "name", "power"])
  })

  it("ships a picture only as the shrunk copy it is handed", () => {
    const small = "data:image/webp;base64,AAAA"
    const out = toMarketTeam(team({ image: "data:image/png;base64,BBBB" }), small)
    expect(out.img).toBe(small)
    expect(toMarketTeam(team({ image: "data:image/png;base64,BBBB" })).img).toBeUndefined()
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

describe("team pictures in validateDataset", () => {
  const base = { label: "L", description: "D", type: "club" }
  const withImg = (img: unknown) =>
    validateDataset({
      ...base,
      teams: [{ id: "a", name: "A", color: "#112233", power: 5, img }],
    })

  it("keeps a small raster data-URL", () => {
    expect(withImg("data:image/webp;base64,AAAA")?.teams[0].img).toBe("data:image/webp;base64,AAAA")
  })

  it("drops svg, remote and oversized pictures without rejecting the team", () => {
    for (const bad of [
      "data:image/svg+xml;base64,AAAA",
      "https://example.com/a.png",
      "data:image/png;base64," + "A".repeat(9000),
    ]) {
      expect(withImg(bad)?.teams[0].img).toBeUndefined()
    }
  })
})

describe("buildDataset", () => {
  it("attaches shrunk pictures by team id", () => {
    const dataset = buildDataset(
      { label: "S", description: "D", type: "club" },
      [team({ id: "t1" }), team({ id: "t2" })],
      new Map([["t2", "data:image/webp;base64,AAAA"]])
    )
    expect(dataset.teams[0].img).toBeUndefined()
    expect(dataset.teams[1].img).toBe("data:image/webp;base64,AAAA")
  })

  it("produces something validateDataset accepts", () => {
    const dataset = buildDataset({ label: " My set ", description: "Fun", type: "club" }, [
      team(),
      team({ id: "t2", flag: "tr", color: "#fff" }),
    ])
    expect(dataset.label).toBe("My set")
    expect(validateDataset(dataset)).not.toBeNull()
  })
})
