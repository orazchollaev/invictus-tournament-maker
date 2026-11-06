import { PLAYER_POSITIONS } from "@/modules/players/types"
import { DATASET_CATEGORIES, DATASET_TYPES, MARKET_LIMITS } from "../constants"
import type { MarketDataset, MarketPlayer, MarketTeam } from "../types"
import { parseCrest } from "./parseCrest"

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const FLAG = /^[a-z0-9_-]{2,32}$/i
// Raster only: SVG data-URLs can carry script, so they never pass.
const IMAGE = /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const text = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max ? v.trim() : null

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null

function parseTeam(raw: unknown): MarketTeam | null {
  if (!isObject(raw)) return null
  const id = text(raw.id, 64)
  const name = text(raw.name, MARKET_LIMITS.maxName)
  const power = int(raw.power, 1, 100)
  if (!id || !name || power === null) return null
  if (typeof raw.color !== "string" || !HEX_COLOR.test(raw.color)) return null
  const team: MarketTeam = { id, name, color: raw.color, power }
  if (raw.flag !== undefined) {
    if (typeof raw.flag !== "string" || !FLAG.test(raw.flag)) return null
    team.flag = raw.flag
  }
  // Optional extras are dropped, not fatal: a crest from a newer app version
  // should cost that team its crest, not cost the user the whole dataset.
  const abbr = text(raw.abbr, 7)
  if (abbr) team.abbr = abbr
  const crest = raw.crest === undefined ? null : parseCrest(raw.crest)
  if (crest) team.crest = crest
  const img = raw.img
  if (typeof img === "string" && img.length <= MARKET_LIMITS.maxImageChars && IMAGE.test(img)) {
    team.img = img
  }
  return team
}

function parsePlayer(raw: unknown): MarketPlayer | null {
  if (!isObject(raw)) return null
  const id = text(raw.id, 64)
  const teamId = text(raw.teamId, 64)
  const name = text(raw.name, MARKET_LIMITS.maxName)
  const power = int(raw.power, 1, 99)
  if (!id || !teamId || !name || power === null) return null
  const position = raw.position as MarketPlayer["position"]
  if (!PLAYER_POSITIONS.includes(position)) return null
  const player: MarketPlayer = { id, teamId, name, position, power }
  if (raw.number !== undefined) {
    const number = int(raw.number, 1, 99)
    if (number === null) return null
    player.number = number
  }
  return player
}

/**
 * Checks untrusted input (a download, an upload) and returns a clean copy, or
 * null when it cannot be used. Strict on purpose: unknown fields are dropped
 * (so `tournaments` never rides along, and a team picture survives only as a
 * small raster data-URL), and one bad
 * team/player rejects the whole dataset rather than loading it half-broken.
 */
export function validateDataset(input: unknown): MarketDataset | null {
  if (!isObject(input)) return null

  const label = text(input.label, MARKET_LIMITS.maxLabel)
  const description = text(input.description, MARKET_LIMITS.maxDescription)
  if (!label || !description) return null
  const type = input.type as MarketDataset["type"]
  if (!DATASET_TYPES.includes(type)) return null

  if (!Array.isArray(input.teams)) return null
  if (input.teams.length === 0 || input.teams.length > MARKET_LIMITS.maxTeams) return null
  const teams: MarketTeam[] = []
  for (const raw of input.teams) {
    const team = parseTeam(raw)
    if (!team) return null
    teams.push(team)
  }
  const teamIds = new Set(teams.map((t) => t.id))
  if (teamIds.size !== teams.length) return null

  const dataset: MarketDataset = { label, description, type, teams }

  if (input.category !== undefined) {
    const category = input.category as NonNullable<MarketDataset["category"]>
    if (!DATASET_CATEGORIES.includes(category)) return null
    dataset.category = category
  }

  if (input.players !== undefined) {
    if (!Array.isArray(input.players) || input.players.length > MARKET_LIMITS.maxPlayers) {
      return null
    }
    const players: MarketPlayer[] = []
    const playerIds = new Set<string>()
    for (const raw of input.players) {
      const player = parsePlayer(raw)
      if (!player || !teamIds.has(player.teamId) || playerIds.has(player.id)) return null
      playerIds.add(player.id)
      players.push(player)
    }
    if (players.length) dataset.players = players
  }

  return dataset
}
