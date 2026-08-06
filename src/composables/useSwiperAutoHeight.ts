import { onScopeDispose } from "vue"
import type { Swiper as SwiperInstance } from "swiper/types"

/** How long the wrapper must be still before a scroll counts as finished. */
const SETTLE_MS = 120

/**
 * Swiper's own `autoHeight` is inert under `cssMode`.
 *
 * `autoHeight` re-measures the active slide from `transitionStart()`, and that
 * function returns early when `cssMode` is on (swiper/shared/swiper-core.mjs).
 * The only measurement that survives is the one during init, so the wrapper
 * keeps whatever height slide 0 happened to have and every taller tab is cut
 * off at that line.
 *
 * So we drive the measurement ourselves: whenever the active slide's content
 * changes size (simulating a matchday adds rows, switching a group sub-tab
 * swaps a whole table), and after the wrapper settles on a new slide.
 *
 * The height is *only ever written while the wrapper is at rest*, and that
 * rule is the whole reason this file has a scroll listener. Under `cssMode`
 * the wrapper is the scroll container and `slideTo()` drives it with native
 * `scrollTo({ behavior: "smooth" })`. Resizing a scroll container mid-scroll
 * cancels that animation, so measuring on `slideChange` — which fires once per
 * slide the scroll passes over — would strand a multi-slide tab jump on
 * whichever slide it happened to be crossing.
 *
 * The CSS side already works: with `autoHeight` on, Swiper adds a
 * `swiper-autoheight` class and its own stylesheet sets `height: auto` on the
 * slides plus `align-items: flex-start` on the wrapper, so slides size to their
 * content. Only the JS measurement is missing — do not set a fixed height on
 * the Swiper element or its wrapper, which would override that.
 */
export function useSwiperAutoHeight() {
  let swiper: SwiperInstance | null = null
  let observer: ResizeObserver | null = null
  let wrapper: HTMLElement | null = null
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let isScrolling = false
  /* Guards the ResizeObserver against its own writes: updateAutoHeight()
     resizes the wrapper, which can re-trigger the observer. */
  let lastHeight = -1

  function activeSlide(): HTMLElement | undefined {
    if (!swiper || swiper.destroyed) return undefined
    return swiper.slides?.[swiper.activeIndex]
  }

  function measure() {
    if (isScrolling) return
    const slide = activeSlide()
    if (!slide || !swiper) return
    const height = slide.offsetHeight
    if (height === lastHeight) return
    lastHeight = height
    swiper.updateAutoHeight()
  }

  function onScroll() {
    isScrolling = true
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      isScrolling = false
      sync()
    }, SETTLE_MS)
  }

  /** Re-point the observer at whichever slide is now active, then measure. */
  function sync() {
    const slide = activeSlide()
    if (!observer) return
    observer.disconnect()
    if (slide) observer.observe(slide)
    // The incoming slide is a different height than the one we just left, so
    // the cached value from that slide must not suppress this measurement.
    lastHeight = -1
    measure()
  }

  function attach(instance: SwiperInstance) {
    detach()
    swiper = instance
    wrapper = instance.wrapperEl ?? null
    wrapper?.addEventListener("scroll", onScroll, { passive: true })
    observer = new ResizeObserver(measure)
    sync()
  }

  function detach() {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = null
    isScrolling = false
    wrapper?.removeEventListener("scroll", onScroll)
    wrapper = null
    observer?.disconnect()
    observer = null
    swiper = null
  }

  onScopeDispose(detach)

  return { attach, sync }
}
