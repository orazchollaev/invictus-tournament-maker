import { get, set, del } from "idb-keyval"
import { idbStorage } from "@/lib/idbStorage"
import type { Tournament } from "../types"

const ITEM_PREFIX = "tournament:item:"
const INDEX_KEY = "tournament:index"
/** Pre-refactor key: pinia-plugin-persistedstate-2's whole-store blob. */
const LEGACY_KEY = "tournament"

function itemKey(id: string): string {
  return `${ITEM_PREFIX}${id}`
}

/** Idle-deferred, coalesced per tournament id — same trick as the store-wide version this replaces, just scoped to one record instead of the whole history. */
const scheduled = new Map<string, Promise<void>>()

function idle(run: () => void): Promise<void> {
  return new Promise((resolve) => {
    const fire = () => {
      run()
      resolve()
    }
    if (typeof requestIdleCallback === "function") requestIdleCallback(fire, { timeout: 500 })
    else setTimeout(fire, 0)
  })
}

/** Write one tournament's record. Coalesces bursts (a save fires several mutations) into the latest value only. */
export function saveTournament(t: Tournament): Promise<void> {
  const pending = scheduled.get(t.id)
  if (pending) return pending

  const promise = idle(() => {
    scheduled.delete(t.id)
    // `t` is read at idle time, not now, so a mutation that lands while this
    // is queued is the one that actually gets written — see idleSerialize
    // in main.ts for the same reasoning.
    const json = JSON.stringify(t)
    void set(itemKey(t.id), json)
  })
  scheduled.set(t.id, promise)
  return promise
}

export function deleteTournamentRecord(id: string): void {
  scheduled.delete(id)
  void del(itemKey(id))
}

export function saveIndex(ids: string[]): void {
  void set(INDEX_KEY, JSON.stringify(ids))
}

async function loadFromItems(): Promise<Tournament[] | null> {
  const rawIndex = await get(INDEX_KEY)
  if (rawIndex === undefined) return null
  const ids: string[] = JSON.parse(rawIndex)
  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const raw = await get(itemKey(id))
        return raw !== undefined ? (JSON.parse(raw) as Tournament) : null
      } catch {
        // One corrupted record (bad JSON, a storage read error) used to be
        // fatal for every tournament, not just this one — Promise.all
        // rejects on the first failure. Losing one tournament to bad data
        // is recoverable; losing the whole list on every launch isn't.
        return null
      }
    })
  )
  return items.filter((t): t is Tournament => t !== null)
}

/**
 * One-time upgrade: the old single-blob key held `{ tournaments: [...] }`
 * (via pinia-plugin-persistedstate-2). Split it into per-id records so
 * every save afterward only touches the one tournament that changed.
 */
async function migrateFromLegacyBlob(): Promise<Tournament[]> {
  const raw = await idbStorage.getItem(LEGACY_KEY)
  if (!raw) return []
  let tournaments: Tournament[] = []
  let legacyState: { active?: unknown; statsMigrated?: unknown } = {}
  try {
    const parsed = JSON.parse(raw)
    tournaments = Array.isArray(parsed?.tournaments) ? parsed.tournaments : []
    legacyState = { active: parsed?.active, statsMigrated: parsed?.statsMigrated }
  } catch {
    return []
  }
  await Promise.all(tournaments.map((t) => set(itemKey(t.id), JSON.stringify(t))))
  saveIndex(tournaments.map((t) => t.id))
  // The persistence plugin still owns `active`/`statsMigrated` under this
  // same key, and it won't necessarily be asked to write either of them
  // again this session (`migrateLegacyMatchStats` is a no-op once already
  // migrated, and nothing else is guaranteed to change before the app is
  // closed). So this *shrinks* the blob to just those two fields rather
  // than deleting the key outright — deleting it here and never having
  // anything rewrite it before the next launch would silently drop the
  // user's selected tournament. Shrinking still gets rid of the actual
  // weight (the old `tournaments` array) without depending on that.
  await set(LEGACY_KEY, JSON.stringify(legacyState))
  return tournaments
}

/** Load every tournament, migrating the legacy blob the first time this runs. */
export async function loadTournaments(): Promise<Tournament[]> {
  const fromItems = await loadFromItems()
  if (fromItems) return fromItems
  return migrateFromLegacyBlob()
}

/**
 * `active`/`statsMigrated` used to be persisted by pinia-plugin-persistedstate-2's
 * `$subscribe`, but that subscribes with `{ deep: true }` on the *whole* store
 * state regardless of `includePaths` — meaning every match save deep-traversed
 * every loaded tournament just to persist these two small fields. Read/written
 * by hand instead, from the same legacy key, so no migration is needed.
 */
export async function loadPersistedMeta(): Promise<{
  active: string | null
  statsMigrated: boolean
}> {
  try {
    const raw = await idbStorage.getItem(LEGACY_KEY)
    if (!raw) return { active: null, statsMigrated: false }
    const parsed = JSON.parse(raw)
    return { active: parsed?.active ?? null, statsMigrated: !!parsed?.statsMigrated }
  } catch {
    return { active: null, statsMigrated: false }
  }
}

export function saveMeta(active: string | null, statsMigrated: boolean): void {
  void idbStorage.setItem(LEGACY_KEY, JSON.stringify({ active, statsMigrated }))
}

async function currentIds(): Promise<string[]> {
  const raw = await get(INDEX_KEY)
  if (raw === undefined) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Wipe every tournament record and the index. Data management's "clear all
 * data" used to just delete the one legacy blob key — now that tournaments
 * live one-per-record, clearing has to walk the index and delete each item
 * too, or every tournament comes right back on the next launch.
 */
export async function clearAllTournaments(): Promise<void> {
  const ids = await currentIds()
  await Promise.all(ids.map((id) => del(itemKey(id))))
  await del(INDEX_KEY)
}

/**
 * Replace the whole tournament list at once — loading a sample dataset or
 * importing a backup. Clears every existing record first: writing the new
 * dataset's tournaments into their own keys is not enough on its own, since
 * whatever the *previous* dataset's ids were would otherwise stay in the
 * index (or as orphaned items) and come back alongside the new ones.
 */
export async function replaceAllTournaments(tournaments: Tournament[]): Promise<void> {
  await clearAllTournaments()
  await Promise.all(tournaments.map((t) => set(itemKey(t.id), JSON.stringify(t))))
  await set(INDEX_KEY, JSON.stringify(tournaments.map((t) => t.id)))
}
