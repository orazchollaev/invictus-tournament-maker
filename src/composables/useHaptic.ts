/**
 * Chrome refuses `navigator.vibrate` until the frame has seen a real user
 * gesture, and logs an "[Intervention] Blocked call to navigator.vibrate"
 * warning every time it refuses. Most haptics here hang off a tap and are
 * fine, but several fire from a timer or a watcher instead — the draw
 * ceremony advancing itself, a goal going in during a simulated match — and
 * those can land before the user has touched anything at all, on a page that
 * was reloaded straight onto a tournament.
 *
 * So the gesture is tracked once, here, and vibration stays off until one has
 * happened. Nothing is queued: a buzz the user never felt is not worth
 * replaying later.
 */
let hasUserGesture = false

if (typeof window !== "undefined") {
  const mark = () => {
    hasUserGesture = true
  }
  // Capture phase, so the flag is already set by the time a component's own
  // pointerdown handler asks for a tap buzz.
  for (const event of ["pointerdown", "touchstart", "keydown", "click"]) {
    window.addEventListener(event, mark, { once: true, capture: true, passive: true })
  }
}

function vibrate(pattern: number | number[]) {
  if (!hasUserGesture) return
  if (!("vibrate" in navigator)) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Some browsers throw instead of returning false (and a blocked call is
    // never worth surfacing) — a missing buzz is not an error the user can act
    // on.
  }
}

export function useHaptic() {
  return {
    tap: () => vibrate(10),
    /** Toggle/switch detent — smaller than tap, no confirmation weight. */
    selection: () => vibrate(6),
    success: () => vibrate([20, 50, 20]),
    /** Destructive action about to happen (delete/reset confirm dialogs). */
    warning: () => vibrate([15, 40, 15, 40, 40]),
    error: () => vibrate(300),
  }
}
