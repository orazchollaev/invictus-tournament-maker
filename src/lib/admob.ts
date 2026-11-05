import { ref } from "vue"
import { Capacitor } from "@capacitor/core"
import { fullscreenAllowed } from "./adPolicy"
import { adConfig } from "./remoteConfig"

type AdMobModule = typeof import("@capacitor-community/admob")

let loaded: Promise<AdMobModule> | null = null

/** True when the user is in a region (EEA/UK…) where Google requires a way back into the consent form. */
export const privacyOptionsRequired = ref(false)

/** Set once the consent form has been on screen this launch, so no ad lands right on top of it. */
export let consentFormShown = false

/**
 * Asks Google's UMP for the user's consent state and shows the consent form
 * when one is due. Without it, EEA/UK requests go out with no consent string
 * and most of them come back unfilled. Best-effort: with no UMP message set
 * up in the AdMob console, or offline, ads are requested as before.
 */
async function gatherConsent({ AdMob, AdmobConsentStatus }: AdMobModule) {
  try {
    let info = await AdMob.requestConsentInfo()
    if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
      consentFormShown = true
      info = await AdMob.showConsentForm()
    }
    privacyOptionsRequired.value =
      // The plugin does not export this enum from its entry point.
      info.privacyOptionsRequirementStatus === "REQUIRED"
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

/**
 * Lazy-loads the AdMob plugin and initializes it once, on the first ad that is
 * actually due. Nothing starts at launch: the SDK and every loaded ad hold
 * their own WebView, and keeping them alive next to the app's WebView exhausted
 * GPU/tile memory on Android (white boxes, white screen, renderer crashes).
 * Callers check the native platform first.
 */
export function loadAdMob() {
  loaded ??= import("@capacitor-community/admob").then(async (mod) => {
    await mod.AdMob.initialize()
    await gatherConsent(mod)
    return mod
  })
  return loaded
}

/** Reopens the consent form so the user can change their choice. */
export async function showPrivacyOptions() {
  const { AdMob } = await loadAdMob()
  await AdMob.showPrivacyOptionsForm()
}

// ── Shared full-screen clock ──
// Interstitials and app-open ads come from different places in the app; one
// timestamp keeps any two of them from landing back to back.

const LAST_FULLSCREEN_KEY = "invictus_last_fullscreen_ad"
const FIRST_LAUNCH_KEY = "invictus_first_launch"
const LAUNCH_COUNT_KEY = "invictus_ad_launches"
/** Written by the app-open ad since before this clock existed: its presence means "not a new install". */
const LEGACY_APP_OPEN_KEY = "invictus_app_open_last_shown"

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function writeNumber(key: string, value: number): boolean {
  try {
    localStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}

/** This launch's number, counted by initAdClock. */
export let launchCount = 0
let fullscreenBusy = false

/**
 * Stamps the first launch (the grace period runs from it) and counts this
 * launch. Call once at startup. Someone updating from a version without the
 * clock is not a new user, so they get no grace period.
 */
export function initAdClock() {
  if (!readNumber(FIRST_LAUNCH_KEY)) {
    let existing = false
    try {
      existing = localStorage.getItem(LEGACY_APP_OPEN_KEY) !== null
    } catch {
      // treated as a new install
    }
    writeNumber(FIRST_LAUNCH_KEY, existing ? 1 : Date.now())
  }
  launchCount = readNumber(LAUNCH_COUNT_KEY) + 1
  writeNumber(LAUNCH_COUNT_KEY, launchCount)
}

/** Whether a full-screen ad the user did not ask for may show right now. */
export function canShowFullscreen(): boolean {
  if (!Capacitor.isNativePlatform() || fullscreenBusy) return false
  return fullscreenAllowed(
    Date.now(),
    readNumber(LAST_FULLSCREEN_KEY),
    readNumber(FIRST_LAUNCH_KEY),
    adConfig
  )
}

/** Starts the gap. Called once an ad is loaded and about to show, not before: an unfilled request costs nothing. */
export function markFullscreenShown() {
  writeNumber(LAST_FULLSCREEN_KEY, Date.now())
}

/**
 * Loads and shows one interstitial if the shared clock allows it. Loaded only
 * now and dropped once shown: a loaded ad keeps its own WebView alive, so
 * nothing is held in memory between triggers. Resolves whether it showed.
 */
export async function showInterstitialAd(adId: string): Promise<boolean> {
  if (!canShowFullscreen()) return false
  fullscreenBusy = true
  try {
    const { AdMob } = await loadAdMob()
    await AdMob.prepareInterstitial({ adId })
    markFullscreenShown()
    await AdMob.showInterstitial()
    return true
  } catch {
    // best-effort: no fill, offline, or the SDK is unavailable
    return false
  } finally {
    fullscreenBusy = false
  }
}

export type RewardedResult = "rewarded" | "dismissed" | "failed"

/**
 * Shows a rewarded ad the user asked for. Not held to the shared clock (it is
 * opt-in), but it does restart it, so no interstitial follows straight after.
 * Resolves once the ad is closed, with whether the reward was earned.
 */
export async function showRewardedAd(adId: string): Promise<RewardedResult> {
  if (!Capacitor.isNativePlatform() || fullscreenBusy) return "failed"
  fullscreenBusy = true
  const handles: { remove: () => Promise<void> }[] = []
  try {
    const { AdMob, RewardAdPluginEvents } = await loadAdMob()
    await AdMob.prepareRewardVideoAd({ adId })

    let rewarded = false
    let failed = false
    let onClosed = () => {}
    const closed = new Promise<void>((resolve) => (onClosed = resolve))
    // showRewardVideoAd only settles when a reward is earned, so the close is
    // read from the events instead of from its promise. Registered before the
    // ad shows, so a fast close is never missed.
    handles.push(
      ...(await Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => (rewarded = true)),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => onClosed()),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          failed = true
          onClosed()
        }),
      ]))
    )
    markFullscreenShown()
    AdMob.showRewardVideoAd()
      .then(() => (rewarded = true))
      .catch(() => {})
    await closed
    if (rewarded) return "rewarded"
    return failed ? "failed" : "dismissed"
  } catch {
    return "failed"
  } finally {
    await Promise.all(handles.map((h) => h.remove().catch(() => {})))
    fullscreenBusy = false
  }
}

// ── Counters ──

/** Counts one occurrence under `key`. Returns the new count, or 0 when storage is unavailable. */
export function bumpCount(key: string): number {
  const count = readNumber(key) + 1
  return writeNumber(key, count) ? count : 0
}

export function readCount(key: string): number {
  return readNumber(key)
}

export function resetCount(key: string) {
  writeNumber(key, 0)
}
