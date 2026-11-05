import { Capacitor } from "@capacitor/core"
import { bumpCount, resetCount, showInterstitialAd } from "@/lib/admob"
import { countReached } from "@/lib/adPolicy"
import { adConfig } from "@/lib/remoteConfig"

// AdMob unit "Community Dataset Selected".
const MARKET_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/3030826668"
const DOWNLOAD_COUNT_KEY = "invictus_market_download_count"

export function useMarketAd() {
  /**
   * Counts one community dataset added to the user's teams; once every Nth is
   * reached, shows an interstitial and starts counting again. Blocked by the
   * shared full-screen clock, the count is kept for the next one.
   */
  async function onCommunityDatasetAdded() {
    if (!Capacitor.isNativePlatform()) return
    // 0 means storage is unavailable: the ad is skipped rather than shown every time.
    const count = bumpCount(DOWNLOAD_COUNT_KEY)
    if (!countReached(count, adConfig.ad_market_every)) return
    if (await showInterstitialAd(MARKET_INTERSTITIAL_AD_UNIT_ID)) resetCount(DOWNLOAD_COUNT_KEY)
  }

  return { onCommunityDatasetAdded }
}
