import type { Ref } from "vue"

interface SwipeOptions {
  threshold?: number
  timeout?: number
}

export function useSwipe(
  el: Ref<HTMLElement | null>,
  handlers: { onSwipeLeft?: () => void; onSwipeRight?: () => void },
  options: SwipeOptions = {}
) {
  const { threshold = 50, timeout = 300 } = options

  let startX = 0
  let startY = 0
  let startTime = 0

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    startTime = Date.now()
  }

  function onTouchEnd(e: TouchEvent) {
    if (!e.changedTouches.length) return
    const dx = e.changedTouches[0].clientX - startX
    const dy = e.changedTouches[0].clientY - startY
    const dt = Date.now() - startTime
    if (dt > timeout) return
    if (Math.abs(dx) < threshold) return
    if (Math.abs(dy) > Math.abs(dx)) return // vertical scroll, ignore
    if (dx < 0) handlers.onSwipeLeft?.()
    else handlers.onSwipeRight?.()
  }

  function mount() {
    const node = el.value
    if (!node) return
    node.addEventListener("touchstart", onTouchStart, { passive: true })
    node.addEventListener("touchend", onTouchEnd, { passive: true })
  }

  function unmount() {
    const node = el.value
    if (!node) return
    node.removeEventListener("touchstart", onTouchStart)
    node.removeEventListener("touchend", onTouchEnd)
  }

  return { mount, unmount }
}
