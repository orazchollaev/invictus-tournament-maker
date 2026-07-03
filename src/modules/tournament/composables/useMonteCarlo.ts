import { ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import type { MonteCarloResult } from "@/engine/monteCarlo"

export function useMonteCarlo() {
  const isRunning = ref(false)
  const progress = ref(0)
  const result = ref<MonteCarloResult | null>(null)
  let worker: Worker | null = null

  function run(
    tournament: Tournament,
    teams: Team[],
    n = 10_000
  ): Promise<MonteCarloResult | null> {
    isRunning.value = true
    progress.value = 0
    result.value = null

    worker?.terminate()
    worker = new Worker(new URL("../../../engine/monteCarlo.worker.ts", import.meta.url), {
      type: "module",
    })
    const activeWorker = worker

    return new Promise((resolve) => {
      activeWorker.onmessage = (event) => {
        const msg = event.data
        if (msg.type === "progress") {
          progress.value = Math.round((msg.completed / n) * 100)
        } else if (msg.type === "result") {
          result.value = msg.result
          isRunning.value = false
          activeWorker.terminate()
          if (worker === activeWorker) worker = null
          resolve(msg.result)
        }
      }

      activeWorker.onerror = () => {
        isRunning.value = false
        activeWorker.terminate()
        if (worker === activeWorker) worker = null
        resolve(null)
      }

      // tournament/teams are Vue reactive proxies — postMessage's structured clone
      // can't clone them directly, so strip reactivity via a plain JSON round-trip.
      const plainTournament = JSON.parse(JSON.stringify(tournament)) as Tournament
      const plainTeams = JSON.parse(JSON.stringify(teams)) as Team[]
      activeWorker.postMessage({ type: "run", tournament: plainTournament, teams: plainTeams, n })
    })
  }

  function cancel() {
    if (worker) {
      worker.postMessage({ type: "cancel" })
      worker.terminate()
      worker = null
    }
    isRunning.value = false
  }

  return { isRunning, progress, result, run, cancel }
}
