function vibrate(pattern: number | number[]) {
  if ("vibrate" in navigator) navigator.vibrate(pattern)
}

export function useHaptic() {
  return {
    tap: () => vibrate(10),
    success: () => vibrate([20, 50, 20]),
    error: () => vibrate(300),
  }
}
