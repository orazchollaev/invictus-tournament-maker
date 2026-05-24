import { defineStore } from "pinia"
import { ref, watch } from "vue"
import type { LegMode } from "@/modules/tournament/types"
import { setSimConfig } from "@/engine"

export type Theme = "light" | "dark"

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<Theme>("dark")
  const groupLegMode = ref<LegMode>("single")
  const knockoutLegMode = ref<LegMode>("single")
  const finalLegMode = ref<LegMode>("single")
  const surpriseFactor = ref(50)

  watch(
    theme,
    (val) => {
      document.documentElement.setAttribute("data-theme", val)
    },
    { immediate: true }
  )

  watch(surpriseFactor, (val) => setSimConfig({ surpriseFactor: val }), { immediate: true })

  return { theme, groupLegMode, knockoutLegMode, finalLegMode, surpriseFactor }
})
