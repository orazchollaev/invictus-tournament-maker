import type { ParticipantRow, TeamStats } from "./types"

/** Translate function shape, matching vue-i18n's `t`. */
type Translate = (key: string, params?: Record<string, unknown>) => string

/** English keeps real ordinal suffixes; other locales use a plain marker the message wraps. */
export function ordinalSuffix(n: number, locale: string): string {
  if (locale === "es" || locale === "pt") return `${n}º`
  if (locale === "ru") return `${n}-й`
  if (locale === "tr") return `${n}.`
  if (locale !== "en") return `${n}`

  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

const PLACE_COLORS: Record<number, string> = {
  1: "var(--medal-gold)",
  2: "var(--pos-2)",
  3: "var(--pos-3)",
  4: "var(--live)",
}

export function placeLabel(pos: number, t: Translate, locale: string): string {
  return t("participants.place", { ordinal: ordinalSuffix(pos, locale) })
}

export function leaguePlaceTag(
  pos: number,
  t: Translate,
  locale: string
): { label: string; color: string } {
  return { label: placeLabel(pos, t, locale), color: PLACE_COLORS[pos] ?? "var(--text-muted)" }
}

export function eliminationLabel(row: ParticipantRow, t: Translate): string {
  if (!row.eliminatedRound) return ""
  return t("participants.eliminated", { round: row.eliminatedRound })
}

export function goalDiff(s: TeamStats): string {
  const d = s.gf - s.ga
  return d > 0 ? `+${d}` : `${d}`
}

/** The badge number in the rank column, or null to fall back to the row index. */
export function finishRank(row: ParticipantRow): number | null {
  if (row.isWinner) return 1
  if (row.leaguePosition !== null) return row.leaguePosition
  if (row.isSecondPlace) return 2
  if (row.isThirdPlace) return 3
  if (row.isFourthPlace) return 4
  return null
}

/**
 * Ranking value for the default "Result" sort. Bands are spaced far apart so a
 * podium always outranks a playoff exit, which always outranks a league placing.
 */
export function resultScore(r: ParticipantRow): number {
  if (r.isWinner) return 0
  if (r.isSecondPlace) return 1
  if (r.isThirdPlace) return 2
  if (r.isFourthPlace) return 3
  // Bracket / playoff round losers — later rounds rank better.
  if (r.eliminatedRoundIdx >= 1000) return 10 + (9999 - r.eliminatedRoundIdx)
  // League table position (pure league, or non-qualifiers below the playoff cutoff).
  if (r.leaguePosition !== null) return 20000 + r.leaguePosition
  if (r.eliminatedRoundIdx === -1) return 40000
  return 30000 - r.eliminatedRoundIdx
}
