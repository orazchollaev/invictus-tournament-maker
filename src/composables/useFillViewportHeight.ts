import { onMounted, onUnmounted, ref, type Ref } from "vue"

/**
 * Height that makes an element end at the bottom of the viewport.
 *
 * Measures only the element's distance from the top of the viewport; the rest
 * stays in CSS so dynamic viewport units and safe areas keep working on mobile.
 */
export function useFillViewportHeight(anchor: Ref<HTMLElement | null>) {
  const height = ref<string | undefined>(undefined)

  let observer: ResizeObserver | null = null

  const measure = () => {
    const el = anchor.value
    if (!el) return
    const top = Math.round(el.getBoundingClientRect().top + window.scrollY)
    height.value = `calc(100dvh - ${top}px - var(--safe-bottom) - var(--sp-2))`
  }

  onMounted(() => {
    measure()
    window.addEventListener("resize", measure)
    // Anything above the anchor (title, tab bar) can wrap and shift it down.
    const parent = anchor.value?.parentElement
    if (parent) {
      observer = new ResizeObserver(measure)
      observer.observe(parent)
    }
  })

  onUnmounted(() => {
    window.removeEventListener("resize", measure)
    observer?.disconnect()
  })

  return { height, measure }
}
