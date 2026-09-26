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

// The plugin shows one banner at a time, so track which caller currently owns it.
let owner: symbol | null = null
let ownerMargin = 0
let queue: Promise<void> = Promise.resolve()

function run(task: () => Promise<void>) {
  queue = queue.then(task).catch(() => {
    // best-effort: silently ignore if unavailable
  })
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
 * Native AdMob 320×50 banner tied to the calling component's lifetime. The
 * plugin can only pin it to a screen edge, so callers reserve the space in
 * their layout and point `offset` at it. Off native there is no banner:
 * `preview` is true only in dev, where callers paint the slot so the
 * placement can be checked; production web drops the slot entirely.
 */
export function useBannerAd(adId: string, options: BannerAdOptions) {
  const enabled = Capacitor.isNativePlatform()
  const preview = !enabled && import.meta.env.DEV
  if (!enabled) return { enabled, preview }

  const me = Symbol(adId)
  const overlayOpen = options.hideUnderOverlays ? useOverlayOpen() : ref(false)

  watch(
    () => toValue(options.visible) && !overlayOpen.value,
    (show) => {
      run(async () => {
        const { AdMob, BannerAdPosition, BannerAdSize } = await loadAdMob()
        if (!show) {
          if (owner === me) await AdMob.hideBanner()
          return
        }
        const margin = cssLengthPx(options.offset())
        if (owner === me && margin === ownerMargin) {
          await AdMob.resumeBanner()
          return
        }
        // The plugin can't move a banner, so a new spot means a fresh one.
        if (owner) await AdMob.removeBanner()
        owner = me
        ownerMargin = margin
        await AdMob.showBanner({
          adId,
          adSize: BannerAdSize.BANNER,
          position:
            options.edge === "top" ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
          margin,
        })
      })
    },
    { immediate: true, flush: "post" },
  )

  onBeforeUnmount(() => {
    run(async () => {
      if (owner !== me) return
      owner = null
      const { AdMob } = await loadAdMob()
      await AdMob.removeBanner()
    })
  })

  return { enabled, preview }
}
