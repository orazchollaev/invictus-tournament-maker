// modules/tournament/store/phases.ts
//
// The custom format's result entry and simulation, one action per thing the UI
// can do to a phase. Every action takes the tournament id first and the phase
// id second: the first because the store's stats sweep and manager guard read
// it off argument zero, the second because a custom tournament has as many
// group stages, tables and brackets as the user drew.
//
// No fixture rules live here. Each action resolves the phase's container into
// the matching engine host and hands off — the same helpers the fixed formats
// use, on a phase's arrays instead of the tournament's.
import type { Ref } from "vue"
import type { MatchResult, Tournament, TournamentPhase } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  clearGroupMatchResult,
  clearKnockoutLeg2,
  clearKnockoutResult,
  clearLeagueMatchResult,
  commitKnockoutResult,
  customWinnerId,
  decideLeg2Result,
  groupHostOf,
  hasTieFrom,
  isPhaseComplete,
  knockoutHostOf,
  leagueHostOf,
  recalcPhase,
  refreshPhaseStatuses,
  seedPhaseFrom,
  setGroupMatchResult,
  setKnockoutLeg2,
  setLeagueMatchResult,
  simulateAllGroups,
  simulateAllLeague,
  simulateGroup,
  simulateGroupMatch,
  simulateGroupWeek,
  simulateKnockoutAll,
  simulateKnockoutLeg1,
  simulateKnockoutLeg2,
  simulateKnockoutRound,
  simulateKnockoutTie,
  simulateLeagueMatch,
  simulateLeagueMatchday,
  simulateMatch,
  simulateThirdPlaceTie,
  simulateWeek,
  topoOrder,
  tournamentAdjustments,
} from "@/engine"
import { adjustedTeams } from "./helpers"

export function usePhasesActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function getT(tournamentId: string) {
    return tournaments.value.find((t) => t.id === tournamentId)
  }

  /**
   * The one place a phase action starts: find the tournament and the phase, run
   * the body, then bring the phase's tables, every phase's status and the
   * tournament's winner back in step.
   *
   * Doing the bookkeeping here rather than in each action is what keeps a new
   * action from being the one that forgets to re-rank the table it just changed.
   */
  function withPhase<T>(
    tournamentId: string,
    phaseId: string,
    fn: (phase: TournamentPhase, t: Tournament, teams: Team[]) => T
  ): T | undefined {
    const t = getT(tournamentId)
    if (!t) return undefined
    const phase = t.phases?.find((p) => p.id === phaseId)
    if (!phase) return undefined
    const out = fn(phase, t, adjustedTeams(getTeams(), t))
    recalcPhase(phase)
    refreshPhaseStatuses(t)
    t.winnerId = customWinnerId(t)
    return out
  }

  // ─── Group phases ──────────────────────────────────────────────

  function setPhaseGroupResult(
    tournamentId: string,
    phaseId: string,
    groupIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      if (!phase.groups) return
      setGroupMatchResult(groupHostOf(phase), groupIdx, matchIdx, home, away)
    })
  }

  function clearPhaseGroupResult(
    tournamentId: string,
    phaseId: string,
    groupIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      if (!phase.groups) return
      clearGroupMatchResult(groupHostOf(phase), groupIdx, matchIdx)
    })
  }

  function simPhaseGroupMatch(
    tournamentId: string,
    phaseId: string,
    groupIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.groups) return
      simulateGroupMatch(groupHostOf(phase), groupIdx, matchIdx, teams)
    })
  }

  function simPhaseGroup(tournamentId: string, phaseId: string, groupIdx: number) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.groups) return
      simulateGroup(groupHostOf(phase), groupIdx, teams)
    })
  }

  function simPhaseGroupWeek(tournamentId: string, phaseId: string, groupIdx: number): number {
    return (
      withPhase(tournamentId, phaseId, (phase, _t, teams) => {
        if (!phase.groups) return -1
        return simulateGroupWeek(groupHostOf(phase), groupIdx, teams)
      }) ?? -1
    )
  }

  /** The same week across every group of the phase — one matchday of the stage. */
  function simPhaseWeek(tournamentId: string, phaseId: string): number {
    return (
      withPhase(tournamentId, phaseId, (phase, _t, teams) => {
        if (!phase.groups) return -1
        return simulateWeek(groupHostOf(phase), teams)
      }) ?? -1
    )
  }

  function simAllPhaseGroups(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.groups) return
      simulateAllGroups(groupHostOf(phase), teams)
    })
  }

  // ─── League and Swiss phases ───────────────────────────────────

  function setPhaseLeagueResult(
    tournamentId: string,
    phaseId: string,
    matchdayIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      if (!phase.league) return
      setLeagueMatchResult(leagueHostOf(phase), matchdayIdx, matchIdx, home, away)
    })
  }

  function clearPhaseLeagueResult(
    tournamentId: string,
    phaseId: string,
    matchdayIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      if (!phase.league) return
      clearLeagueMatchResult(leagueHostOf(phase), matchdayIdx, matchIdx)
    })
  }

  function simPhaseLeagueMatch(
    tournamentId: string,
    phaseId: string,
    matchdayIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.league) return
      simulateLeagueMatch(leagueHostOf(phase), matchdayIdx, matchIdx, teams)
    })
  }

  function simPhaseLeagueMatchday(tournamentId: string, phaseId: string, matchdayIdx: number) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.league) return
      simulateLeagueMatchday(leagueHostOf(phase), matchdayIdx, teams)
    })
  }

  function simAllPhaseLeague(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.league) return
      simulateAllLeague(leagueHostOf(phase), teams)
    })
  }

  // ─── Knockout phases ───────────────────────────────────────────

  function result(home: number, away: number, penHome?: number, penAway?: number): MatchResult {
    return {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    }
  }

  function setPhaseBracketResult(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.rounds) return
      commitKnockoutResult(
        knockoutHostOf(phase),
        roundIdx,
        matchIdx,
        result(home, away, penHome, penAway),
        teams
      )
    })
  }

  function setPhaseBracketLeg2Result(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.rounds) return
      setKnockoutLeg2(
        knockoutHostOf(phase),
        roundIdx,
        matchIdx,
        result(home, away, penHome, penAway),
        teams
      )
    })
  }

  function clearPhaseBracketResult(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.rounds) return
      clearKnockoutResult(knockoutHostOf(phase), roundIdx, matchIdx, teams)
    })
  }

  function clearPhaseBracketLeg2Result(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, _t, teams) => {
      if (!phase.rounds) return
      clearKnockoutLeg2(knockoutHostOf(phase), roundIdx, matchIdx, teams)
    })
  }

  function simPhaseBracketLeg1(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      simulateKnockoutLeg1(
        knockoutHostOf(phase),
        roundIdx,
        matchIdx,
        teams,
        tournamentAdjustments(t)
      )
    })
  }

  function simPhaseBracketLeg2(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      simulateKnockoutLeg2(
        knockoutHostOf(phase),
        roundIdx,
        matchIdx,
        teams,
        tournamentAdjustments(t)
      )
    })
  }

  function simPhaseBracketMatch(
    tournamentId: string,
    phaseId: string,
    roundIdx: number,
    matchIdx: number
  ) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      simulateKnockoutTie(knockoutHostOf(phase), roundIdx, matchIdx, teams, tournamentAdjustments(t))
    })
  }

  function simPhaseBracketRound(tournamentId: string, phaseId: string, roundIdx: number) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      simulateKnockoutRound(knockoutHostOf(phase), roundIdx, teams, tournamentAdjustments(t))
    })
  }

  /**
   * A knockout round minus the managed team's own tie — used right after the
   * user plays one leg of it, so the other leg stays theirs to play rather than
   * being swept up with the rest of the round.
   */
  function simPhaseRoundExceptManager(tournamentId: string, phaseId: string, roundIdx: number) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      const teamId = t.manager?.teamId
      const host = knockoutHostOf(phase)
      phase.rounds[roundIdx]?.matches.forEach((match, mi) => {
        if (teamId && (match.homeId === teamId || match.awayId === teamId)) return
        simulateKnockoutTie(host, roundIdx, mi, teams, tournamentAdjustments(t))
      })
    })
  }

  function simAllPhaseBracket(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.rounds) return
      const host = knockoutHostOf(phase)
      simulateKnockoutAll(host, teams, {
        adjustments: () => tournamentAdjustments(t),
        stopAfterRound: (next) => hasTieFrom(host, next, t.manager?.teamId),
        onFinished: () => simulateThirdPlaceTie(host, teams, tournamentAdjustments(t)),
      })
    })
  }

  function setPhaseThirdPlaceResult(
    tournamentId: string,
    phaseId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      const m = phase.thirdPlaceMatch
      if (!m) return
      m.result = result(home, away, penHome, penAway)
      // Leg 1 owns the tie, exactly as in the bracket itself.
      if (m.leg2Result !== undefined) m.leg2Result = null
    })
  }

  function setPhaseThirdPlaceLeg2Result(
    tournamentId: string,
    phaseId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    withPhase(tournamentId, phaseId, (phase) => {
      const m = phase.thirdPlaceMatch
      if (!m || m.leg2Result === undefined) return
      m.leg2Result = result(home, away, penHome, penAway)
    })
  }

  function clearPhaseThirdPlaceResult(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase) => {
      const m = phase.thirdPlaceMatch
      if (!m) return
      m.result = null
      if (m.leg2Result !== undefined) m.leg2Result = null
    })
  }

  function clearPhaseThirdPlaceLeg2Result(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase) => {
      const m = phase.thirdPlaceMatch
      if (!m || m.leg2Result === undefined) return
      m.leg2Result = null
    })
  }

  /** Leg 1 only, so a double-legged third-place tie can be played one leg at a time. */
  function simPhaseThirdPlaceLeg1(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      const m = phase.thirdPlaceMatch
      if (!m || !m.homeId || !m.awayId || m.leg2Result === undefined) return
      m.result = simulateMatch(m, teams, tournamentAdjustments(t))
      m.leg2Result = null
    })
  }

  function simPhaseThirdPlaceLeg2(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      const m = phase.thirdPlaceMatch
      if (!m || !m.homeId || !m.awayId || !m.result || m.leg2Result === undefined) return
      m.leg2Result = decideLeg2Result(m, teams, tournamentAdjustments(t))
    })
  }

  function simPhaseThirdPlace(tournamentId: string, phaseId: string) {
    withPhase(tournamentId, phaseId, (phase, t, teams) => {
      if (!phase.thirdPlaceMatch) return
      simulateThirdPlaceTie(knockoutHostOf(phase), teams, tournamentAdjustments(t))
    })
  }

  // ─── Progressing the graph ─────────────────────────────────────

  /**
   * Starts the named phase from whatever its sources produced. This is the
   * manual step the header's Advance button drives: a phase transition is a
   * draw, so it is never taken automatically — see the note on syncManagerWeek
   * in the store root.
   */
  function advancePhase(tournamentId: string, phaseId: string): boolean {
    const t = getT(tournamentId)
    if (!t) return false
    const seeded = seedPhaseFrom(t, phaseId, getTeams())
    if (seeded) {
      refreshPhaseStatuses(t)
      t.winnerId = customWinnerId(t)
    }
    return seeded
  }

  /**
   * The same step, taking the order a draw ceremony produced rather than the
   * phase's configured seeding — the counterpart of advanceToBracketManual.
   */
  function advancePhaseManual(
    tournamentId: string,
    phaseId: string,
    orderedIds: string[]
  ): boolean {
    const t = getT(tournamentId)
    if (!t) return false
    const seeded = seedPhaseFrom(t, phaseId, getTeams(), orderedIds)
    if (seeded) {
      refreshPhaseStatuses(t)
      t.winnerId = customWinnerId(t)
    }
    return seeded
  }

  /**
   * Plays out every phase that has already been started, and stops there.
   *
   * Deliberately does not advance into a pending phase: that transition is a
   * draw the user is meant to watch, which is the same line the fixed formats
   * draw at group -> bracket. Manager mode's auto-settle uses this, so a saved
   * result finishes the stage around the user without skipping past the next
   * one being drawn.
   */
  function simAllActivePhases(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.phases?.length) return
    for (const phase of t.phases) {
      if (phase.status === "pending" || isPhaseComplete(phase)) continue
      if (phase.groups) simAllPhaseGroups(tournamentId, phase.id)
      else if (phase.league) simAllPhaseLeague(tournamentId, phase.id)
      else if (phase.rounds) simAllPhaseBracket(tournamentId, phase.id)
    }
  }

  /**
   * One "Simulate All" over the whole graph: play each phase out in dependency
   * order, advancing into the next as soon as its sources are settled.
   *
   * The loop repeats until nothing changes rather than walking the order once,
   * because seeding a phase can make a later one advancable in the same pass.
   */
  function simulateCustomTournament(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.phases?.length) return
    const order = topoOrder(t.phases, t.phaseEdges ?? [])
    if (!order) return

    // One iteration per phase is always enough to reach the end of the chain;
    // the guard is only there so a graph that somehow stops progressing cannot
    // spin forever.
    for (let pass = 0; pass < order.length + 1; pass++) {
      let progressed = false
      for (const phase of order) {
        if (phase.status === "pending") {
          if (advancePhase(tournamentId, phase.id)) progressed = true
          else continue
        }
        if (isPhaseComplete(phase)) continue
        if (phase.groups) simAllPhaseGroups(tournamentId, phase.id)
        else if (phase.league) simAllPhaseLeague(tournamentId, phase.id)
        else if (phase.rounds) simAllPhaseBracket(tournamentId, phase.id)
        if (isPhaseComplete(phase)) progressed = true
        // A phase the manager is still playing in stops the whole run: the rest
        // of the graph depends on a result only the user can enter.
        if (t.manager && !isPhaseComplete(phase)) return
      }
      if (!progressed) return
    }
  }

  return {
    setPhaseGroupResult,
    clearPhaseGroupResult,
    simPhaseGroupMatch,
    simPhaseGroup,
    simPhaseGroupWeek,
    simPhaseWeek,
    simAllPhaseGroups,
    setPhaseLeagueResult,
    clearPhaseLeagueResult,
    simPhaseLeagueMatch,
    simPhaseLeagueMatchday,
    simAllPhaseLeague,
    setPhaseBracketResult,
    setPhaseBracketLeg2Result,
    clearPhaseBracketResult,
    clearPhaseBracketLeg2Result,
    simPhaseBracketLeg1,
    simPhaseBracketLeg2,
    simPhaseBracketMatch,
    simPhaseBracketRound,
    simPhaseRoundExceptManager,
    simAllPhaseBracket,
    simAllActivePhases,
    setPhaseThirdPlaceResult,
    setPhaseThirdPlaceLeg2Result,
    clearPhaseThirdPlaceResult,
    clearPhaseThirdPlaceLeg2Result,
    simPhaseThirdPlace,
    simPhaseThirdPlaceLeg1,
    simPhaseThirdPlaceLeg2,
    advancePhase,
    advancePhaseManual,
    simulateCustomTournament,
  }
}
