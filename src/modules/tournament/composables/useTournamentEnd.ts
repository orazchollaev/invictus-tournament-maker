import { useInAppReview } from "@/composables/useInAppReview"
import { promptSupportAfterTournament } from "@/composables/useSupport"
import { showInterstitialAd } from "@/lib/admob"
import { adConfig } from "@/lib/remoteConfig"

// AdMob unit "Tournament End Interstitial".
const TOURNAMENT_END_AD_UNIT_ID = "ca-app-pub-5867331300737777/6064640963"
/** Lets the confetti and the winner sound play out before an ad covers them. */
const END_AD_DELAY_MS = 3_000

/**
 * A finished tournament is the app's best moment, and it gets one thing only:
 * the store review while it is still due, else the support prompt when its
 * cooldown allows, else an interstitial. Three dialogs at once would bury the win.
 */
export function useTournamentEnd() {
  const { onTournamentCompleted } = useInAppReview()

  function onTournamentFinished() {
    if (onTournamentCompleted()) return
    if (promptSupportAfterTournament()) return
    if (!adConfig.ad_tournament_end) return
    setTimeout(() => void showInterstitialAd(TOURNAMENT_END_AD_UNIT_ID), END_AD_DELAY_MS)
  }

  return { onTournamentFinished }
}
