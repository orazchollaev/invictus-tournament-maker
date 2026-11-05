import { Capacitor } from "@capacitor/core"
import {
  bumpCount,
  canShowFullscreen,
  readCount,
  resetCount,
  showInterstitialAd,
} from "@/lib/admob"
import { countReached } from "@/lib/adPolicy"
import { adConfig } from "@/lib/remoteConfig"

// AdMob unit "Sample Data Interstitial".
const SAMPLE_DATA_AD_UNIT_ID = "ca-app-pub-5867331300737777/2975443194"
const SELECTION_COUNT_KEY = "invictus_sample_data_selection_count"

export function useSampleDataAd() {
  /** Whether adding one more sample dataset now would show an ad, so the confirm can say so. */
  function nextSelectionShowsAd(): boolean {
    if (!Capacitor.isNativePlatform()) return false
    const due = countReached(readCount(SELECTION_COUNT_KEY) + 1, adConfig.ad_sample_data_every)
    return due && canShowFullscreen()
  }

  /**
   * Counts one sample dataset added; once every Nth is reached, shows an
   * interstitial and starts counting again. Blocked by the shared clock, the
   * count is kept, so the next one shows it instead.
   */
  async function onSampleDataSelected() {
    if (!Capacitor.isNativePlatform()) return
    const count = bumpCount(SELECTION_COUNT_KEY)
    if (!countReached(count, adConfig.ad_sample_data_every)) return
    if (await showInterstitialAd(SAMPLE_DATA_AD_UNIT_ID)) resetCount(SELECTION_COUNT_KEY)
  }

  return { nextSelectionShowsAd, onSampleDataSelected }
}
