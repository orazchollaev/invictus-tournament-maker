// engine/index.ts
export { uid, shuffle, shuffleWith, makeRng, randomSeed, getRoundName } from "./utils"
export {
  buildPots,
  buildPlayoffPots,
  validatePots,
  computeDrawPlan,
  computeCrossDrawPlan,
  swissPlan,
} from "./drawCeremony"
export { isSwiss, isPureLeague, isLeagueLike, isGroupFormat, isBracketOnly } from "./formats"
export {
  SWISS_MIN_TEAMS,
  buildSwissPots,
  validateSwissConfig,
  clampSwissOpponentCount,
  buildSwissPairings,
  assignHomeAway,
  packSwissRounds,
  buildSwissMatchdays,
  buildSwissLeague,
  createSwissTournament,
} from "./swiss"
export type { SwissPairing, SwissDrawInput, CreateSwissOptions } from "./swiss"
export type {
  Pot,
  DrawStep,
  DrawPlan,
  DrawMode,
  CeremonyKind,
  CeremonyContext,
} from "./drawCeremony"
export {
  simulateMatch,
  simulateExtraTime,
  simulateShootoutOutcome,
  simulatePenaltyShootout,
  setSimConfig,
  getSimConfig,
  isFormFactorEnabled,
  isRedCardImpactEnabled,
  isInjuriesEnabled,
  computeFormAdjustments,
} from "./simulation"
export { decideKnockoutResult, extraTimeGoalsOf } from "./knockout"
export type { KnockoutDecision, AggregateOffset } from "./knockout"
export { rollShootout, reconstructShootout, REGULATION_KICKS } from "./shootout"
export type { ShootoutOutcome, ShootoutKickOutcome, ShootoutSide } from "./shootout"
export {
  REGULATION_MINUTES,
  EXTRA_TIME_MINUTES,
  FULL_TIME_MINUTES,
  HALF_TIME_MINUTE,
  EXTRA_TIME_HALF_MINUTE,
  MAX_STOPPAGE,
  PERIOD_END,
  PERIOD_START,
} from "./periods"
export type { MatchPeriod } from "./periods"
export { tournamentAdjustments, fixtureAdjustments } from "./form"
export {
  RED_CHANCE,
  RED_IN_MATCH_POWER_COST,
  RED_NEXT_MATCH_POWER_COST,
  RED_NEXT_MATCH_POWER_CAP,
  rollMatchReds,
  inMatchRedPenalty,
  extraTimeRedPenalty,
  redsOf,
  computeDisciplineAdjustments,
} from "./discipline"
export {
  INJURY_CHANCE,
  INJURY_MIN_MATCHES,
  INJURY_MAX_MATCHES,
  rollInjuryDuration,
  computeInjuryAvailability,
  tournamentInjuryMatches,
  unavailablePlayersByMatch,
} from "./injuries"
export type { InjuryMatch, InjuryAvailability } from "./injuries"
export { setTableConfig } from "./tableConfig"
export { setPowerResolver, resolvePower } from "./power"
export {
  getWinnerId,
  getLoserId,
  propagateWinners,
  buildBracketRounds,
  buildEmptyBracketRounds,
  buildPureBracket,
  updateThirdPlaceSlots,
  stageForDistance,
  resolveRoundLegMode,
  applyLegModes,
  applyThirdPlaceLegMode,
} from "./bracket"
export {
  buildGroupFixture,
  recalcStandings,
  setGroupMatchResult,
  clearGroupMatchResult,
  simulateGroupMatch,
  simulateGroup,
  simulateGroupWeek,
  simulateAllGroups,
  simulateWeek,
  allGroupsDone,
  selectWildcards,
} from "./groups"
export {
  createTournament,
  seedBracketFromGroups,
  crossPlayoffOrder,
  createLeague,
  createMultiTierLeague,
  legModeToCount,
} from "./tournament"
export {
  buildLeagueMatchdays,
  recalcLeagueStandings,
  setLeagueMatchResult,
  clearLeagueMatchResult,
  simulateLeagueMatch,
  simulateLeagueMatchday,
  simulateAllLeague,
  allLeagueDone,
  getLeagueWinner,
  setTierMatchResult,
  clearTierMatchResult,
  simulateTierMatch,
  simulateTierMatchday,
  simulateAllTier,
  simulateAllTiers,
  allTiersDone,
  getTiersWinner,
  isTierDone,
} from "./league"
export {
  getLeaguePlayoffData,
  setLeaguePlayoffData,
  isTopTierDone,
  canStartLeaguePlayoff,
  getLeaguePlayoffQualifierIds,
  seedLeaguePlayoffBracket,
  computeLeaguePlayoffPlan,
} from "./leaguePlayoff"
export { forEachMatch, allMatches, playedMatches, matchesForTeam, isBye } from "./matchIterator"
export type { MatchEntry, MatchSource } from "./matchIterator"
export {
  buildLineup,
  generateMatchStats,
  generateTeamStats,
  computeRating,
  ensureMatchStats,
  markLegacyMatchStats,
  claimWatchedStats,
  pendingStatsJobs,
  computeStatsForJob,
  applyStatsResults,
  pendingKey,
  stashWatchedMatch,
  claimWatchedMatch,
  dropWatchedMatch,
  clearPendingStats,
  FORMATION,
  LINEUP_SIZE,
  UNKNOWN_POWER,
  MIN_RATING,
  MAX_RATING,
} from "./events"
export type {
  Lineup,
  LineupSlot,
  MatchOutcome,
  RatingInput,
  WatchedMatch,
  PendingStatsJob,
  StatsJobResult,
} from "./events"
