import { computed, onMounted, onUnmounted, reactive, ref } from "vue"

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1
/** How long after the last wheel tick the layer stays flagged as "zooming". */
const ZOOM_SETTLE_MS = 150

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
    pan.x = dragStart.px + e.clientX - dragStart.x
    pan.y = dragStart.py + e.clientY - dragStart.y
  }

  function stopDrag() {
    isDragging.value = false
  }

  // ── Touch: 1 finger pans, 2 fingers pinch-zoom ──────────────
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      pinchDist0 = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      pinchZoom0 = zoom.value
    } else if (e.touches.length === 1) {
      isDragging.value = true
      dragStart.x = e.touches[0].clientX
      dragStart.y = e.touches[0].clientY
      dragStart.px = pan.x
      dragStart.py = pan.y
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      zoom.value = +clamp(pinchZoom0 * (dist / pinchDist0)).toFixed(2)
    } else if (isDragging.value && e.touches.length === 1) {
      pan.x = dragStart.px + e.touches[0].clientX - dragStart.x
      pan.y = dragStart.py + e.touches[0].clientY - dragStart.y
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
