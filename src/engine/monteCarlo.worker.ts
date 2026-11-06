/// <reference lib="webworker" />
import type { Team } from "../modules/teams/types"
import type { Tiebreaker, Tournament } from "../modules/tournament/types"
import { runMonteCarloSimulations, type MonteCarloResult } from "./monteCarlo"
import { getSimConfig, setSimConfig } from "./simulation"
import { setTableConfig } from "./tableConfig"

interface RunMessage {
  type: "run"
  tournament: Tournament
  teams: Team[]
  n: number
  /** The main thread's settings — this worker's module state starts on defaults. */
  simConfig?: ReturnType<typeof getSimConfig>
  tiebreaker?: Tiebreaker
}

interface CancelMessage {
  type: "cancel"
}

type InboundMessage = RunMessage | CancelMessage

type OutboundMessage =
  { type: "progress"; completed: number } | { type: "result"; result: MonteCarloResult | null }

const cancelSignal = { cancelled: false }

self.onmessage = async (event: MessageEvent<InboundMessage>) => {
  const msg = event.data
  if (msg.type === "cancel") {
    cancelSignal.cancelled = true
    return
  }

  cancelSignal.cancelled = false
  if (msg.simConfig) setSimConfig(msg.simConfig)
  if (msg.tiebreaker) setTableConfig({ tiebreaker: msg.tiebreaker })
  const result = await runMonteCarloSimulations(
    msg.tournament,
    msg.teams,
    msg.n,
    (completed) => {
      const progress: OutboundMessage = { type: "progress", completed }
      self.postMessage(progress)
    },
    cancelSignal
  )

  const done: OutboundMessage = { type: "result", result }
  self.postMessage(done)
}
