// engine/formats.ts
//
// One place to ask "what kind of tournament is this?". `format` is a plain
// string union, so a bare `t.format === "league"` comparison keeps compiling
// after a new format is added — it just silently stops covering it. Routing
// every check through these predicates keeps that from happening again.
import type { Tournament } from "../modules/tournament/types"

type FormatCarrier = Pick<Tournament, "format">

/** Swiss league phase: one table, but each team faces only a subset of the field. */
export function isSwiss(t: FormatCarrier): boolean {
  return t.format === "swiss"
}

/** Classic round-robin league (single- or multi-tier). */
export function isPureLeague(t: FormatCarrier): boolean {
  return t.format === "league"
}

/**
 * Anything whose group phase is a single table stored in `t.league` — classic
 * league and Swiss. These share standings, result entry, simulation and the
 * optional `leaguePlayoff` knockout, so almost every call site wants this one.
 */
export function isLeagueLike(t: FormatCarrier): boolean {
  return t.format === "league" || t.format === "swiss"
}

/** Group stage feeding a knockout bracket. */
export function isGroupFormat(t: FormatCarrier): boolean {
  return t.format === "group+bracket"
}

/** Pure knockout, no preceding phase. */
export function isBracketOnly(t: FormatCarrier): boolean {
  return t.format === "bracket"
}
