// store/__tests__/hydrate.test.ts
//
// The launch path, end to end: whatever is on disk, `hydrate()` resolves and
// the store is usable afterwards. This is the test that stands for "the app
// opens" — main.ts awaits exactly this call before mounting, so a rejection
// here is a blank screen on a device the user cannot fix.
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import type { Tournament } from "@/modules/tournament/types"

const db = new Map<string, unknown>()
const fail = { get: null as string | null, keys: false }

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => {
    if (fail.get !== null && (fail.get === "*" || fail.get === key)) throw new Error("read failed")
    return db.get(key)
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    db.set(key, value)
  }),
  del: vi.fn(async (key: string) => {
    db.delete(key)
  }),
  keys: vi.fn(async () => {
    if (fail.keys) throw new Error("keys failed")
    return [...db.keys()]
  }),
}))

const legacy = new Map<string, string>()
vi.mock("@/lib/idbStorage", () => ({
  idbStorage: {
    getItem: vi.fn(async (key: string) => legacy.get(key)),
    setItem: vi.fn(async (key: string, value: string | Promise<string>) => {
      legacy.set(key, await value)
    }),
    removeItem: vi.fn(async (key: string) => {
      legacy.delete(key)
    }),
  },
}))

const { useTournamentStore } = await import("../index")

const ITEM = "tournament:item:"
const INDEX = "tournament:index"

function record(id: string): Tournament {
  return {
    id,
    name: `Cup ${id}`,
    season: 1,
    format: "bracket",
    teamIds: ["a", "b"],
    rounds: [{ name: "Final", matches: [{ id: `${id}-m`, homeId: "a", awayId: "b", result: null }] }],
    winnerId: null,
    createdAt: 1700000000000,
  }
}

function seed(...ids: string[]) {
  for (const id of ids) db.set(ITEM + id, JSON.stringify(record(id)))
  db.set(INDEX, JSON.stringify(ids))
}

beforeEach(() => {
  db.clear()
  legacy.clear()
  fail.get = null
  fail.keys = false
  setActivePinia(createPinia())
})

describe("hydrate", () => {
  it("loads what is on disk", async () => {
    seed("a", "b")
    const store = useTournamentStore()
    await store.hydrate()
    expect(store.tournaments.map((t) => t.id)).toEqual(["a", "b"])
  })

  it("starts empty on a fresh install", async () => {
    const store = useTournamentStore()
    await expect(store.hydrate()).resolves.toBeUndefined()
    expect(store.tournaments).toEqual([])
  })

  it("restores the selected tournament", async () => {
    seed("a")
    legacy.set("tournament", JSON.stringify({ active: "a", statsMigrated: true }))
    const store = useTournamentStore()
    await store.hydrate()
    expect(store.active).toBe("a")
    expect(store.statsMigrated).toBe(true)
  })

  it("opens with the good tournaments when one record is corrupt", async () => {
    seed("good")
    db.set(ITEM + "bad", '{"id":"bad","rounds":[')
    db.set(INDEX, JSON.stringify(["good", "bad"]))

    const store = useTournamentStore()
    await store.hydrate()
    expect(store.tournaments.map((t) => t.id)).toEqual(["good"])
  })

  it("opens with everything when the index is the thing that is corrupt", async () => {
    seed("a", "b")
    db.set(INDEX, "}{")

    const store = useTournamentStore()
    await store.hydrate()
    expect(store.tournaments.map((t) => t.id).sort()).toEqual(["a", "b"])
  })

  it("opens empty rather than not at all when storage is unreadable", async () => {
    seed("a")
    fail.get = "*"
    fail.keys = true

    const store = useTournamentStore()
    await expect(store.hydrate()).resolves.toBeUndefined()
    expect(store.tournaments).toEqual([])
  })

  it("opens when the meta read throws", async () => {
    seed("a")
    legacy.set("tournament", "not json")

    const store = useTournamentStore()
    await store.hydrate()
    expect(store.active).toBeNull()
    expect(store.tournaments.map((t) => t.id)).toEqual(["a"])
  })

  it("leaves the store usable after a corrupt launch", async () => {
    db.set(ITEM + "bad", "{{{")
    db.set(INDEX, "{{{")

    const store = useTournamentStore()
    await store.hydrate()

    // The proof that the app is not merely "not crashed": it still works.
    expect(() => store.create("New", ["a", "b"])).not.toThrow()
    expect(store.tournaments).toHaveLength(1)
  })

  it("does not write anything back before hydration has finished", async () => {
    seed("a")
    const { set } = await import("idb-keyval")
    const store = useTournamentStore()
    await store.hydrate()
    // Loading a list must not immediately save that same list back.
    const wroteRecords = vi
      .mocked(set)
      .mock.calls.filter(([key]) => String(key).startsWith(ITEM))
    expect(wroteRecords).toEqual([])
  })

  it("repairs an incomplete record instead of hiding it", async () => {
    db.set(
      ITEM + "partial",
      JSON.stringify({ id: "partial", name: "Old", season: 1, format: "league" })
    )
    db.set(INDEX, JSON.stringify(["partial"]))

    const store = useTournamentStore()
    await store.hydrate()

    expect(store.tournaments).toHaveLength(1)
    expect(store.tournaments[0].rounds).toEqual([])
    // And the derived reads every page performs do not throw on it.
    expect(() => store.isTournamentFinished("partial")).not.toThrow()
  })

  it("loads a custom tournament with its phase graph", async () => {
    const custom = {
      ...record("custom"),
      format: "custom",
      rounds: [],
      phases: [
        {
          id: "p1",
          name: "Table",
          kind: "league",
          pos: { x: 0, y: 0 },
          status: "active",
          teamIds: ["a", "b"],
          config: { kind: "league", league: { legMode: "single" } },
          league: {
            matchdays: [
              { name: "Matchday 1", matches: [{ id: "m1", homeId: "a", awayId: "b", result: null }] },
            ],
            standings: [],
            legMode: "single",
          },
        },
      ],
      phaseEdges: [],
    }
    db.set(ITEM + "custom", JSON.stringify(custom))
    db.set(INDEX, JSON.stringify(["custom"]))

    const store = useTournamentStore()
    await store.hydrate()

    expect(store.tournaments[0].phases).toHaveLength(1)
    expect(store.tournaments[0].phases?.[0].league?.matchdays).toHaveLength(1)
    // Usable, not just loaded.
    expect(() => store.setPhaseLeagueResult("custom", "p1", 0, 0, 1, 0)).not.toThrow()
    const saved = store.tournaments[0].phases?.[0].league?.matchdays[0].matches[0].result
    expect(saved).toMatchObject({ home: 1, away: 0 })
    // The store's stats sweep reaches inside a phase too — it walks the match
    // iterator, which now knows about phase containers.
    expect(saved?.stats).toBeTruthy()
  })
})
