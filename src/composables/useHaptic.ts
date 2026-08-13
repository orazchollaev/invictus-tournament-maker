function vibrate(pattern: number | number[]) {
  if ("vibrate" in navigator) navigator.vibrate(pattern)
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
