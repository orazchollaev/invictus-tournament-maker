import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

const APP_OPEN_AD_UNIT_ID = "ca-app-pub-5867331300737777/6157925177"
const LAST_SHOWN_KEY = "invictus_app_open_last_shown"
/** At most one app-open ad per this long. */
const MIN_INTERVAL_MS = 4 * 60 * 60_000
/**
 * Coming back sooner than this is not "opening the app": it is the return from
 * a consent form or another full-screen ad, or a quick app switch.
 */
const MIN_BACKGROUND_MS = 60_000

let backgroundedAt = 0
let started = false
let showing = false

function readLastShown(): number {
  return parseInt(localStorage.getItem(LAST_SHOWN_KEY) ?? "0", 10) || 0
}

async function showIfDue() {
  const now = Date.now()
  if (showing) return
  if (now - backgroundedAt < MIN_BACKGROUND_MS) return
  if (now - readLastShown() < MIN_INTERVAL_MS) return
  showing = true
  try {
    // Loaded only now and never kept: a loaded ad holds its own WebView, and
    // preloading one for the whole session was part of what starved the app's
    // WebView of GPU memory on Android.
    const { AdMob } = await loadAdMob()
    await AdMob.loadAppOpen({ adId: APP_OPEN_AD_UNIT_ID })
    localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
    await AdMob.showAppOpen()
  } catch {
    // best-effort: silently ignore if unavailable
  } finally {
    showing = false
  }
}

/**
 * Shows an app-open ad when the app returns to the foreground after a real
 * absence, at most once per MIN_INTERVAL_MS. A cold start never shows one, so
 * a consent form or the first screen is not covered. Call once, after AdMob
 * has been initialised.
 */
export function initAppOpenAd() {
  if (!Capacitor.isNativePlatform() || started) return
  started = true
  // First launch: start the interval clock now, so a new user's first app-open
  // ad is a full interval away and never lands during or right after onboarding.
  if (!localStorage.getItem(LAST_SHOWN_KEY))
    localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()))
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      backgroundedAt = Date.now()
      return
    }
    void showIfDue()
  })
}
