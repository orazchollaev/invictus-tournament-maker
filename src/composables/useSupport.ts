import { ref } from "vue"
import { showConfirm } from "@/composables/useDialog"
import { i18n } from "@/i18n"

const LAUNCHES_KEY = "invictus_support_launches"
const FIRST_PROMPT_LAUNCH = 4
const PROMPT_EVERY = 8
const PROMPT_DELAY_MS = 20_000

/** Shared so the settings button and the periodic prompt open the same modal. */
export const supportOpen = ref(false)

export function openSupport() {
  supportOpen.value = true
}

function readLaunches(): number {
  try {
    return parseInt(localStorage.getItem(LAUNCHES_KEY) ?? "0") || 0
  } catch {
    return 0
  }
}

/**
 * Counts this launch and, on the 4th and then every 8th, asks once whether the
 * user wants to support the app. Delayed so it never lands on top of startup.
 */
export function scheduleSupportPrompt() {
  const launches = readLaunches() + 1
  try {
    localStorage.setItem(LAUNCHES_KEY, String(launches))
  } catch {
    return
  }
  const due =
    launches >= FIRST_PROMPT_LAUNCH && (launches - FIRST_PROMPT_LAUNCH) % PROMPT_EVERY === 0
  if (!due) return

  setTimeout(async () => {
    const t = i18n.global.t
    const yes = await showConfirm(t("settings.support.prompt"), {
      confirmLabel: t("settings.support.button"),
    })
    if (yes) openSupport()
  }, PROMPT_DELAY_MS)
}
