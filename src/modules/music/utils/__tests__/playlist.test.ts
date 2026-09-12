import { describe, expect, it } from "vitest"
import type { MusicTrack } from "@/modules/music/types"
import { nextTrackId, previousTrackId, resolveTrack, shuffleOrder } from "../playlist"

function tracks(count: number): MusicTrack[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i}`,
    name: `Track ${i}`,
    source: "upload" as const,
    addedAt: i,
  }))
}

/** Deterministic stand-in for Math.random, cycling a fixed sequence. */
function seededRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe("nextTrackId", () => {
  it("walks forward and wraps at the end", () => {
    const list = tracks(3)
    expect(nextTrackId(list, "t0")).toBe("t1")
    expect(nextTrackId(list, "t2")).toBe("t0")
  })

  it("starts at the beginning for an id that is not in the list", () => {
    expect(nextTrackId(tracks(3), "gone")).toBe("t0")
    expect(nextTrackId(tracks(3), null)).toBe("t0")
  })

  it("has nothing to move to in an empty list", () => {
    expect(nextTrackId([], "t0")).toBeNull()
  })

  it("stays put with only one track", () => {
    expect(nextTrackId(tracks(1), "t0")).toBe("t0")
  })
})

describe("previousTrackId", () => {
  it("walks back and wraps at the start", () => {
    const list = tracks(3)
    expect(previousTrackId(list, "t2")).toBe("t1")
    expect(previousTrackId(list, "t0")).toBe("t2")
  })

  it("has nothing to move to in an empty list", () => {
    expect(previousTrackId([], "t0")).toBeNull()
  })
})

describe("shuffleOrder", () => {
  it("is a permutation — every track exactly once", () => {
    const list = tracks(8)
    for (let i = 0; i < 50; i++) {
      const order = shuffleOrder(list, null)
      expect(order).toHaveLength(8)
      expect(new Set(order).size).toBe(8)
      expect([...order].sort()).toEqual(list.map((track) => track.id).sort())
    }
  })

  it("never opens on the track that was just playing", () => {
    const list = tracks(5)
    for (let i = 0; i < 100; i++) {
      expect(shuffleOrder(list, "t2")[0]).not.toBe("t2")
    }
  })

  it("is deterministic under a seeded rng", () => {
    const list = tracks(6)
    const seed = [0.1, 0.9, 0.4, 0.6, 0.2, 0.8]
    expect(shuffleOrder(list, null, seededRng(seed))).toEqual(
      shuffleOrder(list, null, seededRng(seed))
    )
  })

  it("copes with an empty list and a single track", () => {
    expect(shuffleOrder([], null)).toEqual([])
    expect(shuffleOrder(tracks(1), "t0")).toEqual(["t0"])
  })
})

describe("resolveTrack", () => {
  it("finds the chosen track", () => {
    expect(resolveTrack(tracks(3), "t1")?.id).toBe("t1")
  })

  it("falls back to the first when the choice has gone", () => {
    expect(resolveTrack(tracks(3), "deleted")?.id).toBe("t0")
    expect(resolveTrack(tracks(3), null)?.id).toBe("t0")
  })

  it("has nothing to fall back to in an empty list", () => {
    expect(resolveTrack([], "t0")).toBeNull()
  })
})
