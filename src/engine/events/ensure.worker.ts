/// <reference lib="webworker" />
//
// Rolls match reports off the main thread. `pendingStatsJobs` (main thread)
// finds which matches still need one; this worker turns each job into a
// full `MatchStats` via the same pure `computeStatsForJob` the synchronous
// path uses, so a score save never blocks on report generation for matches
// the user isn't even looking at.
import type { Team } from "@/modules/teams/types"
import type { Player } from "@/modules/players/types"
import { computeStatsForJob, type PendingStatsJob, type StatsJobResult } from "./ensure"

interface RunMessage {
  id: number
  jobs: PendingStatsJob[]
  teams: Team[]
  players: Player[]
}

self.onmessage = (event: MessageEvent<RunMessage>) => {
  const { id, jobs, teams, players } = event.data
  const results: StatsJobResult[] = jobs.map((job) => computeStatsForJob(job, teams, players))
  self.postMessage({ id, results })
}
