import { computed, ref } from "vue"
import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

const REWARDED_AD_UNIT_ID = "ca-app-pub-5867331300737777/4106543143"
const SELECTION_COUNT_KEY = "invictus_sample_data_selection_count"
/** Every 2nd sample-data selection shows a rewarded ad. */
const AD_EVERY = 2
/** A loaded rewarded ad expires after an hour; reload a little before that. */
const PRELOAD_TTL_MS = 50 * 60_000

function readCount(): number {
  return parseInt(localStorage.getItem(SELECTION_COUNT_KEY) ?? "0", 10) || 0
}

// Module-level so every component using the composable sees the same count.
const selectionCount = ref(readCount())
const nextSelectionShowsAd = computed(() => (selectionCount.value + 1) % AD_EVERY === 0)

// Loaded ahead of time so the ad starts right after the dataset is picked.
let preloaded: Promise<void> | null = null
let preloadedAt = 0

function preload() {
  if (preloaded && Date.now() - preloadedAt < PRELOAD_TTL_MS) return preloaded
  preloadedAt = Date.now()
  const loading = loadAdMob().then(({ AdMob }) =>
    AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT_ID }).then(() => undefined)
  )
  preloaded = loading
  loading.catch(() => {
    if (preloaded === loading) preloaded = null
  })
  return loading
}

/** Called at launch: if the next selection is the one that shows the ad, start loading it now. */
export function preloadRewardedIfDue() {
  if (!Capacitor.isNativePlatform() || !nextSelectionShowsAd.value) return
  void preload().catch(() => {})
}

export function useRewardedAd() {
  /** Count one sample-data selection and, on every 2nd, show a rewarded ad. */
  async function onSampleDataSelected() {
    const count = selectionCount.value + 1
    selectionCount.value = count
    localStorage.setItem(SELECTION_COUNT_KEY, String(count))
    if (count % AD_EVERY !== 0) {
      preloadRewardedIfDue()
      return
    }

    if (!Capacitor.isNativePlatform()) return
    try {
      await preload()
      preloaded = null
      const { AdMob } = await loadAdMob()
      await AdMob.showRewardVideoAd()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { nextSelectionShowsAd, onSampleDataSelected }
}
