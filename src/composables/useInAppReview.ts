import { Capacitor } from "@capacitor/core"

const REVIEW_COUNT_KEY = "invictus_completions"
const REVIEW_DONE_KEY = "invictus_review_done"
const TRIGGER_THRESHOLD = 3

export function useInAppReview() {
  async function onTournamentCompleted() {
    if (!Capacitor.isNativePlatform()) return
    if (localStorage.getItem(REVIEW_DONE_KEY)) return

    const count = parseInt(localStorage.getItem(REVIEW_COUNT_KEY) ?? "0") + 1
    localStorage.setItem(REVIEW_COUNT_KEY, String(count))

    if (count >= TRIGGER_THRESHOLD) {
      localStorage.setItem(REVIEW_DONE_KEY, "1")
      try {
        const { InAppReview } = await import("@capacitor-community/in-app-review")
        await InAppReview.requestReview()
      } catch {
        // best-effort: silently ignore if unavailable
      }
    }
  }

  return { onTournamentCompleted }
}
