// engine/venue.ts
//
// Where a fixture is played, as far as the simulator is concerned: how much
// home edge the home side gets. Every simulation call asks this module rather
// than reading the tournament itself, so a bracket, a phase, the score modal
// and the live window all agree on which ties are on neutral ground.
import type { Match, Tournament, TournamentPhase } from "../modules/tournament/types"
import type { KnockoutHost, VenueHost } from "./hosts"
import { doubleElimLayout } from "./doubleElim"
import { allMatches } from "./matchIterator"

/** Whether round `ri` decides the bracket: the final, or a double bracket's grand final and reset. */
export function isFinalRound(
  host: Pick<KnockoutHost, "rounds" | "doubleElim">,
  ri: number
): boolean {
  if (!host.rounds.length) return false
  if (host.doubleElim) return ri >= doubleElimLayout(host.rounds.length).grandFinal
  return ri === host.rounds.length - 1
}

/**
 * The home edge for one tie of a bracket. A one-off final goes to neutral
 * ground when the host asks for it; a two-legged final keeps its home and
 * away legs, since neutral ground would make the two legs the same match.
 * Undefined means the app-wide setting.
 */
export function knockoutHomeAdvantage(
  host: KnockoutHost,
  ri: number,
  match: Match
): number | undefined {
  if (host.neutralFinal && match.leg2Result === undefined && isFinalRound(host, ri)) return 0
  return host.homeAdvantage
}

/**
 * A phase's venue rules: the tournament's home edge, plus the phase's own
 * neutral-final switch. A custom tournament has no final of its own, so the
 * top-level `neutralFinal` never reaches a phase.
 */
export function phaseVenue(phase: TournamentPhase, t?: VenueHost): VenueHost {
  const neutralFinal =
    phase.config.kind === "knockout" ? !!phase.config.knockout.neutralFinal : false
  return { homeAdvantage: t?.homeAdvantage, neutralFinal }
}

/**
 * The home edge for any fixture in a tournament, found by its id. For the
 * places that only hold a match id — the score modal and the live window —
 * and must still play the tie under the same rules the bulk simulator uses.
 */
export function matchHomeAdvantage(t: Tournament, matchId: string): number | undefined {
  const entry = allMatches(t).find((e) => e.match.id === matchId)
  if (!entry || entry.source.kind !== "knockout") return t.homeAdvantage
  const { roundIdx, phaseId } = entry.source
  const phase = phaseId ? t.phases?.find((p) => p.id === phaseId) : undefined
  const host: KnockoutHost = phase
    ? {
        rounds: phase.rounds ?? [],
        doubleElim: phase.config.kind === "knockout" && !!phase.config.knockout.doubleElim,
        ...phaseVenue(phase, t),
      }
    : t
  return knockoutHomeAdvantage(host, roundIdx, entry.match as Match)
}
