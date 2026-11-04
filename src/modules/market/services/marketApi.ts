import { FirebaseFirestore, type QueryNonFilterConstraint } from "@capacitor-firebase/firestore"
import { PAGE_SIZE } from "../constants"
import type { MarketDataset, MarketListing, MarketSort, MarketUser, ReportReason } from "../types"
import { decodeDataset, encodeDataset } from "../utils/codec"
import { USE_DEV_MOCK } from "./authService"

// Desktop `pnpm dev` has no native Firebase; see devMock.ts.
const mock = () => import("./devMock")

// Collections — see firestore.rules for who may do what.
const DATASETS = "datasets"
const PAYLOADS = "payloads"
const REPORTS = "reports"

// Used directly, never returned from an async helper — see the note in
// authService.ts: a plugin passed through a promise is taken for a thenable and hangs.

const SERVER_TIMESTAMP = { __type__: "serverTimestamp" } as const

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
 * Fetches and validates a dataset. Returns null when the payload is missing or
 * does not pass validation. `countDownload` bumps the public counter, which the
 * rules only allow for signed-in users; it is best effort and never fails the download.
 */
export async function downloadDataset(
  id: string,
  countDownload: boolean
): Promise<MarketDataset | null> {
  if (USE_DEV_MOCK) return (await mock()).downloadDataset(id)
  const firestore = FirebaseFirestore
  const { snapshot } = await firestore.getDocument<{ data: string }>({
    reference: `${PAYLOADS}/${id}`,
  })
  const dataset = await decodeDataset(snapshot.data?.data)
  if (dataset && countDownload) {
    void firestore
      .updateDocument({
        reference: `${DATASETS}/${id}`,
        data: { downloads: { __type__: "increment", operand: 1 } },
      })
      .catch(() => {})
  }
  return dataset
}

/**
 * Publishes listing + payload in one atomic batch (the rules require the payload
 * to arrive together with its listing). Returns the new dataset id. Throws
 * "invalid-dataset" or "too-large" before anything is sent.
 */
export async function publishDataset(dataset: MarketDataset, author: MarketUser): Promise<string> {
  if (USE_DEV_MOCK) return (await mock()).publishDataset(dataset, author)
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

  await FirebaseFirestore.writeBatch({
    operations: [
      { type: "set", reference: `${DATASETS}/${id}`, data: listing },
      {
        type: "set",
        reference: `${PAYLOADS}/${id}`,
        data: { authorUid: author.uid, data: payload },
      },
    ],
  })
  return id
}

/** Deletes one of the user's datasets (listing + payload). */
export async function deleteDataset(id: string): Promise<void> {
  if (USE_DEV_MOCK) return (await mock()).deleteDataset(id)
  await FirebaseFirestore.writeBatch({
    operations: [
      { type: "delete", reference: `${DATASETS}/${id}` },
      { type: "delete", reference: `${PAYLOADS}/${id}` },
    ],
  })
}

/** One report per user per dataset; reporting twice is a no-op error the caller ignores. */
export async function reportDataset(
  datasetId: string,
  reporterUid: string,
  reason: ReportReason
): Promise<void> {
  if (USE_DEV_MOCK) return
  await FirebaseFirestore.setDocument({
    reference: `${REPORTS}/${datasetId}_${reporterUid}`,
    data: { datasetId, reporterUid, reason, createdAt: SERVER_TIMESTAMP },
  })
}

/** Removes everything the user published. Run before deleting the account. */
export async function deleteMyData(uid: string): Promise<number> {
  if (USE_DEV_MOCK) return (await mock()).deleteMyData(uid)
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
  return mine.length
}
