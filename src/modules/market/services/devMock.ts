// Development-only stand-in for Firebase, so the market screens can be built and
// checked in a desktop browser (`pnpm dev`). Everything lives in memory and is
// gone on reload. Only reachable through `import.meta.env.DEV` guards, so it
// is dropped from production builds.
import { PAGE_SIZE } from "../constants"
import type {
  MarketCreator,
  MarketDataset,
  MarketListing,
  MarketSort,
  MarketUser,
  WeeklyTally,
} from "../types"
import { weekOf } from "../utils/week"

export const DEV_USER: MarketUser = { uid: "dev-user", name: "Dev User" }

const AUTHORS = ["Alex", "Mehmet", "Sofia", "Kenji", "Dev User"]

let listings: MarketListing[] = Array.from({ length: 45 }, (_, i) => ({
  id: `dev-${i}`,
  label: i % 3 ? `Sample League ${i + 1}` : `World Cup ${1990 + i}`,
  description:
    i % 4 === 0
      ? "A long description that should wrap onto a second line so the card clamp can be checked on a narrow phone screen."
      : "Short description.",
  type: i % 3 ? "club" : "country",
  teamCount: 8 + i,
  playerCount: 0,
  authorUid: AUTHORS[i % AUTHORS.length] === "Dev User" ? DEV_USER.uid : `u${i % AUTHORS.length}`,
  authorName: AUTHORS[i % AUTHORS.length],
  downloads: (45 - i) * 7,
  createdAt: Date.now() - i * 86_400_000,
}))

// A 1x1 pixel stand-in for a shrunk team picture.
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const sample = (label: string): MarketDataset => ({
  label,
  description: "Dev sample",
  type: "club",
  teams: [
    { id: "d1", name: "Dev Red", color: "#e63946", power: 80, img: PIXEL },
    { id: "d2", name: "Dev Blue", color: "#457b9d", power: 70, flag: "tr" },
    { id: "d3", name: "Dev Green", color: "#2a9d8f", power: 60 },
  ],
  players: [
    { id: "p1", teamId: "d1", name: "Dev Striker", position: "FWD", power: 80 },
    { id: "p2", teamId: "d1", name: "Dev Keeper", position: "GK", power: 70 },
  ],
})

const wait = () => new Promise((r) => setTimeout(r, 250))

export async function listDatasets(sort: MarketSort, cursor?: string | null) {
  await wait()
  const sorted = [...listings].sort((a, b) =>
    sort === "popular" ? b.downloads - a.downloads : b.createdAt - a.createdAt
  )
  const start = cursor ? sorted.findIndex((l) => l.id === cursor) + 1 : 0
  const items = sorted.slice(start, start + PAGE_SIZE)
  const more = start + PAGE_SIZE < sorted.length
  return { items, cursor: more ? items[items.length - 1].id : null }
}

export async function listMyDatasets(uid: string) {
  return listings.filter((l) => l.authorUid === uid)
}

export async function downloadDataset(id: string) {
  await wait()
  const found = listings.find((l) => l.id === id)
  return found ? sample(found.label) : null
}

export async function publishDataset(dataset: MarketDataset, author: MarketUser) {
  await wait()
  const id = `dev-${Date.now()}`
  listings = [
    {
      id,
      label: dataset.label,
      description: dataset.description,
      type: dataset.type,
      category: dataset.category,
      teamCount: dataset.teams.length,
      playerCount: dataset.players?.length ?? 0,
      authorUid: author.uid,
      authorName: author.name,
      downloads: 0,
      createdAt: Date.now(),
    },
    ...listings,
  ]
  return id
}

export async function deleteDataset(id: string) {
  listings = listings.filter((l) => l.id !== id)
}

// Creators are derived from the listings above; the weeks are made up so the
// champion banner and the win counts have something to show.
const thisWeek = weekOf(Date.now())
const weekly: WeeklyTally[] = [
  { week: thisWeek - 1, authorUid: "u1", authorName: "Mehmet", count: 42 },
  { week: thisWeek - 1, authorUid: "u2", authorName: "Sofia", count: 17 },
  { week: thisWeek - 2, authorUid: "u2", authorName: "Sofia", count: 30 },
  { week: thisWeek, authorUid: "u3", authorName: "Kenji", count: 5 },
]
const counted = new Set<string>()

export async function countDownload(listing: MarketListing, user: MarketUser) {
  const key = `${listing.id}_${user.uid}`
  if (counted.has(key)) return
  counted.add(key)
  listing.downloads++
  const stored = listings.find((l) => l.id === listing.id)
  if (stored && stored !== listing) stored.downloads++
  const row = weekly.find((w) => w.week === thisWeek && w.authorUid === listing.authorUid)
  if (row) row.count++
  else
    weekly.push({
      week: thisWeek,
      authorUid: listing.authorUid,
      authorName: listing.authorName,
      count: 1,
    })
}

export async function listCreators(): Promise<MarketCreator[]> {
  await wait()
  const byUid = new Map<string, MarketCreator>()
  for (const l of listings) {
    const c = byUid.get(l.authorUid) ?? {
      uid: l.authorUid,
      name: l.authorName,
      datasets: 0,
      downloads: 0,
    }
    c.datasets++
    c.downloads += l.downloads
    byUid.set(l.authorUid, c)
  }
  return [...byUid.values()].sort((a, b) => b.downloads - a.downloads)
}

export async function listWinners(): Promise<WeeklyTally[]> {
  return weekly.filter((w) => w.week === thisWeek - 2)
}

export async function listWeek(week: number): Promise<WeeklyTally[]> {
  return weekly.filter((w) => w.week === week)
}

export async function deleteMyData(uid: string) {
  const before = listings.length
  listings = listings.filter((l) => l.authorUid !== uid)
  return before - listings.length
}
