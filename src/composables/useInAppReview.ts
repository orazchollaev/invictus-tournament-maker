import { Capacitor } from "@capacitor/core"

const REVIEW_COUNT_KEY = "invictus_completions"
const REVIEW_DONE_KEY = "invictus_review_done"
const TRIGGER_THRESHOLD = 1

export function useInAppReview() {
  /**
   * Counts one finished tournament and asks for a store review once the
   * threshold is reached, only ever once. Returns whether it asked, so the
   * caller leaves the moment to it.
   */
  function onTournamentCompleted(): boolean {
    if (!Capacitor.isNativePlatform()) return false
    try {
      if (localStorage.getItem(REVIEW_DONE_KEY)) return false
      const count = parseInt(localStorage.getItem(REVIEW_COUNT_KEY) ?? "0") + 1
      localStorage.setItem(REVIEW_COUNT_KEY, String(count))
      if (count < TRIGGER_THRESHOLD) return false
      localStorage.setItem(REVIEW_DONE_KEY, "1")
    } catch {
      return false
    }
    void import("@capacitor-community/in-app-review")
      .then(({ InAppReview }) => InAppReview.requestReview())
      .catch(() => {})
    return true
  }

  return { onTournamentCompleted }
}
