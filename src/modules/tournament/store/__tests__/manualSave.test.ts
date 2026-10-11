// store/__tests__/manualSave.test.ts
//
// Edits to a loaded tournament are not written on their own: they mark it
// unsaved, and only `saveNow` (the Save button) puts them on disk.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { nextTick } from "vue"
import type { Tournament } from "@/modules/tournament/types"

const db = new Map<string, unknown>()
let failWrites = false

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => db.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (failWrites) throw new Error("quota")
    db.set(key, value)
  }),
  del: vi.fn(async (key: string) => {
    db.delete(key)
  }),
  keys: vi.fn(async () => [...db.keys()]),
}))
vi.mock("@/lib/idbStorage", () => ({
  idbStorage: {
    getItem: vi.fn(async () => undefined),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
  },
}))

const { useTournamentStore } = await import("../index")

function record(id: string): Tournament {
  return {
    id,
    name: `Cup ${id}`,
    season: 1,
    format: "bracket",
    teamIds: ["a", "b"],
    rounds: [
      { name: "Final", matches: [{ id: `${id}-m`, homeId: "a", awayId: "b", result: null }] },
    ],
    winnerId: null,
    createdAt: 1700000000000,
  }
}

async function loaded() {
  db.set("tournament:item:a", JSON.stringify(record("a")))
  db.set("tournament:index", JSON.stringify(["a"]))
  const store = useTournamentStore()
  await store.hydrate()
  return store
}

const stored = () => JSON.parse(db.get("tournament:item:a") as string) as Tournament

beforeEach(() => {
  db.clear()
  failWrites = false
  setActivePinia(createPinia())
})

describe("manual save", () => {
  it("a loaded tournament starts saved", async () => {
    const store = await loaded()
    expect(store.hasUnsaved("a")).toBe(false)
  })

  it("an edit marks it unsaved and does not touch the disk", async () => {
    const store = await loaded()
    store.tournaments[0].name = "Renamed"
    await nextTick()
    await new Promise((r) => setTimeout(r, 800))
    expect(store.hasUnsaved("a")).toBe(true)
    expect(stored().name).toBe("Cup a")
  })

  it("saveNow writes the edit and clears the mark", async () => {
    const store = await loaded()
    store.tournaments[0].name = "Renamed"
    await nextTick()
    await expect(store.saveNow("a")).resolves.toBe(true)
    expect(stored().name).toBe("Renamed")
    expect(store.hasUnsaved("a")).toBe(false)
  })

  it("a failed write leaves it unsaved", async () => {
    const store = await loaded()
    store.tournaments[0].name = "Renamed"
    await nextTick()
    failWrites = true
    await expect(store.saveNow("a")).resolves.toBe(false)
    expect(store.hasUnsaved("a")).toBe(true)
  })

  it("a deleted tournament is no longer unsaved", async () => {
    const store = await loaded()
    store.tournaments[0].name = "Renamed"
    await nextTick()
    store.tournaments.splice(0, 1)
    await nextTick()
    expect(store.hasUnsaved("a")).toBe(false)
  })
})
