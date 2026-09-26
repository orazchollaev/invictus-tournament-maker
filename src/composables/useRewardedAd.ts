import { computed, ref } from "vue"
import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

const REWARDED_AD_UNIT_ID = "ca-app-pub-5867331300737777/4106543143"
const SELECTION_COUNT_KEY = "invictus_sample_data_selection_count"
/** Every 2nd sample-data selection shows a rewarded ad. */
const AD_EVERY = 2

function readCount(): number {
  return parseInt(localStorage.getItem(SELECTION_COUNT_KEY) ?? "0", 10) || 0
}

// Module-level so every component using the composable sees the same count.
const selectionCount = ref(readCount())

export function useRewardedAd() {
  /** True when the *next* sample-data selection is the one that shows an ad. */
  const nextSelectionShowsAd = computed(() => (selectionCount.value + 1) % AD_EVERY === 0)

  /** Count one sample-data selection and, on every 2nd, show a rewarded ad. */
  async function onSampleDataSelected() {
    const count = selectionCount.value + 1
    selectionCount.value = count
    localStorage.setItem(SELECTION_COUNT_KEY, String(count))
    if (count % AD_EVERY !== 0) return

    if (!Capacitor.isNativePlatform()) return
    try {
      const { AdMob } = await loadAdMob()
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID })
      await AdMob.showRewardVideoAd()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { nextSelectionShowsAd, onSampleDataSelected }
}
