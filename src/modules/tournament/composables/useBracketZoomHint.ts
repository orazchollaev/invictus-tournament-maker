import { computed, ref } from "vue"

const STORAGE_KEY = "invictus_bracket_zoom_hint_seen"

const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window
const seen = ref(typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1")

/**
 * One-time "pinch to zoom" hint for the bracket viewport. Shared across every
 * instance (inline panel + fullscreen modal) so dismissing it once — in either
 * place — hides it everywhere for the rest of the session, and permanently
 * after that via localStorage.
 */
export function useBracketZoomHint() {
  const show = computed(() => isTouchDevice && !seen.value)

  function dismiss() {
    if (seen.value) return
    seen.value = true
    localStorage.setItem(STORAGE_KEY, "1")
  }

  return { show, dismiss }
}
