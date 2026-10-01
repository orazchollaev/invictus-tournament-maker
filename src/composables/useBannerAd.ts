import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue"
import { Capacitor } from "@capacitor/core"
import { loadAdMob } from "@/lib/admob"

export interface BannerAdOptions {
  /** Whether the banner should be on screen right now. */
  visible: MaybeRefOrGetter<boolean>
  /** Which screen edge `offset` is measured from. */
  edge: "top" | "bottom"
  /** CSS length between that screen edge and the banner. */
  offset: () => string
  /** Hide the banner while a modal, sheet or dialog is open — it is a native view drawn over the WebView. */
  hideUnderOverlays?: boolean
}

/** Wait before asking again after a no-fill; hammering the ad unit only lowers its fill further. */
const RETRY_AFTER_FAIL_MS = 45_000
/** Sub-pixel layout jitter is not worth throwing a loaded banner away for. */
const MARGIN_TOLERANCE_PX = 2

// The plugin shows one banner at a time, so track which caller currently owns it.
let owner: symbol | null = null
let ownerMargin = 0
let queue: Promise<void> = Promise.resolve()
const onFailed = new Map<symbol, () => void>()
const onResized = new Map<symbol, (height: number) => void>()
let listeners: Promise<unknown> | null = null

function run(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {
    // best-effort: silently ignore if unavailable
  })
}

/**
 * On a failed load the plugin destroys its native view itself. Without
 * clearing `owner` here, the next show would `resumeBanner` a view that no
 * longer exists and the slot would stay empty until the component remounts.
 *
 * Size changes report the adaptive banner's real height, so the owner's slot
 * can match it. Hide and remove report 0×0, which is not a size to adopt.
 */
function listen({ AdMob, BannerAdPluginEvents }: Awaited<ReturnType<typeof loadAdMob>>) {
  listeners ??= Promise.all([
    AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      const failed = owner
      owner = null
      if (failed) onFailed.get(failed)?.()
    }),
    AdMob.addListener(BannerAdPluginEvents.SizeChanged, ({ height }) => {
      if (owner && height > 0) onResized.get(owner)?.(height)
    }),
  ])
  return listeners
}

/**
 * Anchored adaptive banners span the screen width at roughly a 320:50
 * ratio, kept between 50 and 90dp. A first guess for the slot so the layout
 * barely moves when the real height arrives.
 */
function estimateAdaptiveHeight(): number {
  return Math.min(90, Math.max(50, Math.round((window.innerWidth * 50) / 320)))
}

function cssLengthPx(value: string): number {
  const probe = document.createElement("div")
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`
  document.body.appendChild(probe)
  const px = probe.offsetHeight
  probe.remove()
  return px
}

function useOverlayOpen() {
  const open = ref(false)
  let observer: MutationObserver | null = null
  const check = () => {
    open.value = !!document.querySelector('[role="dialog"], [role="alertdialog"]')
  }
  onMounted(() => {
    check()
    observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
  })
  onBeforeUnmount(() => observer?.disconnect())
  return open
}

/**
 * Native AdMob anchored adaptive banner tied to the calling component's
 * lifetime: full screen width, its height reported back as `height` (CSS
 * px) for the slot. Adaptive fills better and earns more than a fixed 320×50.
 * The plugin can only pin it to a screen edge, so callers reserve the space
 * in their layout and point `offset` at it. Off native there is no banner:
 * `preview` is true only in dev, where callers paint the slot so the
 * placement can be checked; production web drops the slot entirely.
 */
export function useBannerAd(adId: string, options: BannerAdOptions) {
  const enabled = Capacitor.isNativePlatform()
  const preview = !enabled && import.meta.env.DEV
  const height = ref(estimateAdaptiveHeight())
  if (!enabled) return { enabled, preview, height }

  const me = Symbol(adId)
  const overlayOpen = options.hideUnderOverlays ? useOverlayOpen() : ref(false)
  const retry = ref(0)
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  onFailed.set(me, () => {
    clearTimeout(retryTimer)
    retryTimer = setTimeout(() => retry.value++, RETRY_AFTER_FAIL_MS)
  })
  onResized.set(me, (h) => (height.value = h))

  watch(
    [() => toValue(options.visible) && !overlayOpen.value, retry],
    ([show]) => {
      run(async () => {
        const mod = await loadAdMob()
        const { AdMob, BannerAdPosition, BannerAdSize } = mod
        await listen(mod)
        if (!show) {
          if (owner === me) await AdMob.hideBanner()
          return
        }
        const margin = cssLengthPx(options.offset())
        if (owner === me && Math.abs(margin - ownerMargin) <= MARGIN_TOLERANCE_PX) {
          await AdMob.resumeBanner()
          return
        }
        // The plugin can't move a banner, so a new spot means a fresh one.
        if (owner) await AdMob.removeBanner()
        owner = me
        ownerMargin = margin
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position:
            options.edge === "top" ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
          margin,
        })
      })
    },
    { immediate: true, flush: "post" }
  )

  onBeforeUnmount(() => {
    clearTimeout(retryTimer)
    onFailed.delete(me)
    onResized.delete(me)
    run(async () => {
      if (owner !== me) return
      owner = null
      const { AdMob } = await loadAdMob()
      await AdMob.removeBanner()
    })
  })

  return { enabled, preview, height }
}
