import type { Team } from "@/modules/teams/types"
import { MARKET_LIMITS } from "../constants"
import type { MarketDataset, MarketTeam } from "../types"
import { parseCrest } from "./parseCrest"

const HEX6 = /^#[0-9a-f]{6}$/i
const HEX3 = /^#[0-9a-f]{3}$/i
const FALLBACK_COLOR = "#888888"

function normalizeColor(color: string): string {
  if (HEX6.test(color)) return color
  if (HEX3.test(color)) return "#" + [...color.slice(1)].map((c) => c + c).join("")
  return FALLBACK_COLOR
}

/**
 * Reduces a team to what the market shares. A builder crest travels as its
 * small recipe. An uploaded picture travels only as `img`, which the caller has
 * already shrunk to low quality; originals and image URLs stay behind.
 */
export function toMarketTeam(team: Team, img?: string): MarketTeam {
  const out: MarketTeam = {
    id: team.id,
    name: team.name.trim().slice(0, MARKET_LIMITS.maxName) || "?",
    color: normalizeColor(team.color),
    power: Math.min(100, Math.max(1, Math.round(team.power))),
  }
  if (team.flag && /^[a-z0-9_-]{2,32}$/i.test(team.flag)) out.flag = team.flag
  const abbr = team.abbr?.trim().slice(0, 7)
  if (abbr) out.abbr = abbr
  // Only the builder recipe travels; uploaded photos and URLs never do.
  const crest = team.crest ? parseCrest(team.crest) : null
  // A crest recipe is smaller and sharper than a picture, so it wins.
  if (crest) out.crest = crest
  else if (img) out.img = img
  return out
}

export interface PublishDraft {
  label: string
  description: string
  type: MarketDataset["type"]
  category?: MarketDataset["category"]
}

/** The dataset to publish: the picked teams, in the order the user has them. */
export function buildDataset(
  draft: PublishDraft,
  teams: readonly Team[],
  images: ReadonlyMap<string, string> = new Map()
): MarketDataset {
  const dataset: MarketDataset = {
    label: draft.label.trim(),
    description: draft.description.trim(),
    type: draft.type,
    teams: teams.map((t) => toMarketTeam(t, images.get(t.id))),
  }
  if (draft.category) dataset.category = draft.category
  return dataset
}
