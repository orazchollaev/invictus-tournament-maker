/// <reference lib="webworker" />
import type { Team } from "../modules/teams/types"
import type { Tournament } from "../modules/tournament/types"
import { runMonteCarloSimulations, type MonteCarloResult } from "./monteCarlo"

interface RunMessage {
  type: "run"
  tournament: Tournament
  teams: Team[]
  n: number
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
