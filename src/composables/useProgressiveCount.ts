import { onScopeDispose, ref, watch, type Ref } from "vue"

export interface ProgressiveCountOptions {
  /** How many items render straight away — enough to fill the first screen. */
  initial: number
  /** How many more each idle slot adds. */
  step: number
}

const IDLE_TIMEOUT_MS = 200

function scheduleIdle(run: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const handle = requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    return () => cancelIdleCallback(handle)
  }
  const handle = setTimeout(run, 16)
  return () => clearTimeout(handle)
}

/**
 * How many items of a long list to render right now. A big tournament mounts
 * dozens of heavy cards at once, which on a slow phone held the main thread
 * long enough for a white screen or an ANR. This hands back a count that starts
 * at `initial` and grows by `step` per idle slot until it covers the list; a list
 * that grows later continues from where it got to.
 */
export function useProgressiveCount(
  total: () => number,
  { initial, step }: ProgressiveCountOptions
): Ref<number> {
  const count = ref(Math.min(total(), initial))
  let cancel: (() => void) | null = null

  function grow() {
    cancel = null
    count.value = Math.min(total(), count.value + step)
    if (count.value < total()) cancel = scheduleIdle(grow)
  }

  watch(
    total,
    (n) => {
      if (count.value > n) count.value = n
      if (count.value < n && !cancel) cancel = scheduleIdle(grow)
    },
    { immediate: true }
  )

  onScopeDispose(() => cancel?.())

  return count
}
