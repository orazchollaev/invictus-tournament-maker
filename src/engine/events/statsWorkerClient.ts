// engine/events/statsWorkerClient.ts
//
// One persistent worker for the app's lifetime, instead of spinning one up
// per save the way `useMonteCarlo` does for its much rarer, much longer
// runs. Score saves fire this on every result, so paying worker start-up
// cost each time would eat back most of the win.
import type { Team } from "@/modules/teams/types"
import type { Player } from "@/modules/players/types"
import type { PendingStatsJob, StatsJobResult } from "./ensure"

let worker: Worker | null = null
let seq = 0
const waiting = new Map<number, (results: StatsJobResult[]) => void>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./ensure.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event: MessageEvent<{ id: number; results: StatsJobResult[] }>) => {
      const { id, results } = event.data
      waiting.get(id)?.(results)
      waiting.delete(id)
    }
    // A crashed worker should fail open (no report) rather than hang every
    // caller still waiting on it forever.
    worker.onerror = () => {
      waiting.forEach((resolve) => resolve([]))
      waiting.clear()
      worker?.terminate()
      worker = null
    }
  }
  return worker
}

/**
 * Generate reports for a batch of pending matches without blocking the
 * caller's thread. Falls back to resolving empty when Workers aren't
 * available (SSR, some test runners) — callers already treat "no stats
 * yet" as normal, so this degrades to "generate next time" rather than
 * throwing.
 */
export function generateStatsInWorker(
  jobs: PendingStatsJob[],
  teams: Team[],
  players: Player[]
): Promise<StatsJobResult[]> {
  if (!jobs.length) return Promise.resolve([])
  if (typeof Worker === "undefined") return Promise.resolve([])

  // A save touches one match, i.e. two teams — not the whole roster. Filter
  // down to just those before the JSON round-trip below, or a big player
  // base would put the exact cost this function exists to avoid right back
  // on the caller's thread.
  const teamIds = new Set<string>()
  for (const job of jobs) {
    teamIds.add(job.homeId)
    teamIds.add(job.awayId)
  }
  const relevantTeams = teams.filter((t) => teamIds.has(t.id))
  const relevantPlayers = players.filter((p) => teamIds.has(p.teamId))

  const id = ++seq
  return new Promise((resolve) => {
    waiting.set(id, resolve)
    // Teams/players are Vue reactive proxies — postMessage's structured
    // clone can't carry those directly, so strip reactivity first.
    getWorker().postMessage({
      id,
      jobs,
      teams: JSON.parse(JSON.stringify(relevantTeams)),
      players: JSON.parse(JSON.stringify(relevantPlayers)),
    })
  })
}
