import { shallowRef } from "vue"

type CrestEngine = typeof import("@/engine/crest")

// One copy for the whole app: the charge artwork is the heaviest thing the
// teams screens pull in, so it loads the first time a crest is drawn.
const engine = shallowRef<CrestEngine | null>(null)
let loading: Promise<CrestEngine> | null = null

export function loadCrestEngine(): Promise<CrestEngine> {
  loading ??= import("@/engine/crest").then((m) => (engine.value = m))
  return loading
}

/** The crest engine, `null` until it has loaded. Starts the load on first use. */
export function useCrestEngine() {
  void loadCrestEngine()
  return engine
}
