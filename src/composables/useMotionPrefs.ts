import { computed, ref } from "vue"
import { useSettingsStore } from "@/modules/settings/store"

const reduceQuery =
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null
const prefersReduced = ref(reduceQuery?.matches ?? false)

if (reduceQuery) {
  reduceQuery.addEventListener("change", (e) => {
    prefersReduced.value = e.matches
  })
}

export function useMotionPrefs() {
  const settings = useSettingsStore()
  const enabled = computed(() => settings.uiAnimations && !prefersReduced.value)

  const m = computed(() =>
    enabled.value
      ? {
          initial: { scale: 1 },
          enter: { scale: 1 },
          hovered: { scale: 1.02, transition: { duration: 120 } },
          tapped: { scale: 0.97, transition: { duration: 100 } },
        }
      : { initial: {}, enter: {}, hovered: {}, tapped: {} }
  )

  return { enabled, prefersReduced, m }
}
