// engine/index.ts
export { uid, shuffle, getRoundName } from "./utils"
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
} from "./league"
