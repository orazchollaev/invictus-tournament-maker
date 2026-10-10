import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-5867331300737777/8465973446"
const CREATION_SCORE_KEY = "invictus_tournament_creation_score"
const TRIGGER_AT = 3
/** Smallest weight a creation can add — once within this of TRIGGER_AT, the next one may show the ad. */
const MIN_WEIGHT = 0.75
/** A loaded interstitial expires after an hour; reload a little before that. */
const PRELOAD_TTL_MS = 50 * 60_000

// Loaded ahead of time so the ad shows the moment it is due, instead of the
// user landing on the new tournament and an ad popping up seconds later.
let preloaded: Promise<void> | null = null
let preloadedAt = 0

function readScore(): number {
  return parseFloat(localStorage.getItem(CREATION_SCORE_KEY) ?? "0") || 0
}

function preload() {
  if (preloaded && Date.now() - preloadedAt < PRELOAD_TTL_MS) return preloaded
  preloadedAt = Date.now()
  const loading = loadAdMob().then(({ AdMob }) =>
    AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID }).then(() => undefined)
  )
  preloaded = loading
  loading.catch(() => {
    if (preloaded === loading) preloaded = null
  })
  return loading
}

/** Called at launch: if the next creation is the one that shows the ad, start loading it now. */
export function preloadInterstitialIfDue() {
  if (!Capacitor.isNativePlatform()) return
  if (readScore() + MIN_WEIGHT >= TRIGGER_AT) void preload().catch(() => {})
}

export function useInterstitialAd() {
  /** weight: 1 for a brand-new tournament, 0.75 for a new season of an existing one. */
  async function onTournamentCreated(weight: 1 | 0.75 = 1) {
    if (!Capacitor.isNativePlatform()) return

    const score = readScore() + weight
    if (score < TRIGGER_AT) {
      localStorage.setItem(CREATION_SCORE_KEY, String(score))
      if (score + MIN_WEIGHT >= TRIGGER_AT) void preload().catch(() => {})
      return
    }
    localStorage.setItem(CREATION_SCORE_KEY, "0")

    try {
      await preload()
      preloaded = null
      const { AdMob } = await loadAdMob()
      await AdMob.showInterstitial()
    } catch {
      // best-effort: silently ignore if unavailable
    }
  }

  return { onTournamentCreated }
}
