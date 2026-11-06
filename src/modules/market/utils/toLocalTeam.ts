import type { Team } from "@/modules/teams/types"
import type { CrestSpec, CrestText } from "@/engine/crest/types"
import { autoAbbr } from "@/composables/useTeamLookup"
import type { MarketTeam } from "../types"

export type RenderCrest = (spec: CrestSpec, text: CrestText) => string

/**
 * Turns a downloaded team into a local one. A shared crest arrives as its
 * recipe and is redrawn here, the same way the crest builder draws it; flag and
 * image are mutually exclusive on a Team, so a crest wins over a picture, and a picture over a flag.
 */
export function toLocalTeam(team: MarketTeam, renderCrest?: RenderCrest): Team {
  const out: Team = { id: team.id, name: team.name, color: team.color, power: team.power }
  if (team.abbr) out.abbr = team.abbr
  if (team.crest && renderCrest) {
    out.crest = team.crest
    out.image = renderCrest(team.crest, { name: team.name, abbr: team.abbr || autoAbbr(team.name) })
  } else if (team.img) {
    out.image = team.img
  } else if (team.flag) {
    out.flag = team.flag
  }
  return out
}
