import { Capacitor } from "@capacitor/core"

const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/8465973446"
const CREATION_SCORE_KEY = "invictus_tournament_creation_score"
const TRIGGER_AT = 5

let initialized: Promise<void> | null = null

function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = import("@capacitor-community/admob").then(({ AdMob }) => AdMob.initialize())
  }
  return initialized
}

export function useInterstitialAd() {
  /** weight: 1 for a brand-new tournament, 0.75 for a new season of an existing one. */
  async function onTournamentCreated(weight: 1 | 0.75 = 1) {
    if (!Capacitor.isNativePlatform()) return

    const score = parseFloat(localStorage.getItem(CREATION_SCORE_KEY) ?? "0") + weight
    if (score < TRIGGER_AT) {
      localStorage.setItem(CREATION_SCORE_KEY, String(score))
      return
    }
    localStorage.setItem(CREATION_SCORE_KEY, "0")

    try {
      await ensureInitialized()
      const { AdMob } = await import("@capacitor-community/admob")
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID })
      await AdMob.showInterstitial()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { onTournamentCreated }
}
