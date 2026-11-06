import { shallowRef } from "vue"
import type { Router } from "vue-router"
import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { APP_VERSION } from "@/constants"
import { i18n } from "@/i18n"
import { dialogState } from "@/composables/useDialog"
import { logEvent } from "@/composables/useAnalytics"
import {
  FIRST_CHECK_DELAY_MS,
  IMAGE_PRELOAD_TIMEOUT_MS,
  QUIET_GIVE_UP_MS,
  QUIET_PATHS,
  QUIET_POLL_MS,
  RESUME_CHECK_AFTER_MS,
  SEEN_RETENTION_MS,
} from "../constants"
import { loadAnnouncements, type AnnouncementFeed } from "../services/announcementApi"
import { readSeenLog, writeSeenLog } from "../services/seenLog"
import type { ResolvedAnnouncement } from "../types"
import { markSeen, pickAnnouncement, pruneSeen } from "../utils/select"

/** The announcement on screen. App.vue renders the sheet while this is set. */
export const currentAnnouncement = shallowRef<ResolvedAnnouncement | null>(null)

const shownThisSession = new Set<string>()
let started = false
let checking = false

/**
 * Nothing else is asking for attention: a list page, no sheet, drawer, confirm
 * or onboarding open (every one of them renders role="dialog"), app in front.
 */
function isQuiet(router: Router): boolean {
  if (currentAnnouncement.value || dialogState.visible) return false
  if (document.visibilityState !== "visible") return false
  if (!QUIET_PATHS.includes(router.currentRoute.value.path)) return false
  return !document.querySelector('[role="dialog"], [role="alertdialog"]')
}

function waitForQuiet(router: Router): Promise<boolean> {
  return new Promise((resolve) => {
    const giveUpAt = Date.now() + QUIET_GIVE_UP_MS
    const poll = () => {
      if (isQuiet(router)) resolve(true)
      else if (Date.now() >= giveUpAt) resolve(false)
      else setTimeout(poll, QUIET_POLL_MS)
    }
    poll()
  })
}

/** Warms the browser cache so the sheet opens with its image, not into it. */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    setTimeout(done, IMAGE_PRELOAD_TIMEOUT_MS)
    img.src = url
  })
}

function pick(feed: AnnouncementFeed): ResolvedAnnouncement | null {
  return pickAnnouncement(feed.items, {
    now: Date.now() + feed.clockOffset,
    locale: String(i18n.global.locale.value),
    platform: Capacitor.getPlatform(),
    appVersion: APP_VERSION,
    seen: readSeenLog(),
    shownThisSession,
  })
}

async function check(router: Router) {
  if (checking || currentAnnouncement.value) return
  checking = true
  try {
    const feed = await loadAnnouncements()
    const first = pick(feed)
    if (!first) return
    if (first.imageUrl) await preloadImage(first.imageUrl)
    if (!(await waitForQuiet(router))) return

    // Picked again: the wait can be minutes long — the language may have
    // changed, or the announcement ended in the meantime.
    const next = pick(feed)
    if (!next) return

    const now = Date.now()
    // Recorded on show, not on close: an app killed with the sheet open has
    // still shown it, and "once" must mean once.
    if (!writeSeenLog(markSeen(pruneSeen(readSeenLog(), now, SEEN_RETENTION_MS), next.id, now))) {
      // Without storage "once" cannot hold, so it would come back every launch.
      return
    }
    shownThisSession.add(next.id)
    currentAnnouncement.value = next
    void logEvent("announcement_shown", { id: next.id, locale: next.locale })
  } catch (error) {
    if (import.meta.env.DEV) console.warn("[announcements]", error)
  } finally {
    checking = false
  }
}

/**
 * Looks for a due announcement shortly after launch, and again whenever the app
 * comes back after a long absence — on Android the process can live for days.
 * Shows at most one at a time. Call once, after mount.
 */
export function initAnnouncements(router: Router) {
  if (started) return
  started = true
  setTimeout(() => void check(router), FIRST_CHECK_DELAY_MS)

  let backgroundedAt = 0
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      backgroundedAt = Date.now()
      return
    }
    if (backgroundedAt && Date.now() - backgroundedAt >= RESUME_CHECK_AFTER_MS) {
      setTimeout(() => void check(router), FIRST_CHECK_DELAY_MS)
    }
  })
}

/** Called by the sheet once it has closed. */
export function closeAnnouncement(how: "dismiss" | "action", router: Router) {
  const shown = currentAnnouncement.value
  currentAnnouncement.value = null
  if (!shown) return
  if (how === "dismiss" || !shown.action) {
    void logEvent("announcement_dismissed", { id: shown.id })
    return
  }
  void logEvent("announcement_action", { id: shown.id, type: shown.action.type })
  if (shown.action.type === "route") {
    router.push(shown.action.target).catch(() => {})
  } else {
    window.open(shown.action.target, "_blank", "noopener")
  }
}
