import { ref } from "vue"
import { Capacitor } from "@capacitor/core"

type AdMobModule = typeof import("@capacitor-community/admob")

let loaded: Promise<AdMobModule> | null = null

/** True when the user is in a region (EEA/UK…) where Google requires a way back into the consent form. */
export const privacyOptionsRequired = ref(false)

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
      info = await AdMob.showConsentForm()
    }
    privacyOptionsRequired.value =
      // The plugin does not export this enum from its entry point.
      info.privacyOptionsRequirementStatus === "REQUIRED"
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

/** Lazy-loads the AdMob plugin and initializes it once. Callers check the native platform first. */
export function loadAdMob() {
  loaded ??= import("@capacitor-community/admob").then(async (mod) => {
    await mod.AdMob.initialize()
    await gatherConsent(mod)
    return mod
  })
  return loaded
}

/**
 * Starts AdMob at launch rather than at the first ad, so a due consent form
 * shows on the home screen instead of over a draw or a match, and the first
 * ad request is not also paying for SDK start-up.
 */
export function initAds() {
  if (!Capacitor.isNativePlatform()) return Promise.resolve()
  return loadAdMob().then(
    () => undefined,
    () => undefined
  )
}

/** Reopens the consent form so the user can change their choice. */
export async function showPrivacyOptions() {
  const { AdMob } = await loadAdMob()
  await AdMob.showPrivacyOptionsForm()
}
