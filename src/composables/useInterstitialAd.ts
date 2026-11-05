import { Capacitor } from "@capacitor/core"
import { canShowFullscreen, showInterstitialAd } from "@/lib/admob"
import { adConfig } from "@/lib/remoteConfig"

const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/8465973446"
const CREATION_SCORE_KEY = "invictus_tournament_creation_score"

function readScore(): number {
  try {
    return parseFloat(localStorage.getItem(CREATION_SCORE_KEY) ?? "0") || 0
  } catch {
    return 0
  }
}

function writeScore(score: number) {
  try {
    localStorage.setItem(CREATION_SCORE_KEY, String(score))
  } catch {
    // storage unavailable: the score just does not build up
  }
}

export function useInterstitialAd() {
  /**
   * weight: 1 for a brand-new tournament, 0.75 for a new season of an existing one.
   * Once the score reaches the trigger, the ad shows on the first creation the
   * shared full-screen clock allows; until then the score keeps building.
   */
  async function onTournamentCreated(weight: 1 | 0.75 = 1) {
    if (!Capacitor.isNativePlatform()) return

    const score = readScore() + weight
    if (score < adConfig.ad_creation_trigger || !canShowFullscreen()) {
      writeScore(score)
      return
    }
    writeScore(0)
    await showInterstitialAd(INTERSTITIAL_AD_UNIT_ID)
  }

  return { onTournamentCreated }
}
