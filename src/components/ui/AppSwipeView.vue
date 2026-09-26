<script setup lang="ts" generic="T extends string">
/**
 * Swipeable tab panes — a hand-rolled replacement for Swiper.
 *
 * Every rendered pane is absolutely stacked and placed by a static "slot"
 * transform (-1 / 0 / +1 widths). All motion happens on one track element
 * whose transform is written straight to the DOM, so a drag frame or a slide
 * animation never goes through Vue and runs on the compositor.
 *
 * A slide — swipe release or tab click, adjacent or far — is always the track
 * moving by exactly one width: a far target is mounted in the neighbouring
 * slot, so the panes in between are never mounted or scrolled across.
 *
 * Only the settled pane, its two neighbours and a slide target are mounted.
 * Neighbours mount one frame after a slide lands, so the landing stays cheap.
 *
 * Children that scroll sideways keep their gesture: an ancestor that can
 * still scroll in the drag direction wins, and `.no-swipe` opts out outright.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    tabs: readonly T[]
    modelValue: T
    /** Gap between panes while sliding, in px. */
    gap?: number
    duration?: number
  }>(),
  { gap: 10, duration: 280 }
)

const emit = defineEmits<{ "update:modelValue": [value: T] }>()

defineSlots<{ default(props: { tab: T; active: boolean }): unknown }>()

const LOCK_PX = 8
const EDGE_RESISTANCE = 0.35
const DISTANCE_RATIO = 0.25
const FLICK_VELOCITY = 0.35 // px per ms
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)"

const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)

const settled = ref<T>(props.modelValue)
const target = ref<T | null>(null)
/** Which settled pane currently has its neighbours mounted. */
const neighboursFor = ref<T | null>(null)

const settledIdx = computed(() => props.tabs.indexOf(settled.value))

/** +1 when the target sits right of the settled pane, -1 when left. */
const direction = computed(() => {
  if (target.value === null) return 0
  return props.tabs.indexOf(target.value) > settledIdx.value ? 1 : -1
})

const rendered = computed(() => {
  const keys = new Set<T>([settled.value])
  if (target.value !== null) keys.add(target.value)
  if (neighboursFor.value === settled.value) {
    const i = settledIdx.value
    if (i > 0) keys.add(props.tabs[i - 1])
    if (i < props.tabs.length - 1) keys.add(props.tabs[i + 1])
  }
  return props.tabs.filter((tab) => keys.has(tab))
})

/** Slot offset in pane widths, or null when the pane should stay out of sight. */
function slotOf(tab: T): number | null {
  if (tab === settled.value) return 0
  if (target.value !== null) return tab === target.value ? direction.value : null
  return props.tabs.indexOf(tab) - settledIdx.value
}

function paneStyle(tab: T) {
  const slot = slotOf(tab)
  if (slot === null) return { visibility: "hidden" as const }
  if (slot === 0) return undefined
  return { transform: `translate3d(calc(${slot} * (100% + ${props.gap}px)), 0, 0)` }
}

// ---- track motion --------------------------------------------------------

const reducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

let endTimer: ReturnType<typeof setTimeout> | null = null
let onEnd: (() => void) | null = null
let neighbourFrame = 0

function setTrack(transform: string, ms = 0) {
  const el = track.value
  if (!el) return
  el.style.transition = ms ? `transform ${ms}ms ${EASE}` : "none"
  el.style.transform = transform
  // Own layer only while it moves — a permanent one costs memory on every page.
  el.classList.toggle("is-moving", transform !== "")
}

function slotTransform(slots: number) {
  return `translate3d(calc(${slots} * (100% + ${props.gap}px)), 0, 0)`
}

/** Moves the track, then runs `done` — on transitionend, or a timer if none comes. */
function animateTrack(transform: string, ms: number, done: () => void) {
  clearAnimation()
  if (reducedMotion || ms <= 0) {
    setTrack(transform)
    done()
    return
  }
  onEnd = done
  setTrack(transform, ms)
  endTimer = setTimeout(finishAnimation, ms + 60)
}

function finishAnimation() {
  const done = onEnd
  clearAnimation()
  done?.()
}

function clearAnimation() {
  if (endTimer) clearTimeout(endTimer)
  endTimer = null
  onEnd = null
}

function onTransitionEnd(e: TransitionEvent) {
  if (e.target === track.value && e.propertyName === "transform") finishAnimation()
}

/** The target becomes the settled pane; slots and track reset in the same frame. */
function land() {
  if (target.value !== null) settled.value = target.value
  target.value = null
  setTrack("")
  scheduleNeighbours()
}

function scheduleNeighbours() {
  cancelAnimationFrame(neighbourFrame)
  // One frame after landing, so the landing frame does not pay for two mounts.
  neighbourFrame = requestAnimationFrame(() => {
    neighbourFrame = requestAnimationFrame(() => {
      neighboursFor.value = settled.value
    })
  })
}

function mountNeighboursNow() {
  cancelAnimationFrame(neighbourFrame)
  neighboursFor.value = settled.value
}

/** Cuts a running slide short and lands on its target immediately. */
function snapToTarget() {
  if (target.value === null && !onEnd) return
  clearAnimation()
  land()
  // Resolve the reset style now, so a transition started next is measured from 0.
  if (track.value) getComputedStyle(track.value).transform
}

async function slideTo(tab: T) {
  snapToTarget()
  if (tab === settled.value) return
  target.value = tab
  // The target has to be in the DOM, sitting in its slot, before the track moves.
  await nextTick()
  requestAnimationFrame(() => {
    if (target.value !== tab) return
    animateTrack(slotTransform(-direction.value), props.duration, land)
  })
}

watch(
  () => props.modelValue,
  (tab) => {
    if (tab === settled.value && target.value === null) return
    if (tab === target.value) return
    cancelDrag()
    slideTo(tab)
  }
)

watch(
  () => props.tabs.join("|"),
  () => {
    if (
      props.tabs.includes(settled.value) &&
      (target.value === null || props.tabs.includes(target.value))
    )
      return
    clearAnimation()
    cancelDrag()
    target.value = null
    settled.value = props.tabs.includes(props.modelValue) ? props.modelValue : props.tabs[0]
    setTrack("")
    scheduleNeighbours()
  }
)

scheduleNeighbours()

// ---- touch gesture -------------------------------------------------------

type Gesture = {
  startX: number
  startY: number
  width: number
  locked: "x" | "y" | null
  origin: EventTarget | null
  dx: number
  /** Recent samples for the release velocity. */
  samples: { x: number; t: number }[]
}

let gesture: Gesture | null = null
let dragFrame = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1 || props.tabs.length < 2) {
    cancelDrag()
    return
  }
  const node = e.target as Element | null
  if (node?.closest(".no-swipe")) return
  snapToTarget()
  mountNeighboursNow()
  const t = e.touches[0]
  gesture = {
    startX: t.clientX,
    startY: t.clientY,
    width: viewport.value?.clientWidth ?? window.innerWidth,
    locked: null,
    origin: e.target,
    dx: 0,
    samples: [{ x: t.clientX, t: e.timeStamp }],
  }
}

function onTouchMove(e: TouchEvent) {
  const g = gesture
  if (!g || g.locked === "y") return
  const t = e.touches[0]
  const dx = t.clientX - g.startX
  const dy = t.clientY - g.startY

  if (g.locked === null) {
    if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return
    if (Math.abs(dy) >= Math.abs(dx) || innerScrollerTakes(g.origin, dx)) {
      gesture = null
      return
    }
    g.locked = "x"
  }

  if (e.cancelable) e.preventDefault()
  g.samples.push({ x: t.clientX, t: e.timeStamp })
  if (g.samples.length > 5) g.samples.shift()

  const atEdge =
    (dx > 0 && settledIdx.value === 0) || (dx < 0 && settledIdx.value === props.tabs.length - 1)
  g.dx = atEdge ? dx * EDGE_RESISTANCE : dx

  if (!dragFrame) {
    dragFrame = requestAnimationFrame(() => {
      dragFrame = 0
      if (gesture?.locked === "x") setTrack(`translate3d(${gesture.dx}px, 0, 0)`)
    })
  }
}

function onTouchEnd(e: TouchEvent) {
  const g = gesture
  gesture = null
  cancelAnimationFrame(dragFrame)
  dragFrame = 0
  if (!g || g.locked !== "x") return

  const first = g.samples[0]
  const last = g.samples[g.samples.length - 1]
  const dt = Math.max(1, (e.timeStamp || last.t) - first.t)
  const velocity = (last.x - first.x) / dt

  let step = 0
  if (Math.abs(g.dx) > g.width * DISTANCE_RATIO || Math.abs(velocity) > FLICK_VELOCITY) {
    step = (Math.abs(velocity) > FLICK_VELOCITY ? velocity : g.dx) < 0 ? 1 : -1
  }
  // A flick against the drag direction settles back instead of reversing.
  if (step !== 0 && Math.sign(-g.dx) !== step) step = 0

  const next = props.tabs[settledIdx.value + step]
  const width = g.width + props.gap

  if (step === 0 || next === undefined) {
    const ms = scaledDuration(Math.abs(g.dx) / width)
    animateTrack("translate3d(0, 0, 0)", ms, () => setTrack(""))
    return
  }

  target.value = next
  emit("update:modelValue", next)
  const remaining = 1 - Math.abs(g.dx) / width
  animateTrack(slotTransform(-step), scaledDuration(remaining), land)
}

function cancelDrag() {
  if (!gesture) return
  gesture = null
  cancelAnimationFrame(dragFrame)
  dragFrame = 0
  setTrack("")
}

function scaledDuration(fraction: number) {
  return Math.round(Math.min(props.duration, Math.max(140, props.duration * fraction)))
}

/** Whether a horizontal scroller under the finger can still move in this direction. */
function innerScrollerTakes(origin: EventTarget | null, dx: number) {
  let el = origin instanceof Element ? origin : null
  const stop = viewport.value
  while (el && el !== stop) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX
      if (overflowX === "auto" || overflowX === "scroll") {
        const max = el.scrollWidth - el.clientWidth
        if (dx < 0 ? el.scrollLeft < max - 1 : el.scrollLeft > 1) return true
      }
    }
    el = el.parentElement
  }
  return false
}

onBeforeUnmount(() => {
  clearAnimation()
  cancelAnimationFrame(neighbourFrame)
  cancelAnimationFrame(dragFrame)
})
</script>

<template>
  <div
    ref="viewport"
    class="swipe-view"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="cancelDrag"
  >
    <div ref="track" class="swipe-track" @transitionend="onTransitionEnd">
      <div
        v-for="tab in rendered"
        :key="tab"
        class="swipe-pane"
        :style="paneStyle(tab)"
        :aria-hidden="tab !== settled || undefined"
        :inert="tab !== settled || undefined"
      >
        <slot :tab="tab" :active="tab === modelValue" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.swipe-view {
  position: relative;
  height: 100%;
  overflow: hidden;
  touch-action: pan-y;
}

.swipe-track {
  position: absolute;
  inset: 0;
}

.swipe-track.is-moving {
  will-change: transform;
}

.swipe-pane {
  position: absolute;
  inset: 0;
  touch-action: pan-y;
  contain: layout paint;
}
</style>
