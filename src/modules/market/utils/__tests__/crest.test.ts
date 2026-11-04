import { describe, expect, it } from "vitest"
import { randomCrest, renderCrestDataUrl } from "@/engine/crest"
import type { Team } from "@/modules/teams/types"
import { parseCrest } from "../parseCrest"
import { toMarketTeam } from "../buildDataset"
import { toLocalTeam } from "../toLocalTeam"
import { validateDataset } from "../validateDataset"
import { decodeDataset, encodeDataset } from "../codec"

// A fixed seed keeps the generated crests the same from run to run.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const crest = () => randomCrest(seeded(42), "#c8102e")

describe("parseCrest", () => {
  it("accepts every crest the builder generates", () => {
    const rand = seeded(7)
    for (let i = 0; i < 200; i++) {
      const spec = randomCrest(rand, "#0b3d91")
      expect(parseCrest(spec), JSON.stringify(spec)).toEqual(spec)
    }
  })

  it("rejects colours that are not plain hex — they go into SVG unescaped", () => {
    const bad = crest()
    bad.colors.field = '#fff" onload="alert(1)'
    expect(parseCrest(bad)).toBeNull()
    expect(parseCrest({ ...crest(), colors: { ...crest().colors, emblem: "red" } })).toBeNull()
  })

  it("rejects malformed fields", () => {
    expect(parseCrest(null)).toBeNull()
    expect(parseCrest({ ...crest(), v: 2 })).toBeNull()
    expect(parseCrest({ ...crest(), stars: 9 })).toBeNull()
    expect(parseCrest({ ...crest(), year: "19<b>" })).toBeNull()
    expect(parseCrest({ ...crest(), shape: "../x" })).toBeNull()
    expect(parseCrest({ ...crest(), emblem: { kind: "charge", id: "<svg>" } })).toBeNull()
    expect(parseCrest({ ...crest(), layout: { emblem: { pos: "everywhere" } } })).toBeNull()
  })

  it("drops unknown keys", () => {
    expect(parseCrest({ ...crest(), evil: "x" })).not.toHaveProperty("evil")
  })
})

describe("sharing a crest", () => {
  const team: Team = {
    id: "t1",
    name: "Aries FC",
    color: "#c8102e",
    power: 80,
    abbr: "ARI",
    crest: crest(),
    image: "data:image/svg+xml;utf8,big",
  }

  it("publishes the recipe and abbreviation, never the image", () => {
    const out = toMarketTeam(team)
    expect(out.crest).toEqual(team.crest)
    expect(out.abbr).toBe("ARI")
    expect(out).not.toHaveProperty("image")
  })

  it("survives the trip through the market", async () => {
    const dataset = { label: "Zodiac", description: "12 signs", type: "club" as const }
    const packed = await encodeDataset({ ...dataset, teams: [toMarketTeam(team)] })
    const back = await decodeDataset(packed)
    expect(back?.teams[0].crest).toEqual(team.crest)
  })

  it("is redrawn on download exactly as the builder draws it", () => {
    const local = toLocalTeam(toMarketTeam(team), renderCrestDataUrl)
    expect(local.crest).toEqual(team.crest)
    expect(local.image).toBe(renderCrestDataUrl(team.crest!, { name: "Aries FC", abbr: "ARI" }))
    expect(local.image?.startsWith("data:image/svg+xml")).toBe(true)
  })

  it("keeps a team whose crest is invalid, just without the crest", () => {
    const raw = {
      label: "x",
      description: "y",
      type: "club",
      teams: [{ ...toMarketTeam(team), crest: { ...crest(), colors: { field: "nope" } } }],
    }
    const clean = validateDataset(raw)
    expect(clean?.teams).toHaveLength(1)
    expect(clean?.teams[0]).not.toHaveProperty("crest")
  })

  it("falls back to the flag when there is no crest", () => {
    const local = toLocalTeam({ id: "a", name: "A", color: "#000000", power: 50, flag: "tr" })
    expect(local.flag).toBe("tr")
    expect(local).not.toHaveProperty("image")
  })
})
