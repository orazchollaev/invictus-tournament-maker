import { describe, expect, it } from "vitest"
import type { WeeklyTally } from "@/modules/market/types"
import { tallyWins, topOfWeek, weeksToSettle } from "../champions"

const row = (authorUid: string, count: number, week = 10): WeeklyTally => ({
  week,
  authorUid,
  authorName: authorUid.toUpperCase(),
  count,
})

describe("topOfWeek", () => {
  it("picks the most downloads", () => {
    expect(topOfWeek([row("a", 3), row("b", 9), row("c", 5)])?.authorUid).toBe("b")
  })

  it("has no winner in a week nobody downloaded anything", () => {
    expect(topOfWeek([])).toBeNull()
    expect(topOfWeek([row("a", 0)])).toBeNull()
  })

  it("breaks a tie the same way on every device", () => {
    expect(topOfWeek([row("b", 4), row("a", 4)])?.authorUid).toBe("a")
  })

  it("keeps the recorded winner on a tie, and only a higher count replaces it", () => {
    const recorded = row("b", 4)
    expect(topOfWeek([row("a", 4), row("b", 4)], recorded)?.authorUid).toBe("b")
    expect(topOfWeek([row("a", 5), row("b", 4)], recorded)?.authorUid).toBe("a")
  })
})

describe("tallyWins", () => {
  it("counts weeks won per creator", () => {
    const wins = tallyWins([row("a", 1, 1), row("b", 1, 2), row("a", 1, 3)])
    expect(wins.get("a")).toBe(2)
    expect(wins.get("b")).toBe(1)
    expect(wins.get("c")).toBeUndefined()
  })
})

describe("weeksToSettle", () => {
  it("settles every finished week since the last record", () => {
    expect(weeksToSettle(20, [16])).toEqual([17, 18, 19])
  })

  it("always rechecks the latest finished week", () => {
    expect(weeksToSettle(20, [19])).toEqual([19])
  })

  it("looks back only so far", () => {
    expect(weeksToSettle(100, [], 3)).toEqual([97, 98, 99])
  })
})
