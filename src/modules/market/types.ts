import type { CrestSpec } from "@/engine/crest/types"

/** A team as shared through the market: display data plus strength, no images. */
export interface MarketTeam {
  id: string
  name: string
  color: string // #RRGGBB
  power: number // 1-100
  flag?: string // ISO country code or a known flag slug
  abbr?: string // up to 7 chars
  /** Crest-builder recipe; the image is redrawn from it on download, never shipped. */
  crest?: CrestSpec
}

export interface MarketPlayer {
  id: string
  teamId: string
  name: string
  position: "GK" | "DEF" | "MID" | "FWD"
  power: number // 1-99
  number?: number // 1-99
}

/**
 * The shareable dataset. Same shape as the bundled `src/examples/*.json` minus
 * `tournaments` and `order`, which only the official sets carry.
 */
export interface MarketDataset {
  label: string
  description: string
  type: "country" | "club"
  category?: "league" | "classic" | "ranking"
  teams: MarketTeam[]
  players?: MarketPlayer[]
}

/** What the list screen shows: one small Firestore document per dataset. */
export interface MarketListing {
  id: string
  label: string
  description: string
  type: MarketDataset["type"]
  category?: MarketDataset["category"]
  teamCount: number
  playerCount: number
  authorUid: string
  authorName: string
  downloads: number
  /** Epoch milliseconds; 0 while the server timestamp is still pending. */
  createdAt: number
}

export interface MarketUser {
  uid: string
  name: string
}

export type ReportReason = "spam" | "copyright" | "offensive" | "other"
export type MarketSort = "new" | "popular"
