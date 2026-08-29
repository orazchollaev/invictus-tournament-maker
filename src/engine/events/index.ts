// engine/events/index.ts
export { buildLineup, FORMATION, LINEUP_SIZE, UNKNOWN_POWER } from "./lineup"
export type { Lineup, LineupSlot } from "./lineup"
export { generateMatchStats } from "./generate"
export type { GenerateMatchStatsInput } from "./generate"
export { generateTeamStats } from "./teamStats"
export { computeRating, rollPerformance, MIN_RATING, MAX_RATING } from "./rating"
export type { MatchOutcome, RatingInput } from "./rating"
export {
  ensureMatchStats,
  markLegacyMatchStats,
  claimWatchedStats,
  pendingStatsJobs,
  computeStatsForJob,
  applyStatsResults,
} from "./ensure"
export type { PendingStatsJob, StatsJobResult } from "./ensure"
export {
  pendingKey,
  stashWatchedMatch,
  claimWatchedMatch,
  dropWatchedMatch,
  clearPendingStats,
} from "./pending"
export type { WatchedMatch } from "./pending"
