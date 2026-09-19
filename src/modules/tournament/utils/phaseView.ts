// modules/tournament/utils/phaseView.ts
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"

/**
 * A tournament-shaped view of one phase.
 *
 * Every panel in the app reads its fixture off a `tournament` prop, so the way
 * to show a phase is to hand those panels a tournament whose containers are the
 * phase's own. Only writes have to know better, and they go through one of two
 * seams: `phaseId` on the bracket and fixtures panels, and `setFixtureResult`,
 * which reads the phase off the match entry's own source.
 *
 * Deliberately lists the fields it copies instead of spreading the tournament.
 * A spread makes the caller's computed depend on *every* field, so one result
 * anywhere rebuilt every phase's view and handed every panel a new object
 * identity — which re-rendered the lot on each save.
 */
export function phaseTournamentView(t: Tournament, phase: TournamentPhase): Tournament {
  return {
    id: t.id,
    name: t.name,
    season: t.season,
    createdAt: t.createdAt,
    winnerId: t.winnerId,
    manager: t.manager,
    tiebreaker: t.tiebreaker,
    winPoints: t.winPoints,
    drawPoints: t.drawPoints,
    lossPoints: t.lossPoints,
    teamPointAdjustments: t.teamPointAdjustments,
    teamPowerAdjustments: t.teamPowerAdjustments,

    // A phase of a fixed kind, so panels and their children branch the way they
    // always have — and the fixture-stage list reads it to decide what stages a
    // phase even has.
    format:
      phase.kind === "swiss"
        ? "swiss"
        : phase.kind === "group"
          ? "group+bracket"
          : phase.kind === "knockout"
            ? "bracket"
            : "league",

    // Reused as "this stage is settled": once the phase has been advanced out
    // of, its group results are what the next phase was seeded from, so editing
    // them would leave the two disagreeing.
    groupsDone: phase.status === "done",
    groups: phase.groups,
    league: phase.league,
    rounds: phase.rounds ?? [],
    thirdPlaceMatch: phase.thirdPlaceMatch,
    hasThirdPlace: !!phase.thirdPlaceMatch,
    teamIds: phase.teamIds,

    // A group phase's own qualification settings, so the standings tint the
    // automatic places and the wildcard row, and the legend explains them.
    qualifiersPerGroup:
      phase.config.kind === "group" ? phase.config.group.qualifiersPerGroup : undefined,
    wildcardCount: phase.config.kind === "group" ? phase.config.group.wildcardCount : 0,
  }
}
