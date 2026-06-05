import { ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { runMonteCarloSimulations, type MonteCarloResult } from "@/engine/monteCarlo"

export function useMonteCarlo() {
  const isRunning = ref(false)
  const progress = ref(0)
  const result = ref<MonteCarloResult | null>(null)
  const cancelSignal = ref({ cancelled: false })

  async function run(tournament: Tournament, teams: Team[], n = 10_000) {
    isRunning.value = true
    progress.value = 0
    result.value = null
    cancelSignal.value = { cancelled: false }

    const res = await runMonteCarloSimulations(
      tournament,
      teams,
      n,
      (completed) => {
        progress.value = Math.round((completed / n) * 100)
      },
      cancelSignal.value
    )

    result.value = res
    isRunning.value = false
    return res
  }

  function cancel() {
    cancelSignal.value.cancelled = true
    isRunning.value = false
  }

  return { isRunning, progress, result, run, cancel }
}
