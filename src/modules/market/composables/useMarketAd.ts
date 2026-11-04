import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

// AdMob unit "Community Dataset Selected".
const MARKET_INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/3030826668"
const DOWNLOAD_COUNT_KEY = "invictus_market_download_count"
/** Every 3rd community dataset added shows an interstitial. */
const AD_EVERY = 3

function readCount(): number {
  try {
    return parseInt(localStorage.getItem(DOWNLOAD_COUNT_KEY) ?? "0", 10) || 0
  } catch {
    return 0
  }
}

export function useMarketAd() {
  /** Count one community dataset added to the user's teams; every 3rd shows an interstitial. */
  async function onCommunityDatasetAdded() {
    if (!Capacitor.isNativePlatform()) return

    const count = readCount() + 1
    try {
      localStorage.setItem(DOWNLOAD_COUNT_KEY, String(count % AD_EVERY))
    } catch {
      // storage unavailable: the ad is skipped rather than shown every time
      return
    }
    if (count % AD_EVERY !== 0) return

    // Loaded only now and dropped once shown: a loaded ad keeps its own
    // WebView alive, so nothing is held in memory between triggers.
    try {
      const { AdMob } = await loadAdMob()
      await AdMob.prepareInterstitial({ adId: MARKET_INTERSTITIAL_AD_UNIT_ID })
      await AdMob.showInterstitial()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { onCommunityDatasetAdded }
}
