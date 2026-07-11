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
export {
  getWinnerId,
  getLoserId,
  propagateWinners,
  buildBracketRounds,
  buildEmptyBracketRounds,
  buildPureBracket,
  updateThirdPlaceSlots,
} from "./bracket"
export {
  buildGroupFixture,
  recalcStandings,
  setGroupMatchResult,
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
  simulateLeagueMatch,
  simulateLeagueMatchday,
  simulateAllLeague,
  allLeagueDone,
  getLeagueWinner,
  setTierMatchResult,
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
