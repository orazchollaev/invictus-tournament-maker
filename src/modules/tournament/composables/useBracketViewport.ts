import { computed, onMounted, onUnmounted, reactive, ref } from "vue"

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1
/** How long after the last wheel tick the layer stays flagged as "zooming". */
const ZOOM_SETTLE_MS = 150
/** Double-tap window: two touchstarts within this time + distance count as one gesture. */
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_DIST = 30
const DOUBLE_TAP_ZOOM = 2

function clamp(z: number, max = MAX_ZOOM) {
  return Math.min(max, Math.max(MIN_ZOOM, z))
}

export interface BracketViewportOptions {
  /** Upper bound fitScreen may zoom to — the fullscreen modal is allowed past 1. */
  maxFitZoom?: number
  /** Keep the pan layer GPU-promoted even when idle (low-quality mode). */
  forceWillChange?: () => boolean
}

/**
 * Drag-to-pan + wheel/pinch-to-zoom viewport for a bracket.
 *
 * One instance per viewport: the inline panel and the fullscreen modal each get
 * their own, which is why nothing here is module-level state.
 */
export function useBracketViewport(options: BracketViewportOptions = {}) {
  const { maxFitZoom = 1, forceWillChange } = options

  const wrapperRef = ref<HTMLElement | null>(null)
  const innerRef = ref<HTMLElement | null>(null)

  const zoom = ref(1)
  const pan = reactive({ x: 0, y: 0 })
  const isDragging = ref(false)
  const isZooming = ref(false)

  const dragStart = { x: 0, y: 0, px: 0, py: 0 }
  let zoomSettleTimer = 0
  let pinchDist0 = 0
  let pinchZoom0 = 1
  let lastTapTime = 0
  let lastTapX = 0
  let lastTapY = 0

  // Coalesce pan writes to one per frame — mouse/touchmove can fire faster than the
  // display refreshes, and each write was forcing a style recalc on the whole pan layer.
  let panRaf = 0
  let pendingPanX = 0
  let pendingPanY = 0
  function schedulePan(x: number, y: number) {
    pendingPanX = x
    pendingPanY = y
    if (panRaf) return
    panRaf = requestAnimationFrame(() => {
      panRaf = 0
      pan.x = pendingPanX
      pan.y = pendingPanY
    })
  }

  const transform = computed(() => `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom.value})`)

  const layerStyle = computed(() => ({
    willChange: isDragging.value || isZooming.value || forceWillChange?.() ? "transform" : "auto",
  }))

  // ── Mouse drag ──────────────────────────────────────────────
  function onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest("button, input, a")) return
    isDragging.value = true
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    dragStart.px = pan.x
    dragStart.py = pan.y
    e.preventDefault()
  }

  function onWindowMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    schedulePan(dragStart.px + e.clientX - dragStart.x, dragStart.py + e.clientY - dragStart.y)
  }

  function stopDrag() {
    isDragging.value = false
  }

  /** Anchor a zoom toggle at a screen point, same ratio math as onWheel/pinch. */
  function zoomAt(clientX: number, clientY: number, newZoom: number) {
    const wrapper = wrapperRef.value
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    const cx = clientX - rect.left - rect.width / 2
    const cy = clientY - rect.top - rect.height / 2
    const ratio = newZoom / zoom.value
    pan.x = cx - (cx - pan.x) * ratio
    pan.y = cy - (cy - pan.y) * ratio
    zoom.value = newZoom
  }

  // ── Touch: 1 finger pans/double-taps, 2 fingers pinch-zoom ──
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      pinchDist0 = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      pinchZoom0 = zoom.value
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      const now = performance.now()
      const isDoubleTap =
        now - lastTapTime < DOUBLE_TAP_MS &&
        Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < DOUBLE_TAP_DIST
      lastTapTime = isDoubleTap ? 0 : now
      lastTapX = t.clientX
      lastTapY = t.clientY

      if (isDoubleTap) {
        zoomAt(t.clientX, t.clientY, clamp(zoom.value > 1.01 ? 1 : DOUBLE_TAP_ZOOM))
        return
      }

      isDragging.value = true
      dragStart.x = t.clientX
      dragStart.y = t.clientY
      dragStart.px = pan.x
      dragStart.py = pan.y
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      const wrapper = wrapperRef.value
      if (!wrapper) return

      const [t0, t1] = e.touches
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
      const newZoom = +clamp(pinchZoom0 * (dist / pinchDist0)).toFixed(2)
      if (newZoom === zoom.value) return

      // Anchor the zoom at the pinch midpoint (relative to wrapper center), same
      // math as onWheel — recomputed every move so it tracks the fingers, not the center.
      const rect = wrapper.getBoundingClientRect()
      const midX = (t0.clientX + t1.clientX) / 2
      const midY = (t0.clientY + t1.clientY) / 2
      const cx = midX - rect.left - rect.width / 2
      const cy = midY - rect.top - rect.height / 2

      const ratio = newZoom / zoom.value
      pan.x = cx - (cx - pan.x) * ratio
      pan.y = cy - (cy - pan.y) * ratio
      zoom.value = newZoom
    } else if (isDragging.value && e.touches.length === 1) {
      schedulePan(
        dragStart.px + e.touches[0].clientX - dragStart.x,
        dragStart.py + e.touches[0].clientY - dragStart.y
      )
    }
  }

  function onTouchEnd() {
    isDragging.value = false
  }

  // ── Wheel zoom, anchored at the cursor ──────────────────────
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const wrapper = wrapperRef.value
    if (!wrapper) return

    isZooming.value = true
    clearTimeout(zoomSettleTimer)
    zoomSettleTimer = window.setTimeout(() => {
      isZooming.value = false
    }, ZOOM_SETTLE_MS)

    const rect = wrapper.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2

    const rawDelta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
    const newZoom = +clamp(zoom.value * Math.exp(-rawDelta * 0.0015)).toFixed(3)
    const ratio = newZoom / zoom.value

    pan.x = cx - (cx - pan.x) * ratio
    pan.y = cy - (cy - pan.y) * ratio
    zoom.value = newZoom
  }

  // ── Discrete controls ───────────────────────────────────────
  function zoomIn() {
    zoom.value = clamp(+(zoom.value + ZOOM_STEP).toFixed(1))
  }

  function zoomOut() {
    zoom.value = clamp(+(zoom.value - ZOOM_STEP).toFixed(1))
  }

  function reset() {
    zoom.value = 1
    pan.x = 0
    pan.y = 0
  }

  function fitScreen() {
    const wrapper = wrapperRef.value
    const inner = innerRef.value
    if (!wrapper || !inner) return
    const iW = inner.scrollWidth
    const iH = inner.scrollHeight
    if (iW && iH) {
      const fit = Math.min(wrapper.clientWidth / iW, wrapper.clientHeight / iH) * 0.9
      zoom.value = +clamp(fit, maxFitZoom).toFixed(2)
    }
    pan.x = 0
    pan.y = 0
  }

  /** Freeze the current view and hand back a restore callback (used around PNG export). */
  function snapshot() {
    const z = zoom.value
    const x = pan.x
    const y = pan.y
    return () => {
      zoom.value = z
      pan.x = x
      pan.y = y
    }
  }

  onMounted(() => {
    window.addEventListener("mousemove", onWindowMouseMove)
    window.addEventListener("mouseup", stopDrag)
  })

  onUnmounted(() => {
    window.removeEventListener("mousemove", onWindowMouseMove)
    window.removeEventListener("mouseup", stopDrag)
    clearTimeout(zoomSettleTimer)
    cancelAnimationFrame(panRaf)
  })

  return {
    wrapperRef,
    innerRef,
    zoom,
    pan,
    isDragging,
    isZooming,
    transform,
    layerStyle,
    onMouseDown,
    onWheel,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    zoomIn,
    zoomOut,
    fitScreen,
    reset,
    snapshot,
  }
}

export type BracketViewport = ReturnType<typeof useBracketViewport>
