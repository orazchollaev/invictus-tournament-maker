import { describe, expect, it } from "vitest"
import { validateDataset } from "../validateDataset"

const examples = import.meta.glob<unknown>("../../../../examples/*.json", {
  eager: true,
  import: "default",
})

const valid = () => ({
  label: "Test",
  description: "A test set",
  type: "club",
  teams: [
    { id: "a", name: "A", color: "#112233", power: 70, flag: "tr" },
    { id: "b", name: "B", color: "#445566", power: 60 },
  ],
})

describe("validateDataset", () => {
  it("accepts every bundled example dataset", () => {
    const entries = Object.entries(examples)
    expect(entries.length).toBeGreaterThan(0)
    for (const [file, data] of entries) {
      expect(validateDataset(data), file).not.toBeNull()
    }
  })

  it("drops unknown fields such as tournaments", () => {
    const out = validateDataset({ ...valid(), tournaments: [{}], evil: 1 })
    expect(out).not.toBeNull()
    expect(out).not.toHaveProperty("tournaments")
    expect(out).not.toHaveProperty("evil")
  })

  it("rejects non-objects and empty or oversized team lists", () => {
    expect(validateDataset(null)).toBeNull()
    expect(validateDataset([])).toBeNull()
    expect(validateDataset({ ...valid(), teams: [] })).toBeNull()
    const many = Array.from({ length: 129 }, (_, i) => ({
      id: `t${i}`,
      name: "T",
      color: "#000000",
      power: 50,
    }))
    expect(validateDataset({ ...valid(), teams: many })).toBeNull()
  })

  it("rejects a dataset with one bad team", () => {
    const bad = valid()
    bad.teams[1].power = 101
    expect(validateDataset(bad)).toBeNull()
    const badColor = valid()
    badColor.teams[0].color = "red"
    expect(validateDataset(badColor)).toBeNull()
  })

  it("rejects duplicate team ids and unknown type", () => {
    const dup = valid()
    dup.teams[1].id = "a"
    expect(validateDataset(dup)).toBeNull()
    expect(validateDataset({ ...valid(), type: "galaxy" })).toBeNull()
  })

  it("rejects blank or oversized strings", () => {
    expect(validateDataset({ ...valid(), label: "x".repeat(41) })).toBeNull()
    expect(validateDataset({ ...valid(), label: "   " })).toBeNull()
  })

  it("validates players against their teams", () => {
    const player = { id: "p1", teamId: "a", name: "P", position: "GK", power: 80, number: 1 }
    const withPlayers = { ...valid(), players: [player] }
    expect(validateDataset(withPlayers)?.players).toHaveLength(1)
    expect(validateDataset({ ...valid(), players: [{ ...player, teamId: "zzz" }] })).toBeNull()
    expect(validateDataset({ ...valid(), players: [{ ...player, position: "CB" }] })).toBeNull()
  })
})
