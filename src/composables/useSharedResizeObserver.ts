import { onBeforeUnmount, watch, type Ref } from "vue"

/**
 * One ResizeObserver for the whole app instead of one per component. A page
 * can mount hundreds of small observers at once (a team name in every bracket
 * card and table row), and each fires its own callback; a single observer
 * watching all their targets delivers every change in one batched callback.
 */
let observer: ResizeObserver | null = null
const callbacks = new Map<Element, Set<() => void>>()

// Callbacks run on the next frame, not inside the observer's own callback: a
// callback that changes layout there (a name swapping to its abbreviation)
// resizes observed boxes in the same frame, which the browser reports as
// "ResizeObserver loop completed with undelivered notifications".
const pending = new Set<() => void>()
let frame = 0

function flush() {
  frame = 0
  const due = [...pending]
  pending.clear()
  for (const cb of due) cb()
}

function sharedObserver(): ResizeObserver {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) callbacks.get(entry.target)?.forEach((cb) => pending.add(cb))
    if (pending.size && !frame) frame = requestAnimationFrame(flush)
  })
  return observer
}

function observe(target: Element, cb: () => void): () => void {
  let set = callbacks.get(target)
  if (!set) {
    set = new Set()
    callbacks.set(target, set)
    sharedObserver().observe(target)
  }
  set.add(cb)
  return () => {
    set.delete(cb)
    pending.delete(cb)
    if (set.size) return
    callbacks.delete(target)
    observer?.unobserve(target)
  }
}

/**
 * Calls `cb` whenever `target` changes size — including once right after it is
 * first observed — while `enabled` holds. Stops on unmount.
 */
export function useSharedResizeObserver(
  target: Ref<Element | null | undefined>,
  cb: () => void,
  enabled: () => boolean = () => true
) {
  let stop: (() => void) | null = null

  watch(
    [target, enabled],
    ([el, on]) => {
      stop?.()
      stop = el && on ? observe(el, cb) : null
    },
    { immediate: true, flush: "post" }
  )

  onBeforeUnmount(() => stop?.())
}
