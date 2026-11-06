import { FIREBASE_WEB_CONFIG } from "@/constants/firebase"
import {
  ANNOUNCEMENTS_COLLECTION,
  CACHE_KEY,
  CACHE_TTL_MS,
  CLOCK_TOLERANCE_MS,
  FETCH_TIMEOUT_MS,
  QUERY_LIMIT,
} from "../constants"
import type { Announcement } from "../types"
import { decodeFields, documentId, type RunQueryRow } from "../utils/firestoreRest"
import { parseAnnouncement } from "../utils/validate"

// Public read, no auth: see `match /announcements` in firestore.rules.
const ENDPOINT = `https://firestore.googleapis.com/v1/projects/${FIREBASE_WEB_CONFIG.projectId}/databases/(default)/documents:runQuery`

export interface AnnouncementFeed {
  items: Announcement[]
  /** Device time of the fetch. */
  fetchedAt: number
  /** Server time − device time, ms. Add it to Date.now() for the real time. */
  clockOffset: number
}

async function fetchFeed(): Promise<AnnouncementFeed> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: ANNOUNCEMENTS_COLLECTION }],
          where: {
            fieldFilter: {
              field: { fieldPath: "endAt" },
              op: "GREATER_THAN",
              value: { timestampValue: new Date(Date.now() - CLOCK_TOLERANCE_MS).toISOString() },
            },
          },
          limit: QUERY_LIMIT,
        },
      }),
    })
    if (!res.ok) throw new Error(`announcements: HTTP ${res.status}`)
    const rows = (await res.json()) as RunQueryRow[]
    const fetchedAt = Date.now()

    const items: Announcement[] = []
    for (const row of rows) {
      if (!row.document) continue
      const id = documentId(row.document.name)
      const parsed = parseAnnouncement(id, decodeFields(row.document.fields ?? {}))
      if (parsed.ok) items.push(parsed.announcement)
      else if (import.meta.env.DEV) console.warn(`[announcements] skipped "${id}"`, parsed.errors)
    }

    const serverTime = Date.parse(rows[0]?.readTime ?? "")
    return {
      items,
      fetchedAt,
      clockOffset: Number.isFinite(serverTime) ? serverTime - fetchedAt : 0,
    }
  } finally {
    clearTimeout(timer)
  }
}

function readCache(): AnnouncementFeed | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const feed = JSON.parse(raw) as AnnouncementFeed
    return Array.isArray(feed?.items) && typeof feed.fetchedAt === "number" ? feed : null
  } catch {
    return null
  }
}

function writeCache(feed: AnnouncementFeed) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(feed))
  } catch {
    // storage full or blocked: the next launch just fetches again
  }
}

/**
 * Every announcement that has not ended, from a cache younger than an hour or
 * from Firestore. Offline or failing, it falls back to whatever was cached last
 * — dates are checked again on the device, so a stale list cannot show an
 * expired announcement. Never throws.
 */
export async function loadAnnouncements(): Promise<AnnouncementFeed> {
  const cached = readCache()
  const age = cached ? Date.now() - cached.fetchedAt : Infinity
  // A negative age means the clock was turned back since: don't trust the cache.
  if (cached && age >= 0 && age < CACHE_TTL_MS) return cached
  try {
    const feed = await fetchFeed()
    writeCache(feed)
    return feed
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[announcements] fetch failed", error)
    return cached ?? { items: [], fetchedAt: 0, clockOffset: 0 }
  }
}
