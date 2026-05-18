import { defineStore } from "pinia"
import { ref, watch } from "vue"

export type Theme = "light" | "dark"

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<Theme>("dark")

  watch(
    theme,
    (val) => {
      document.documentElement.setAttribute("data-theme", val)
    },
    { immediate: true }
  )

  return { theme }
})
