// store/__tests__/manualSave.test.ts
//
// Edits to a loaded tournament are not written on their own: they mark it
// unsaved, and only `saveNow` (the Save button) puts them on disk.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { nextTick } from "vue"
import { gunzipSync } from "node:zlib"
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

/** The stored record, decoded: the Save button writes it gzipped. */
const stored = () => {
  const raw = db.get("tournament:item:a")
  const text = raw instanceof Uint8Array ? gunzipSync(raw).toString("utf8") : (raw as string)
  return JSON.parse(text) as Tournament
}

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
    store.renameTournament("a", "Renamed")
    await nextTick()
    await new Promise((r) => setTimeout(r, 800))
    expect(store.hasUnsaved("a")).toBe(true)
    expect(stored().name).toBe("Cup a")
  })

  it("saveNow writes the edit and clears the mark", async () => {
    const store = await loaded()
    store.renameTournament("a", "Renamed")
    await nextTick()
    await expect(store.saveNow("a")).resolves.toBe(true)
    expect(stored().name).toBe("Renamed")
    expect(store.hasUnsaved("a")).toBe(false)
  })

  it("a failed write leaves it unsaved", async () => {
    const store = await loaded()
    store.renameTournament("a", "Renamed")
    await nextTick()
    failWrites = true
    await expect(store.saveNow("a")).resolves.toBe(false)
    expect(store.hasUnsaved("a")).toBe(true)
  })

  it("a deleted tournament is no longer unsaved", async () => {
    const store = await loaded()
    store.renameTournament("a", "Renamed")
    await nextTick()
    store.tournaments.splice(0, 1)
    await nextTick()
    expect(store.hasUnsaved("a")).toBe(false)
  })
})

describe("actions run on a draft", () => {
  it("a played match marks the tournament unsaved and shows up on the live object", async () => {
    const store = await loaded()
    const match = store.tournaments[0].rounds[0].matches[0]
    store.setResult("a", 0, 0, 2, 1)
    expect(store.hasUnsaved("a")).toBe(true)
    // Patched in place: the object a component holds is the one that changed.
    expect(store.tournaments[0].rounds[0].matches[0]).toBe(match)
    expect(match.result).toMatchObject({ home: 2, away: 1 })
  })

  it("a query neither marks the tournament nor changes it", async () => {
    const store = await loaded()
    store.getById("a")
    store.isTournamentFinished("a")
    store.hasAnyResults("a")
    expect(store.hasUnsaved("a")).toBe(false)
  })

  it("a new season started from an action reaches the live list", async () => {
    const store = await loaded()
    store.setResult("a", 0, 0, 2, 1)
    const id = store.newSeason("a", false)
    expect(id).toBeTruthy()
    expect(store.tournaments.map((t) => t.id)).toContain(id)
    expect(store.tournaments).toHaveLength(2)
  })
})
