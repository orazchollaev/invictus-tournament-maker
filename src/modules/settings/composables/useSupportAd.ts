import { ref } from "vue"
import { Capacitor } from "@capacitor/core"
import { logEvent } from "@/composables/useAnalytics"
import { showRewardedAd } from "@/lib/admob"

// AdMob unit "Support Rewarded".
const SUPPORT_REWARDED_AD_UNIT_ID = "ca-app-pub-5867331300737777/4331535703"

/**
 * "Watch an ad to support": the way in for everyone who wants to give something
 * but holds no crypto. Opt-in, so it is a rewarded ad: the reward is the thanks.
 */
export function useSupportAd() {
  const adAvailable = Capacitor.isNativePlatform()
  const adStatus = ref<"idle" | "loading" | "thanks" | "failed">("idle")

  async function watchAd() {
    if (adStatus.value === "loading") return
    adStatus.value = "loading"
    void logEvent("support_ad_tap")
    const result = await showRewardedAd(SUPPORT_REWARDED_AD_UNIT_ID)
    void logEvent("support_ad_result", { result })
    if (result === "rewarded") adStatus.value = "thanks"
    else if (result === "failed") adStatus.value = "failed"
    else adStatus.value = "idle"
  }

  return { adAvailable, adStatus, watchAd }
}
