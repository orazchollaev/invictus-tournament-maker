// modules/tournament/services/__tests__/persistence.test.ts
//
// Storage failure tests. The rule every case here checks is the same one:
// IndexedDB is allowed to fail, and the app is not allowed to fail with it.
//
// These are the failures that actually happen on a phone — a database that
// will not open because another tab is mid-upgrade, a write refused for quota,
// a record truncated by a kill mid-save, an index that no longer parses — and
// each of them once ended the same way: loadTournaments rejected, hydrate never
// resolved, and the user got a blank screen with their data still on disk.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Tournament } from "@/modules/tournament/types"

/** An in-memory stand-in for IndexedDB, with failures we can switch on. */
const db = new Map<string, unknown>()
const fail = {
  get: null as string | null,
  set: null as string | null,
  keys: false,
  del: false,
}

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => {
    if (fail.get !== null && (fail.get === "*" || fail.get === key)) {
      throw new Error("read failed")
    }
    return db.get(key)
  }),
  set: vi.fn(async (key: string, value: unknown) => {
    if (fail.set !== null && (fail.set === "*" || fail.set === key)) {
      throw new Error("QuotaExceededError")
    }
    db.set(key, value)
  }),
  del: vi.fn(async (key: string) => {
    if (fail.del) throw new Error("delete failed")
    db.delete(key)
  }),
  keys: vi.fn(async () => {
    if (fail.keys) throw new Error("keys failed")
    return [...db.keys()]
  }),
}))

// The legacy-blob path goes through this rather than idb-keyval directly, and
// its real implementation reaches for localStorage, which node does not have.
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

const {
  loadTournaments,
  saveTournament,
  saveIndex,
  deleteTournamentRecord,
  clearAllTournaments,
  replaceAllTournaments,
  loadPersistedMeta,
} = await import("../persistence")

const ITEM = "tournament:item:"
const INDEX = "tournament:index"

function tournament(id: string, name = "Cup"): Tournament {
  return {
    id,
    name,
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

function seed(...ids: string[]) {
  for (const id of ids) db.set(ITEM + id, JSON.stringify(tournament(id)))
  db.set(INDEX, JSON.stringify(ids))
}

beforeEach(() => {
  db.clear()
  legacy.clear()
  fail.get = null
  fail.set = null
  fail.keys = false
  fail.del = false
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("loading", () => {
  it("returns the indexed tournaments, in the index's order", async () => {
    seed("b", "a")
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["b", "a"])
  })

  it("returns an empty list on a fresh install", async () => {
    expect(await loadTournaments()).toEqual([])
  })
})

describe("a corrupt index no longer costs every tournament", () => {
  it("recovers the records by scanning keys when the index will not parse", async () => {
    seed("a", "b")
    db.set(INDEX, "{not json")

    const loaded = await loadTournaments()
    expect(loaded.map((t) => t.id).sort()).toEqual(["a", "b"])
  })

  it("recovers when the index is missing entirely but records remain", async () => {
    seed("a", "b")
    db.delete(INDEX)

    expect((await loadTournaments()).map((t) => t.id).sort()).toEqual(["a", "b"])
  })

  it("recovers when the index holds something that is not a list", async () => {
    seed("a")
    db.set(INDEX, JSON.stringify({ ids: ["a"] }))
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["a"])
  })

  it("rewrites the index after a recovery, so it only happens once", async () => {
    seed("a", "b")
    db.set(INDEX, "{not json")
    await loadTournaments()
    expect(JSON.parse(db.get(INDEX) as string).sort()).toEqual(["a", "b"])
  })

  it("keeps a record the index had forgotten", async () => {
    seed("a")
    db.set(ITEM + "orphan", JSON.stringify(tournament("orphan")))
    const loaded = await loadTournaments()
    expect(loaded.map((t) => t.id)).toEqual(["a", "orphan"])
  })

  it("survives the index read itself throwing", async () => {
    seed("a")
    fail.get = INDEX
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["a"])
  })

  it("returns an empty list, not a rejection, when the whole database is unreadable", async () => {
    seed("a", "b")
    fail.get = "*"
    fail.keys = true
    await expect(loadTournaments()).resolves.toEqual([])
  })

  it("returns an empty list when the key scan fails and there is no index", async () => {
    seed("a")
    db.delete(INDEX)
    fail.keys = true
    await expect(loadTournaments()).resolves.toEqual([])
  })
})

describe("one bad record does not take the others down", () => {
  it("skips a record whose JSON was cut off mid-write", async () => {
    seed("good", "truncated")
    db.set(ITEM + "truncated", '{"id":"truncated","name":"Cu')

    const loaded = await loadTournaments()
    expect(loaded.map((t) => t.id)).toEqual(["good"])
  })

  it("skips a record that parses but is not a tournament", async () => {
    seed("good", "junk")
    db.set(ITEM + "junk", JSON.stringify({ hello: "world" }))
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["good"])
  })

  it("skips a record whose read throws", async () => {
    seed("good", "unreadable")
    fail.get = ITEM + "unreadable"
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["good"])
  })

  it("skips an id the index names but no record exists for", async () => {
    seed("good")
    db.set(INDEX, JSON.stringify(["good", "ghost"]))
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["good"])
  })

  it("drops the bad id from the index rather than asking for it again", async () => {
    seed("good", "junk")
    db.set(ITEM + "junk", "{{{")
    await loadTournaments()
    expect(JSON.parse(db.get(INDEX) as string)).toEqual(["good"])
  })

  it("repairs a record that is merely incomplete instead of dropping it", async () => {
    seed("good")
    // A save that lost its rounds array — previously fatal on first render.
    db.set(
      ITEM + "partial",
      JSON.stringify({ id: "partial", name: "Old", season: 1, format: "bracket" })
    )
    db.set(INDEX, JSON.stringify(["good", "partial"]))

    const loaded = await loadTournaments()
    expect(loaded.map((t) => t.id)).toEqual(["good", "partial"])
    expect(loaded[1].rounds).toEqual([])
    expect(loaded[1].teamIds).toEqual([])
  })

  it("loads a custom tournament and drops only the unusable phase", async () => {
    const custom = {
      ...tournament("custom"),
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
          league: { matchdays: [], standings: [], legMode: "single" },
        },
        { id: "p2", name: "Broken", kind: "league", config: { kind: "knockout" } },
      ],
      phaseEdges: [{ id: "e1", fromPhaseId: "p1", toPhaseId: "p2", fromRank: 1, toRank: 2 }],
    }
    db.set(ITEM + "custom", JSON.stringify(custom))
    db.set(INDEX, JSON.stringify(["custom"]))

    const loaded = await loadTournaments()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].phases?.map((p) => p.id)).toEqual(["p1"])
    expect(loaded[0].phaseEdges).toEqual([])
  })
})

describe("writing", () => {
  it("writes a tournament under its own key", async () => {
    await saveTournament(tournament("a"))
    expect(JSON.parse(db.get(ITEM + "a") as string).id).toBe("a")
  })

  it("resolves rather than rejecting when the write is refused for quota", async () => {
    fail.set = "*"
    await expect(saveTournament(tournament("a"))).resolves.toBeUndefined()
    expect(db.has(ITEM + "a")).toBe(false)
  })

  it("keeps working after a refused write", async () => {
    fail.set = "*"
    await saveTournament(tournament("a"))
    fail.set = null
    await saveTournament(tournament("a"))
    expect(db.has(ITEM + "a")).toBe(true)
  })

  it("does not reject when the value cannot be stringified", async () => {
    const circular = tournament("a") as unknown as Record<string, unknown>
    circular.self = circular
    await expect(saveTournament(circular as unknown as Tournament)).resolves.toBeUndefined()
  })

  it("coalesces a burst of saves for the same tournament", async () => {
    const t = tournament("a")
    const first = saveTournament(t)
    expect(saveTournament(t)).toBe(first)
    await first
  })

  it("swallows a failing index write", async () => {
    fail.set = INDEX
    expect(() => saveIndex(["a"])).not.toThrow()
  })

  it("swallows a failing delete", async () => {
    seed("a")
    fail.del = true
    expect(() => deleteTournamentRecord("a")).not.toThrow()
  })
})

describe("clearing and replacing", () => {
  it("clears every record, including one the index had lost", async () => {
    seed("a")
    db.set(ITEM + "orphan", JSON.stringify(tournament("orphan")))

    await clearAllTournaments()

    expect([...db.keys()].filter((k) => k.startsWith(ITEM))).toEqual([])
    expect(db.has(INDEX)).toBe(false)
  })

  it("replaces the whole list without leaving the old one behind", async () => {
    seed("old1", "old2")
    await replaceAllTournaments([tournament("new1")])

    expect([...db.keys()].filter((k) => k.startsWith(ITEM))).toEqual([ITEM + "new1"])
    expect(JSON.parse(db.get(INDEX) as string)).toEqual(["new1"])
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["new1"])
  })
})

describe("the legacy single-blob migration", () => {
  it("splits the old blob into one record per tournament", async () => {
    legacy.set(
      "tournament",
      JSON.stringify({ tournaments: [tournament("a"), tournament("b")], active: "a" })
    )

    const loaded = await loadTournaments()
    expect(loaded.map((t) => t.id)).toEqual(["a", "b"])
    expect(db.has(ITEM + "a")).toBe(true)
    expect(JSON.parse(db.get(INDEX) as string)).toEqual(["a", "b"])
  })

  it("keeps the selected tournament while shrinking the blob", async () => {
    legacy.set("tournament", JSON.stringify({ tournaments: [tournament("a")], active: "a" }))
    await loadTournaments()
    expect((await loadPersistedMeta()).active).toBe("a")
  })

  it("drops only the unusable entries of the old blob", async () => {
    legacy.set(
      "tournament",
      JSON.stringify({ tournaments: [tournament("a"), { id: "b" }, null, "x"] })
    )
    expect((await loadTournaments()).map((t) => t.id)).toEqual(["a"])
  })

  it("returns an empty list when the old blob will not parse", async () => {
    legacy.set("tournament", "{ truncated")
    await expect(loadTournaments()).resolves.toEqual([])
  })

  it("still returns the tournaments when writing the split records fails", async () => {
    legacy.set("tournament", JSON.stringify({ tournaments: [tournament("a")] }))
    fail.set = "*"
    await expect(loadTournaments()).resolves.toHaveLength(1)
  })

  it("reads meta as empty rather than throwing when the blob is broken", async () => {
    legacy.set("tournament", "not json")
    await expect(loadPersistedMeta()).resolves.toEqual({ active: null, statsMigrated: false })
  })
})
