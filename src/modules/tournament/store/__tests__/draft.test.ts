// store/__tests__/draft.test.ts
//
// Actions run against a plain copy and write back only the differences.
import { describe, expect, it } from "vitest"
import { computed, reactive, toRaw } from "vue"
import { clonePlain, patchInto } from "../draft"

describe("clonePlain", () => {
  it("copies deeply and keeps undefined fields", () => {
    const src = { a: [{ b: 1 }], c: undefined, d: "x", e: null }
    const copy = clonePlain(src)
    expect(copy).toEqual(src)
    expect("c" in copy).toBe(true)
    expect(copy.a).not.toBe(src.a)
    expect(copy.a[0]).not.toBe(src.a[0])
  })
})

function setup<T extends object>(value: T) {
  const live = reactive(value) as T
  const base = toRaw(live)
  const draft = clonePlain(base)
  return { live, base, draft }
}

describe("patchInto", () => {
  it("reports no change for an identical draft and keeps every object", () => {
    const { live, base, draft } = setup({ rounds: [{ matches: [{ id: "m", result: null }] }] })
    const before = live.rounds[0]
    expect(patchInto(live, base, draft)).toBe(false)
    expect(live.rounds[0]).toBe(before)
  })

  it("writes changed leaves in place, so nested objects keep their identity", () => {
    const { live, base, draft } = setup({
      rounds: [{ matches: [{ id: "m", result: null as { home: number; away: number } | null }] }],
    })
    const match = live.rounds[0].matches[0]
    draft.rounds[0].matches[0].result = { home: 2, away: 1 }
    expect(patchInto(live, base, draft)).toBe(true)
    expect(live.rounds[0].matches[0]).toBe(match)
    expect(match.result).toEqual({ home: 2, away: 1 })
  })

  it("triggers what depends on a changed field", () => {
    const { live, base, draft } = setup({ standings: [{ teamId: "a", pts: 0 }] })
    const pts = computed(() => live.standings[0].pts)
    expect(pts.value).toBe(0)
    draft.standings[0].pts = 3
    patchInto(live, base, draft)
    expect(pts.value).toBe(3)
  })

  it("grows, shrinks and reorders arrays", () => {
    const { live, base, draft } = setup({ list: [1, 2, 3], other: ["a", "b"] })
    draft.list.push(4)
    draft.other.length = 1
    patchInto(live, base, draft)
    expect(live.list).toEqual([1, 2, 3, 4])
    expect(live.other).toEqual(["a"])

    const again = setup({ rows: [{ id: "a" }, { id: "b" }] })
    again.draft.rows.reverse()
    patchInto(again.live, again.base, again.draft)
    expect(again.live.rows.map((r) => r.id)).toEqual(["b", "a"])
  })

  it("adds and removes keys", () => {
    const { live, base, draft } = setup<Record<string, unknown>>({ keep: 1, drop: 2 })
    delete draft.drop
    draft.added = { x: 1 }
    patchInto(live, base, draft)
    expect(live).toEqual({ keep: 1, added: { x: 1 } })
  })

  it("replaces a value whose type changed", () => {
    const { live, base, draft } = setup<{ v: unknown }>({ v: [1] })
    draft.v = { a: 1 }
    patchInto(live, base, draft)
    expect(live.v).toEqual({ a: 1 })
  })
})
