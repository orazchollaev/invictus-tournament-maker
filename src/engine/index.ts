// engine/index.ts
export { uid, shuffle, getRoundName } from "./utils"
export { simulateMatch, simulatePenaltyShootout } from "./simulation"
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
} from "./groups"
export { createTournament, seedBracketFromGroups } from "./tournament"
