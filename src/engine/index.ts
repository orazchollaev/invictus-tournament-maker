// engine/index.ts
export { uid, shuffle, shuffleWith, makeRng, randomSeed, getRoundName } from "./utils"
export {
  buildPots,
  buildPlayoffPots,
  validatePots,
  computeDrawPlan,
  computeCrossDrawPlan,
} from "./drawCeremony"
export type {
  Pot,
  DrawStep,
  DrawPlan,
  DrawMode,
  CeremonyKind,
  CeremonyContext,
} from "./drawCeremony"
export { simulateMatch, simulatePenaltyShootout, setSimConfig } from "./simulation"
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
