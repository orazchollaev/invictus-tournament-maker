import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/8465973446"
const CREATION_SCORE_KEY = "invictus_tournament_creation_score"
const TRIGGER_AT = 3

function readScore(): number {
  return parseFloat(localStorage.getItem(CREATION_SCORE_KEY) ?? "0") || 0
}

export function useInterstitialAd() {
  /** weight: 1 for a brand-new tournament, 0.75 for a new season of an existing one. */
  async function onTournamentCreated(weight: 1 | 0.75 = 1) {
    if (!Capacitor.isNativePlatform()) return

    const score = readScore() + weight
    if (score < TRIGGER_AT) {
      localStorage.setItem(CREATION_SCORE_KEY, String(score))
      return
    }
    localStorage.setItem(CREATION_SCORE_KEY, "0")

    // Loaded only now and dropped once shown: a loaded ad keeps its own
    // WebView alive, so nothing is held in memory between triggers.
    try {
      const { AdMob } = await loadAdMob()
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID })
      await AdMob.showInterstitial()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { onTournamentCreated }
}
