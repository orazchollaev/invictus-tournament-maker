import { toRaw } from "vue"
import { get, set, del, keys } from "idb-keyval"
import { idbStorage } from "@/lib/idbStorage"
import type { Tournament } from "../types"
import { parseStoredTournament } from "./tournamentSchema"

const ITEM_PREFIX = "tournament:item:"
const INDEX_KEY = "tournament:index"
/** Pre-refactor key: pinia-plugin-persistedstate-2's whole-store blob. */
const LEGACY_KEY = "tournament"

function itemKey(id: string): string {
  return `${ITEM_PREFIX}${id}`
}

/**
 * How long a tournament must sit untouched before it is written. A simulation
 * run or a score edit fires dozens of mutations in a burst; without this each
 * burst still cost a full `JSON.stringify` of the tournament per idle slot.
 */
export const SAVE_DEBOUNCE_MS = 400
/** A tournament that keeps mutating still gets written at least this often. */
export const SAVE_MAX_WAIT_MS = 3000

interface PendingSave {
  tournament: Tournament
  promise: Promise<void>
  resolve: () => void
  timer: ReturnType<typeof setTimeout> | undefined
  startedAt: number
}

/** Debounced (trailing, with a max wait) and coalesced per tournament id. */
const scheduled = new Map<string, PendingSave>()

function idle(run: () => void): void {
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 500 })
  else setTimeout(run, 0)
}

/**
 * Serialise and store one tournament. Both halves can fail for reasons that
 * are not this tournament's fault: a storage quota that has just run out, a
 * private-mode database that refuses writes, a structure too deep to
 * stringify. An unhandled rejection here surfaced as a console error and
 * nothing else, and on the next launch as a record that was half a save
 * behind. Swallowing it keeps the app running on the state it already has in
 * memory; the next save attempt is one mutation away.
 */
function writeTournament(t: Tournament): void {
  try {
    // t is a Pinia-reactive proxy; JSON.stringify walks every property of
    // every nested match/group/team through the Proxy's get trap, which
    // gets very slow on a large tournament (hundreds of teams, thousands
    // of matches). toRaw hands stringify the plain underlying object
    // instead, so the walk is a normal property read the whole way down.
    const json = JSON.stringify(toRaw(t))
    void Promise.resolve(set(itemKey(t.id), json)).catch(() => {})
  } catch {}
}

/**
 * Start the write for a pending save. `immediate` skips the idle wait — used
 * when the app is going to the background and there may be no later slot.
 */
function firePending(id: string, immediate: boolean): void {
  const pending = scheduled.get(id)
  if (!pending) return
  clearTimeout(pending.timer)
  scheduled.delete(id)
  const finish = () => {
    // The tournament is read now, not when the save was requested, so a
    // mutation that landed while this was queued is the one actually written.
    writeTournament(pending.tournament)
    pending.resolve()
  }
  if (immediate) finish()
  else idle(finish)
}

/** Write one tournament's record, after a short quiet period. Bursts collapse into the latest value only. */
export function saveTournament(t: Tournament): Promise<void> {
  const existing = scheduled.get(t.id)
  if (existing) {
    existing.tournament = t
    // Push the write back while mutations keep arriving, but never past the
    // max wait: a long continuous run must not leave the disk arbitrarily stale.
    if (Date.now() - existing.startedAt < SAVE_MAX_WAIT_MS) {
      clearTimeout(existing.timer)
      existing.timer = setTimeout(() => firePending(t.id, false), SAVE_DEBOUNCE_MS)
    }
    return existing.promise
  }

  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  scheduled.set(t.id, {
    tournament: t,
    promise,
    resolve,
    startedAt: Date.now(),
    timer: setTimeout(() => firePending(t.id, false), SAVE_DEBOUNCE_MS),
  })
  return promise
}

/** Write everything still waiting out its debounce, right now. Call when the app is hidden. */
export function flushPendingSaves(): void {
  for (const id of [...scheduled.keys()]) firePending(id, true)
}

/** Drop queued writes without performing them (their promises still resolve). */
function cancelPendingSaves(ids?: string[]): void {
  for (const id of ids ?? [...scheduled.keys()]) {
    const pending = scheduled.get(id)
    if (!pending) continue
    clearTimeout(pending.timer)
    scheduled.delete(id)
    pending.resolve()
  }
}

// A debounce means the newest edits can exist only in memory for a moment.
// Android may kill a backgrounded WebView without any later idle slot, so the
// queue is flushed the instant the page is hidden.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingSaves()
  })
  window.addEventListener("pagehide", flushPendingSaves)
}

export function deleteTournamentRecord(id: string): void {
  cancelPendingSaves([id])
  void del(itemKey(id))
}

export function saveIndex(ids: string[]): void {
  void set(INDEX_KEY, JSON.stringify(ids))
}

/**
 * Every tournament id the database actually holds a record for, read off the
 * keys themselves rather than the index.
 *
 * The index is a convenience — it keeps the user's ordering and saves a key
 * scan — but it is also a single point of failure: one unparseable index and
 * every tournament on disk becomes invisible, which is exactly the launch this
 * used to produce. This is the way back from that.
 */
async function recoverIdsFromKeys(): Promise<string[]> {
  try {
    const all = await keys()
    return all
      .filter((k): k is string => typeof k === "string" && k.startsWith(ITEM_PREFIX))
      .map((k) => k.slice(ITEM_PREFIX.length))
      .filter((id) => id.length > 0)
  } catch {
    return []
  }
}

/** The stored index, or null when there is none to read. Never throws. */
async function readIndex(): Promise<string[] | null> {
  let rawIndex: unknown
  try {
    rawIndex = await get(INDEX_KEY)
  } catch {
    // The read itself failed (a blocked or upgrading database), which says
    // nothing about the records — fall through to the key scan.
    return null
  }
  if (rawIndex === undefined) return null
  if (Array.isArray(rawIndex)) return rawIndex.filter((id): id is string => typeof id === "string")
  if (typeof rawIndex !== "string") return null
  try {
    const parsed = JSON.parse(rawIndex)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((id): id is string => typeof id === "string")
  } catch {
    return null
  }
}

async function loadFromItems(): Promise<Tournament[] | null> {
  const indexed = await readIndex()
  const recovered = await recoverIdsFromKeys()
  // Nothing indexed and no records: a first run, so the legacy migration below
  // gets its turn. Only that combination means "no per-record storage yet".
  if (indexed === null && recovered.length === 0) return null

  // The index leads, because it carries the order the user sees. Anything the
  // key scan turns up that the index has lost is appended rather than dropped:
  // a record whose index entry never landed is still the user's tournament.
  const ids = indexed ? [...indexed] : []
  const seen = new Set(ids)
  for (const id of recovered) {
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const raw = await get(itemKey(id))
        if (raw === undefined) return null
        // Parsed *and* checked: valid JSON is not the same as a usable
        // tournament, and it was the second gap that emptied the screen.
        // See services/tournamentSchema.ts.
        return parseStoredTournament(raw)
      } catch {
        // One corrupted record (bad JSON, a storage read error) used to be
        // fatal for every tournament, not just this one — Promise.all
        // rejects on the first failure. Losing one tournament to bad data
        // is recoverable; losing the whole list on every launch isn't.
        return null
      }
    })
  )
  const loaded = items.filter((t): t is Tournament => t !== null)

  // Put the index back in agreement with what actually loaded, so a recovery
  // only has to happen once and a dropped record stops being asked for.
  const loadedIds = loaded.map((t) => t.id)
  if (!indexed || indexed.join("|") !== loadedIds.join("|")) saveIndex(loadedIds)
  return loaded
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
    // Checked on the way in, not just parsed: the blob is the oldest data the
    // app has and the most likely to predate a field something now reads.
    tournaments = (Array.isArray(parsed?.tournaments) ? parsed.tournaments : [])
      .map(parseStoredTournament)
      .filter((t: Tournament | null): t is Tournament => t !== null)
    legacyState = { active: parsed?.active, statsMigrated: parsed?.statsMigrated }
  } catch {
    return []
  }
  // A write that fails must not abort the migration — the tournaments are
  // already in hand and returned either way, so the worst case is that the
  // split runs again next launch rather than the user seeing nothing.
  await Promise.all(
    tournaments.map((t) =>
      Promise.resolve(set(itemKey(t.id), JSON.stringify(toRaw(t)))).catch(() => {})
    )
  )
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
  // Guarded like the record writes above, and for the same reason: the
  // tournaments have already been read successfully, and a storage refusal
  // here must not turn a working migration into an empty library.
  await Promise.resolve(set(LEGACY_KEY, JSON.stringify(legacyState))).catch(() => {})
  return tournaments
}

/**
 * Load every tournament, migrating the legacy blob the first time this runs.
 *
 * Resolves to a list in every case, including total storage failure. The store
 * guards its own call as well, but a rejection escaping this far once meant the
 * app never mounted, so it does not get to escape.
 */
export async function loadTournaments(): Promise<Tournament[]> {
  try {
    const fromItems = await loadFromItems()
    if (fromItems) return fromItems
  } catch {
    return []
  }
  try {
    return await migrateFromLegacyBlob()
  } catch {
    return []
  }
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

/**
 * Every id a delete-everything pass has to visit. The key scan is included
 * because a record the index has lost would otherwise survive the wipe and
 * come back on the next launch.
 */
async function currentIds(): Promise<string[]> {
  const indexed = (await readIndex()) ?? []
  const recovered = await recoverIdsFromKeys()
  return [...new Set([...indexed, ...recovered])]
}

/**
 * Wipe every tournament record and the index. Data management's "clear all
 * data" used to just delete the one legacy blob key — now that tournaments
 * live one-per-record, clearing has to walk the index and delete each item
 * too, or every tournament comes right back on the next launch.
 */
export async function clearAllTournaments(): Promise<void> {
  // A queued save would otherwise land after the clear and resurrect a record.
  cancelPendingSaves()
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
  await Promise.all(tournaments.map((t) => set(itemKey(t.id), JSON.stringify(toRaw(t)))))
  await set(INDEX_KEY, JSON.stringify(tournaments.map((t) => t.id)))
}
