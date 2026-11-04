import type { Team } from "@/modules/teams/types"
import { MARKET_LIMITS } from "../constants"
import type { MarketDataset, MarketTeam } from "../types"

const HEX6 = /^#[0-9a-f]{6}$/i
const HEX3 = /^#[0-9a-f]{3}$/i
const FALLBACK_COLOR = "#888888"

function normalizeColor(color: string): string {
  if (HEX6.test(color)) return color
  if (HEX3.test(color)) return "#" + [...color.slice(1)].map((c) => c + c).join("")
  return FALLBACK_COLOR
}

/**
 * Reduces a team to what the market shares. Crest images and custom photos
 * stay behind on purpose: they are base64 and would blow the size budget.
 */
export function toMarketTeam(team: Team): MarketTeam {
  const out: MarketTeam = {
    id: team.id,
    name: team.name.trim().slice(0, MARKET_LIMITS.maxName) || "?",
    color: normalizeColor(team.color),
    power: Math.min(100, Math.max(1, Math.round(team.power))),
  }
  if (team.flag && /^[a-z0-9_-]{2,32}$/i.test(team.flag)) out.flag = team.flag
  return out
}

export interface PublishDraft {
  label: string
  description: string
  type: MarketDataset["type"]
  category?: MarketDataset["category"]
}

/** The dataset to publish: the picked teams, in the order the user has them. */
export function buildDataset(draft: PublishDraft, teams: readonly Team[]): MarketDataset {
  const dataset: MarketDataset = {
    label: draft.label.trim(),
    description: draft.description.trim(),
    type: draft.type,
    teams: teams.map(toMarketTeam),
  }
  if (draft.category) dataset.category = draft.category
  return dataset
}
