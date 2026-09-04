import type { GroupStanding } from "@/modules/tournament/types"

/**
 * The group card and the league table are two renderings of the same standings
 * row. They used to hardcode their own header abbreviations and tooltips, which
 * is how the league table ended up with untranslated English headers while the
 * group card was localised. One definition, both tables read it.
 *
 * `key` is the field on the standings row, `abbr` the column header, and
 * `titleKey` the i18n key for its tooltip.
 */
export interface StandingsColumn {
  key: keyof Pick<GroupStanding, "played" | "won" | "drawn" | "lost" | "gf" | "ga" | "gd" | "pts">
  abbr: string
  titleKey: string
}

const COLUMNS: Record<string, StandingsColumn> = {
  played: { key: "played", abbr: "P", titleKey: "history.table.played" },
  won: { key: "won", abbr: "W", titleKey: "history.table.won" },
  drawn: { key: "drawn", abbr: "D", titleKey: "history.table.drawn" },
  lost: { key: "lost", abbr: "L", titleKey: "history.table.lost" },
  gf: { key: "gf", abbr: "GF", titleKey: "history.table.goalsFor" },
  ga: { key: "ga", abbr: "GA", titleKey: "history.table.goalsAgainst" },
  gd: { key: "gd", abbr: "GD", titleKey: "history.table.goalDiff" },
  pts: { key: "pts", abbr: "Pts", titleKey: "history.table.points" },
}

/** League table — W is dropped in favour of GF/GA, which carry more signal
 *  per column of screen width. */
export const LEAGUE_COLUMNS: StandingsColumn[] = [
  COLUMNS.played,
  COLUMNS.drawn,
  COLUMNS.lost,
  COLUMNS.gf,
  COLUMNS.ga,
  COLUMNS.gd,
  COLUMNS.pts,
]

/** Group card table — same compact rule as the league table: W out, GF/GA in. */
export const GROUP_COLUMNS: StandingsColumn[] = [
  COLUMNS.played,
  COLUMNS.drawn,
  COLUMNS.lost,
  COLUMNS.gf,
  COLUMNS.ga,
  COLUMNS.gd,
  COLUMNS.pts,
]

/** Signed goal difference, the way both tables show it. */
export function formatGoalDiff(gd: number): string {
  return gd > 0 ? `+${gd}` : `${gd}`
}
