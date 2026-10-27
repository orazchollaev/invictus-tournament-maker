import { ref } from "vue"
import { showConfirm } from "@/composables/useDialog"
import { logEvent } from "@/composables/useAnalytics"
import { i18n } from "@/i18n"

const LAUNCHES_KEY = "invictus_support_launches"
const FIRST_PROMPT_LAUNCH = 4
const PROMPT_EVERY = 8
const PROMPT_DELAY_MS = 20_000

/** Shared so the settings button and the periodic prompt open the same modal. */
export const supportOpen = ref(false)

export type SupportSource = "settings" | "header" | "prompt" | "tournament_end"

const LAST_PROMPT_KEY = "invictus_support_last_prompt"
const PROMPT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
const END_PROMPT_DELAY_MS = 2_500

let prompting = false

function promptCooledDown(): boolean {
  try {
    const last = parseInt(localStorage.getItem(LAST_PROMPT_KEY) ?? "0") || 0
    return Date.now() - last >= PROMPT_COOLDOWN_MS
  } catch {
    return false
  }
}

async function askForSupport(trigger: "launch" | "tournament_end", extra: Record<string, number>) {
  if (prompting) return
  prompting = true
  try {
    localStorage.setItem(LAST_PROMPT_KEY, String(Date.now()))
  } catch {
    // Without storage the cooldown cannot hold, so don't nag at all.
    prompting = false
    return
  }
  const t = i18n.global.t
  void logEvent("support_prompt_shown", { trigger, ...extra })
  const yes = await showConfirm(t("settings.support.prompt"), {
    confirmLabel: t("settings.support.button"),
  })
  void logEvent("support_prompt_answer", { trigger, accepted: yes })
  prompting = false
  if (yes) openSupport(trigger === "launch" ? "prompt" : "tournament_end")
}

/**
 * A finished tournament is the happiest moment in the app, so ask then. Shares a
 * cooldown with the launch prompt so nobody is asked twice in a few days.
 */
export function promptSupportAfterTournament() {
  if (!promptCooledDown()) return
  setTimeout(() => void askForSupport("tournament_end", {}), END_PROMPT_DELAY_MS)
}

export function openSupport(source: SupportSource) {
  void logEvent("support_open", { source })
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
  if (!due || !promptCooledDown()) return

  setTimeout(() => void askForSupport("launch", { launch: launches }), PROMPT_DELAY_MS)
}
