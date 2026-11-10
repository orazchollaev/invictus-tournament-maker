import { FirebaseFirestore, type QueryNonFilterConstraint } from "@capacitor-firebase/firestore"
import { CREATORS_LIMIT, PAGE_SIZE } from "../constants"
import type {
  MarketCreator,
  MarketDataset,
  MarketListing,
  MarketSort,
  MarketUser,
  ReportReason,
  WeeklyTally,
} from "../types"
import { decodeDataset, encodeDataset } from "../utils/codec"
import { weekOf } from "../utils/week"
import { ensureFirebase } from "@/lib/firebase"
import { USE_DEV_MOCK } from "./authService"

// Desktop `pnpm dev` has no native Firebase; see devMock.ts.
const mock = () => import("./devMock")

// Collections — see firestore.rules for who may do what.
const DATASETS = "datasets"
const PAYLOADS = "payloads"
const REPORTS = "reports"
/** One document per (dataset, downloader): what makes a download count once. */
const DOWNLOADS = "downloads"
/** Per-creator totals for the creators list. */
const CREATORS = "creators"
/** Per-creator download counts for one week, `{week}_{authorUid}`. */
const WEEKLY = "weekly"
/** The settled winner of each finished week, `{week}`. */
const WINNERS = "winners"

// Used directly, never returned from an async helper — see the note in
// authService.ts: a plugin passed through a promise is taken for a thenable and hangs.

const SERVER_TIMESTAMP = { __type__: "serverTimestamp" } as const
const increment = (operand: number) => ({ __type__: "increment", operand }) as const

interface ListingData {
  label: string
  description: string
  type: MarketListing["type"]
  category?: MarketListing["category"]
  teamCount: number
  playerCount: number
  authorUid: string
  authorName: string
  downloads: number
  createdAt?: { seconds?: number; nanoseconds?: number } | number | null
}

function toListing(id: string, data: ListingData): MarketListing {
  const created = data.createdAt
  const createdAt =
    typeof created === "number" ? created : created?.seconds ? created.seconds * 1000 : 0
  return {
    id,
    label: data.label,
    description: data.description,
    type: data.type,
    category: data.category,
    teamCount: data.teamCount,
    playerCount: data.playerCount ?? 0,
    authorUid: data.authorUid,
    authorName: data.authorName,
    downloads: data.downloads ?? 0,
    createdAt,
  }
}

export interface ListPage {
  items: MarketListing[]
  /** Pass back to `listDatasets` to get the next page; null when there is none. */
  cursor: string | null
}

/**
 * One page of listings, newest or most downloaded first. Reads only the small
 * listing documents — the heavy payload is fetched on download — so a page
 * costs PAGE_SIZE reads (+1 when continuing from a cursor).
 */
export async function listDatasets(sort: MarketSort, cursor?: string | null): Promise<ListPage> {
  if (USE_DEV_MOCK) return (await mock()).listDatasets(sort, cursor)
  await ensureFirebase()
  const constraints: QueryNonFilterConstraint[] = [
    {
      type: "orderBy",
      fieldPath: sort === "popular" ? "downloads" : "createdAt",
      directionStr: "desc",
    },
  ]
  if (cursor) constraints.push({ type: "startAfter", reference: `${DATASETS}/${cursor}` })
  constraints.push({ type: "limit", limit: PAGE_SIZE })

  const { snapshots } = await FirebaseFirestore.getCollection<ListingData>({
    reference: DATASETS,
    queryConstraints: constraints,
  })
  const items = snapshots.filter((s) => s.data).map((s) => toListing(s.id, s.data as ListingData))
  return {
    items,
    cursor: snapshots.length === PAGE_SIZE ? snapshots[snapshots.length - 1].id : null,
  }
}

/** Every dataset the signed-in user has published. */
export async function listMyDatasets(uid: string): Promise<MarketListing[]> {
  if (USE_DEV_MOCK) return (await mock()).listMyDatasets(uid)
  await ensureFirebase()
  const { snapshots } = await FirebaseFirestore.getCollection<ListingData>({
    reference: DATASETS,
    compositeFilter: {
      type: "and",
      queryConstraints: [{ type: "where", fieldPath: "authorUid", opStr: "==", value: uid }],
    },
  })
  return snapshots
    .filter((s) => s.data)
    .map((s) => toListing(s.id, s.data as ListingData))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Fetches and validates a dataset, for previewing or downloading. Returns null
 * when the payload is missing or does not pass validation. Does not touch the
 * download counter — see `countDownload`.
 */
export async function fetchDataset(id: string): Promise<MarketDataset | null> {
  if (USE_DEV_MOCK) return (await mock()).downloadDataset(id)
  await ensureFirebase()
  const { snapshot } = await FirebaseFirestore.getDocument<{ data: string }>({
    reference: `${PAYLOADS}/${id}`,
  })
  return decodeDataset(snapshot.data?.data)
}

/**
 * Counts a download once per user per dataset, never the author's own. One
 * batch writes the download record and bumps the dataset's counter, the
 * creator's total and their tally for this week — the rules accept the bumps
 * only alongside a first-time record, so a repeat download fails as a whole and
 * counts nothing. Best effort: it never fails the download itself.
 */
export async function countDownload(listing: MarketListing, user: MarketUser): Promise<void> {
  if (listing.authorUid === user.uid) return
  if (USE_DEV_MOCK) return (await mock()).countDownload(listing, user)
  const week = weekOf(Date.now())
  try {
    await ensureFirebase()
    await FirebaseFirestore.writeBatch({
      operations: [
        {
          type: "set",
          reference: `${DOWNLOADS}/${listing.id}_${user.uid}`,
          data: { datasetId: listing.id, uid: user.uid, week, createdAt: SERVER_TIMESTAMP },
        },
        {
          type: "update",
          reference: `${DATASETS}/${listing.id}`,
          data: { downloads: increment(1) },
        },
        {
          type: "set",
          reference: `${WEEKLY}/${week}_${listing.authorUid}`,
          data: {
            week,
            authorUid: listing.authorUid,
            authorName: listing.authorName,
            count: increment(1),
            lastDownload: listing.id,
          },
          options: { merge: true },
        },
        {
          type: "set",
          reference: `${CREATORS}/${listing.authorUid}`,
          data: { name: listing.authorName, downloads: increment(1), lastDownload: listing.id },
          options: { merge: true },
        },
      ],
    })
  } catch {
    // Already counted, the author's own, or offline: the dataset was added regardless.
  }
}

interface CreatorData {
  name: string
  datasets?: number
  downloads?: number
}

/** The creators with the most downloads, all time. */
export async function listCreators(): Promise<MarketCreator[]> {
  if (USE_DEV_MOCK) return (await mock()).listCreators()
  await ensureFirebase()
  const { snapshots } = await FirebaseFirestore.getCollection<CreatorData>({
    reference: CREATORS,
    queryConstraints: [
      { type: "orderBy", fieldPath: "downloads", directionStr: "desc" },
      { type: "limit", limit: CREATORS_LIMIT },
    ],
  })
  return snapshots
    .filter((s) => s.data)
    .map((s) => {
      const d = s.data as CreatorData
      return {
        uid: s.id,
        name: d.name,
        datasets: Math.max(0, d.datasets ?? 0),
        downloads: d.downloads ?? 0,
      }
    })
    .filter((c) => c.datasets > 0 || c.downloads > 0)
}

function toTally(data: WeeklyTally): WeeklyTally {
  return {
    week: data.week,
    authorUid: data.authorUid,
    authorName: data.authorName,
    count: data.count ?? 0,
  }
}

/** Every settled week's winner. One small document per week. */
export async function listWinners(): Promise<WeeklyTally[]> {
  if (USE_DEV_MOCK) return (await mock()).listWinners()
  await ensureFirebase()
  const { snapshots } = await FirebaseFirestore.getCollection<WeeklyTally>({
    reference: WINNERS,
  })
  return snapshots.filter((s) => s.data).map((s) => toTally(s.data as WeeklyTally))
}

/**
 * Every creator's tally for one week. An equality filter only, sorted on the
 * device: a week has one document per creator who was downloaded at all, and
 * ordering on the server would need a composite index for no real gain.
 */
export async function listWeek(week: number): Promise<WeeklyTally[]> {
  if (USE_DEV_MOCK) return (await mock()).listWeek(week)
  await ensureFirebase()
  const { snapshots } = await FirebaseFirestore.getCollection<WeeklyTally>({
    reference: WEEKLY,
    compositeFilter: {
      type: "and",
      queryConstraints: [{ type: "where", fieldPath: "week", opStr: "==", value: week }],
    },
  })
  return snapshots.filter((s) => s.data).map((s) => toTally(s.data as WeeklyTally))
}

/**
 * Records a finished week's winner. The rules check the count against that
 * week's tally and let only a higher one replace a record, so any signed-in
 * device may settle it. Best effort: the screen shows the winner either way.
 */
export async function recordWinner(winner: WeeklyTally): Promise<void> {
  if (USE_DEV_MOCK) return
  try {
    await ensureFirebase()
    await FirebaseFirestore.setDocument({
      reference: `${WINNERS}/${winner.week}`,
      data: { ...winner },
    })
  } catch {
    // Someone else settled it first, or offline.
  }
}

/**
 * Publishes listing + payload in one atomic batch (the rules require the payload
 * to arrive together with its listing). Returns the new dataset id. Throws
 * "invalid-dataset" or "too-large" before anything is sent.
 */
export async function publishDataset(dataset: MarketDataset, author: MarketUser): Promise<string> {
  if (USE_DEV_MOCK) return (await mock()).publishDataset(dataset, author)
  await ensureFirebase()
  const payload = await encodeDataset(dataset)
  const id = crypto.randomUUID()
  const listing: Record<string, unknown> = {
    label: dataset.label,
    description: dataset.description,
    type: dataset.type,
    teamCount: dataset.teams.length,
    playerCount: dataset.players?.length ?? 0,
    authorUid: author.uid,
    authorName: author.name.slice(0, 60),
    downloads: 0,
    createdAt: SERVER_TIMESTAMP,
  }
  if (dataset.category) listing.category = dataset.category

  const publish = [
    { type: "set" as const, reference: `${DATASETS}/${id}`, data: listing },
    {
      type: "set" as const,
      reference: `${PAYLOADS}/${id}`,
      data: { authorUid: author.uid, data: payload },
    },
  ]
  try {
    await FirebaseFirestore.writeBatch({
      operations: [
        ...publish,
        {
          type: "set",
          reference: `${CREATORS}/${author.uid}`,
          data: { name: listing.authorName, datasets: increment(1), lastDataset: id },
          options: { merge: true },
        },
      ],
    })
  } catch {
    // The creator count is a nicety; publishing must not depend on it (e.g.
    // while firestore.rules without the creators block is still live).
    // scripts/backfill-creators.ts puts the count right.
    await FirebaseFirestore.writeBatch({ operations: publish })
  }
  return id
}

/** Deletes one of the user's datasets (listing + payload) and takes it off their count. */
export async function deleteDataset(id: string, authorUid: string): Promise<void> {
  if (USE_DEV_MOCK) return (await mock()).deleteDataset(id)
  await ensureFirebase()
  const remove = [
    { type: "delete" as const, reference: `${DATASETS}/${id}` },
    { type: "delete" as const, reference: `${PAYLOADS}/${id}` },
  ]
  try {
    await FirebaseFirestore.writeBatch({
      operations: [
        ...remove,
        {
          type: "set",
          reference: `${CREATORS}/${authorUid}`,
          data: { datasets: increment(-1), lastDataset: id },
          options: { merge: true },
        },
      ],
    })
  } catch {
    // A creator with no totals document yet (published before creators
    // existed) cannot be decremented. Deleting still has to work; the count is
    // put right by scripts/backfill-creators.ts.
    await FirebaseFirestore.writeBatch({ operations: remove })
  }
}

/** One report per user per dataset; reporting twice is a no-op error the caller ignores. */
export async function reportDataset(
  datasetId: string,
  reporterUid: string,
  reason: ReportReason
): Promise<void> {
  if (USE_DEV_MOCK) return
  await ensureFirebase()
  await FirebaseFirestore.setDocument({
    reference: `${REPORTS}/${datasetId}_${reporterUid}`,
    data: { datasetId, reporterUid, reason, createdAt: SERVER_TIMESTAMP },
  })
}

/** Removes everything the user published. Run before deleting the account. */
export async function deleteMyData(uid: string): Promise<number> {
  if (USE_DEV_MOCK) return (await mock()).deleteMyData(uid)
  await ensureFirebase()
  const mine = await listMyDatasets(uid)
  const firestore = FirebaseFirestore
  // Batches are capped at 500 writes; two per dataset.
  for (let i = 0; i < mine.length; i += 200) {
    const operations = mine.slice(i, i + 200).flatMap((d) => [
      { type: "delete" as const, reference: `${DATASETS}/${d.id}` },
      { type: "delete" as const, reference: `${PAYLOADS}/${d.id}` },
    ])
    await firestore.writeBatch({ operations })
  }
  // The creators list and the weekly tallies carry the user's name, so they go
  // too. Settled winners stay: that history is about the week, and rewriting it
  // would hand the title to whoever came second.
  const { snapshots: weeks } = await firestore.getCollection({
    reference: WEEKLY,
    compositeFilter: {
      type: "and",
      queryConstraints: [{ type: "where", fieldPath: "authorUid", opStr: "==", value: uid }],
    },
  })
  const leftovers = [`${CREATORS}/${uid}`, ...weeks.map((s) => `${WEEKLY}/${s.id}`)]
  for (let i = 0; i < leftovers.length; i += 400) {
    await firestore.writeBatch({
      operations: leftovers
        .slice(i, i + 400)
        .map((reference) => ({ type: "delete" as const, reference })),
    })
  }
  return mine.length
}
