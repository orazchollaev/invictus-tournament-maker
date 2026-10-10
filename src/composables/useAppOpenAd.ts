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
/** A loaded app-open ad expires after four hours; reload well before that. */
const PRELOAD_TTL_MS = 3 * 60 * 60_000

let preloaded: Promise<void> | null = null
let preloadedAt = 0
let backgroundedAt = 0
let started = false

function readLastShown(): number {
  return parseInt(localStorage.getItem(LAST_SHOWN_KEY) ?? "0", 10) || 0
}

function preload() {
  if (preloaded && Date.now() - preloadedAt < PRELOAD_TTL_MS) return preloaded
  preloadedAt = Date.now()
  const loading = loadAdMob().then(({ AdMob }) =>
    AdMob.loadAppOpen({ adId: APP_OPEN_AD_UNIT_ID }).then(() => undefined)
  )
  preloaded = loading
  loading.catch(() => {
    if (preloaded === loading) preloaded = null
  })
  return loading
}

async function showIfDue() {
  const now = Date.now()
  if (now - backgroundedAt < MIN_BACKGROUND_MS) return
  if (now - readLastShown() < MIN_INTERVAL_MS) return
  try {
    // Not loaded yet (or expired): start loading for the next return, no ad now.
    if (!preloaded || now - preloadedAt >= PRELOAD_TTL_MS) {
      void preload().catch(() => {})
      return
    }
    await preloaded
    preloaded = null
    localStorage.setItem(LAST_SHOWN_KEY, String(now))
    const { AdMob } = await loadAdMob()
    await AdMob.showAppOpen()
  } catch {
    // best-effort: silently ignore if unavailable
  } finally {
    void preload().catch(() => {})
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
  void preload().catch(() => {})
  void App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) {
      backgroundedAt = Date.now()
      return
    }
    void showIfDue()
  })
}
