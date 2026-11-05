import { App } from "@capacitor/app"
import { Capacitor } from "@capacitor/core"
import {
  canShowFullscreen,
  consentFormShown,
  launchCount,
  loadAdMob,
  markFullscreenShown,
} from "@/lib/admob"
import { adConfig, loadRemoteConfig } from "@/lib/remoteConfig"

const APP_OPEN_AD_UNIT_ID = "ca-app-pub-5867331300737777/6157925177"
const LAST_SHOWN_KEY = "invictus_app_open_last_shown"
/**
 * Coming back sooner than this is not "opening the app": it is the return from
 * a consent form or another full-screen ad, or a quick app switch.
 */
const MIN_BACKGROUND_MS = 60_000
/**
 * A cold-start ad that is not ready this soon after launch is dropped: by then
 * the user is already using the app and an ad would cut in, not cover a load.
 */
const COLD_START_WINDOW_MS = 6_000

let backgroundedAt = 0
let started = false
let showing = false

function readLastShown(): number {
  try {
    return parseInt(localStorage.getItem(LAST_SHOWN_KEY) ?? "0", 10) || 0
  } catch {
    return 0
  }
}

function writeLastShown(at: number) {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, String(at))
  } catch {
    // storage unavailable: the interval cannot hold, the shared clock still does
  }
}

async function showIfDue(coldStart: boolean) {
  const startedAt = Date.now()
  if (showing) return
  if (!coldStart && startedAt - backgroundedAt < MIN_BACKGROUND_MS) return
  if (startedAt - readLastShown() < adConfig.ad_app_open_interval_hours * 60 * 60_000) return
  if (!canShowFullscreen()) return
  showing = true
  try {
    // Loaded only now and never kept: a loaded ad holds its own WebView, and
    // preloading one for the whole session was part of what starved the app's
    // WebView of GPU memory on Android.
    const { AdMob } = await loadAdMob()
    // The consent form was just on screen: an ad straight after it reads as a trap.
    if (coldStart && consentFormShown) return
    await AdMob.loadAppOpen({ adId: APP_OPEN_AD_UNIT_ID })
    if (coldStart && Date.now() - startedAt > COLD_START_WINDOW_MS) return
    writeLastShown(Date.now())
    markFullscreenShown()
    await AdMob.showAppOpen()
  } catch {
    // best-effort: silently ignore if unavailable
  } finally {
    showing = false
  }
}

/**
 * Shows an app-open ad when the app returns to the foreground after a real
 * absence, and on a cold start from the configured launch on, at most once per
 * interval and never inside the shared full-screen gap. Call once, after
 * initAdClock.
 */
export function initAppOpenAd() {
  if (!Capacitor.isNativePlatform() || started) return
  started = true
  // First launch: start the interval clock now, so a new user's first app-open
  // ad is a full interval away and never lands during or right after onboarding.
  if (!readLastShown()) writeLastShown(Date.now())
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      backgroundedAt = Date.now()
      return
    }
    void showIfDue(false)
  })
  void loadRemoteConfig().then(() => {
    const from = adConfig.ad_app_open_cold_start_from_launch
    if (from > 0 && launchCount >= from) void showIfDue(true)
  })
}
