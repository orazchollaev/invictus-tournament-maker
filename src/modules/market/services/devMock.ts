// Development-only stand-in for Firebase, so the market screens can be built and
// checked in a desktop browser (`pnpm dev`). Everything lives in memory and is
// gone on reload. Only reachable through `import.meta.env.DEV` guards, so it
// is dropped from production builds.
import { PAGE_SIZE } from "../constants"
import type { MarketDataset, MarketListing, MarketSort, MarketUser } from "../types"

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
  authorUid: AUTHORS[i % AUTHORS.length] === "Dev User" ? DEV_USER.uid : `u${i}`,
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

export async function deleteMyData(uid: string) {
  const before = listings.length
  listings = listings.filter((l) => l.authorUid !== uid)
  return before - listings.length
}
