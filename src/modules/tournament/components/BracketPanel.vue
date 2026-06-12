<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import BracketDoubleSide from "./BracketDoubleSide.vue"
import BracketClassic from "./BracketClassic.vue"
import FixtureView from "./FixtureView.vue"
import { useTournamentStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import { useGradualSim } from "../composables/useGradualSim"
import { Maximize2, Minus, Plus, Shuffle, X, Download, Expand, ChevronDown } from "@lucide/vue"
import { toPng } from "html-to-image"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  title?: string
}>()

const { t } = useI18n()
const store = useTournamentStore()
const settings = useSettingsStore()
const { runSequential } = useGradualSim()

async function simRoundGradual(ri: number) {
  const round = props.tournament.rounds[ri]
  if (!round) return
  const cbs = round.matches
    .map((m, mi) => ({ m, mi }))
    .filter(({ m }) => m.homeId && m.awayId && !m.result)
    .map(
      ({ mi }) =>
        () =>
          store.simulateBracketMatch(props.tournament.id, ri, mi)
    )
  await runSequential(cbs)
}

async function simAllGradual() {
  for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
    await simRoundGradual(ri)
  }
  if (props.tournament.hasThirdPlace && props.tournament.thirdPlaceMatch) {
    const tp = props.tournament.thirdPlaceMatch
    if (tp.homeId && tp.awayId && !tp.result) {
      store.simulateThirdPlace(props.tournament.id)
    }
  }
}

const activeBracket = computed(() => {
  const style = settings.bracketStyle
  if (style === "double-sided") return BracketDoubleSide
  if (style === "classic") return BracketClassic
  const knockoutTeams = (props.tournament.rounds[0]?.matches.length ?? 0) * 2
  return knockoutTeams >= 17 ? BracketDoubleSide : BracketClassic
})

const bracketView = ref<"bracket" | "fixtures">("bracket")
const showFullBracket = ref(false)
const showSimMenu = ref(false)
const isExporting = ref(false)

// Viewport / inner refs for normal bracket
const bracketWrapperRef = ref<HTMLElement | null>(null)
const bracketInnerRef = ref<HTMLElement | null>(null)

// Viewport / inner refs for full-screen bracket
const fullWrapperRef = ref<HTMLElement | null>(null)
const fullInnerRef = ref<HTMLElement | null>(null)

// ── Normal bracket pan + zoom ─────────────────────────────────
const zoom = ref(1)
const pan = reactive({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0, px: 0, py: 0 })
const isZooming = ref(false)
let zoomTimeout: number

// ── Full-screen bracket pan + zoom ────────────────────────────
const fullZoom = ref(1)
const fullPan = reactive({ x: 0, y: 0 })
const fullIsDragging = ref(false)
const fullDragStart = ref({ x: 0, y: 0, px: 0, py: 0 })

// Pinch-to-zoom touch state
let touchDist0 = 0
let touchZoom0 = 1
let touchCtx: "normal" | "full" = "normal"

// ── Computed transforms ───────────────────────────────────────
const bracketTransform = computed(() => `translate(${pan.x}px, ${pan.y}px) scale(${zoom.value})`)
const fullTransform = computed(
  () => `translate(${fullPan.x}px, ${fullPan.y}px) scale(${fullZoom.value})`
)
const panLayerStyle = computed(() => ({
  willChange: settings.bracketQuality === "low" ? "transform" : "auto",
}))

// ── Drag handlers ─────────────────────────────────────────────
function startDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest("button, input, a")) return
  isDragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  e.preventDefault()
}

function startFullDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest("button, input, a")) return
  fullIsDragging.value = true
  fullDragStart.value = { x: e.clientX, y: e.clientY, px: fullPan.x, py: fullPan.y }
  e.preventDefault()
}

function onWindowMouseMove(e: MouseEvent) {
  if (isDragging.value) {
    pan.x = dragStart.value.px + e.clientX - dragStart.value.x
    pan.y = dragStart.value.py + e.clientY - dragStart.value.y
  }
  if (fullIsDragging.value) {
    fullPan.x = fullDragStart.value.px + e.clientX - fullDragStart.value.x
    fullPan.y = fullDragStart.value.py + e.clientY - fullDragStart.value.y
  }
}

function stopDrag() {
  isDragging.value = false
  fullIsDragging.value = false
}

// ── Touch handlers ────────────────────────────────────────────
function onTouchStart(e: TouchEvent, ctx: "normal" | "full") {
  touchCtx = ctx
  const z = ctx === "full" ? fullZoom : zoom
  const p = ctx === "full" ? fullPan : pan
  const ds = ctx === "full" ? fullDragStart : dragStart
  const dragging = ctx === "full" ? fullIsDragging : isDragging

  if (e.touches.length === 2) {
    touchDist0 = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    touchZoom0 = z.value
  } else if (e.touches.length === 1) {
    dragging.value = true
    ds.value = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: p.x, py: p.y }
  }
}

function onTouchMove(e: TouchEvent) {
  const ctx = touchCtx
  const z = ctx === "full" ? fullZoom : zoom
  const p = ctx === "full" ? fullPan : pan
  const ds = ctx === "full" ? fullDragStart : dragStart
  const dragging = ctx === "full" ? fullIsDragging : isDragging

  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    z.value = +Math.min(2.5, Math.max(0.25, touchZoom0 * (dist / touchDist0))).toFixed(2)
  } else if (dragging.value && e.touches.length === 1) {
    p.x = ds.value.px + e.touches[0].clientX - ds.value.x
    p.y = ds.value.py + e.touches[0].clientY - ds.value.y
  }
}

function onTouchEnd() {
  isDragging.value = false
  fullIsDragging.value = false
}

// ── Wheel zoom (mouse scroll + touchpad pinch) ────────────────
function onWheel(e: WheelEvent, ctx: "normal" | "full") {
  e.preventDefault()
  const wrapper = ctx === "full" ? fullWrapperRef.value : bracketWrapperRef.value
  if (!wrapper) return

  isZooming.value = true
  clearTimeout(zoomTimeout)
  zoomTimeout = window.setTimeout(() => {
    isZooming.value = false
  }, 150)

  const z = ctx === "full" ? fullZoom : zoom
  const p = ctx === "full" ? fullPan : pan

  const rect = wrapper.getBoundingClientRect()
  // Cursor position relative to wrapper center (where transform-origin is)
  const cx = e.clientX - rect.left - rect.width / 2
  const cy = e.clientY - rect.top - rect.height / 2

  // Normalize delta: deltaMode 1 = lines, 0 = pixels
  const rawDelta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
  const factor = Math.exp(-rawDelta * 0.0015)
  const newZoom = +Math.min(2.5, Math.max(0.25, z.value * factor)).toFixed(3)
  const ratio = newZoom / z.value

  // Shift pan so the content point under cursor stays fixed
  p.x = cx - (cx - p.x) * ratio
  p.y = cy - (cy - p.y) * ratio
  z.value = newZoom
}

// ── Zoom buttons ──────────────────────────────────────────────
function zoomIn() {
  zoom.value = Math.min(2.5, +(zoom.value + 0.1).toFixed(1))
}
function zoomOut() {
  zoom.value = Math.max(0.25, +(zoom.value - 0.1).toFixed(1))
}
function fullZoomIn() {
  fullZoom.value = Math.min(2.5, +(fullZoom.value + 0.1).toFixed(1))
}
function fullZoomOut() {
  fullZoom.value = Math.max(0.25, +(fullZoom.value - 0.1).toFixed(1))
}

// ── Fit to screen ─────────────────────────────────────────────
function fitScreen() {
  const wrapper = bracketWrapperRef.value
  const inner = bracketInnerRef.value
  if (!wrapper || !inner) return
  const wW = wrapper.clientWidth
  const wH = wrapper.clientHeight
  const iW = inner.scrollWidth
  const iH = inner.scrollHeight
  if (iW && iH) {
    zoom.value = +Math.min(1, Math.max(0.25, Math.min(wW / iW, wH / iH) * 0.9)).toFixed(2)
  }
  pan.x = 0
  pan.y = 0
}

function fullFitScreen() {
  const wrapper = fullWrapperRef.value
  const inner = fullInnerRef.value
  if (!wrapper || !inner) return
  const wW = wrapper.clientWidth
  const wH = wrapper.clientHeight
  const iW = inner.scrollWidth
  const iH = inner.scrollHeight
  if (iW && iH) {
    fullZoom.value = +Math.min(1.5, Math.max(0.25, Math.min(wW / iW, wH / iH) * 0.9)).toFixed(2)
  }
  fullPan.x = 0
  fullPan.y = 0
}

// ── Export ────────────────────────────────────────────────────
async function exportPng() {
  const inner = bracketInnerRef.value
  if (!inner || isExporting.value) return
  isExporting.value = true
  const prevZoom = zoom.value
  const prevPan = { x: pan.x, y: pan.y }
  zoom.value = 1
  pan.x = 0
  pan.y = 0
  await nextTick()
  try {
    const el = (inner.querySelector(".bracket") as HTMLElement) ?? inner
    const dataUrl = await toPng(el, { pixelRatio: 2 })
    const link = document.createElement("a")
    link.download = `${props.tournament.name}-S${props.tournament.season}.png`
    link.href = dataUrl
    link.click()
  } finally {
    zoom.value = prevZoom
    pan.x = prevPan.x
    pan.y = prevPan.y
    isExporting.value = false
  }
}

// ── Match actions ─────────────────────────────────────────────
function setResult(ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) {
  store.setResult(props.tournament.id, ri, mi, h, a, ph, pa)
}
function setLeg2Result(ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) {
  store.setLeg2Result(props.tournament.id, ri, mi, h, a, ph, pa)
}
function simMatch(ri: number, mi: number) {
  store.simulateBracketMatch(props.tournament.id, ri, mi)
}
function simLeg1(ri: number, mi: number) {
  store.simulateLeg1(props.tournament.id, ri, mi)
}
function simLeg2(ri: number, mi: number) {
  store.simulateLeg2(props.tournament.id, ri, mi)
}
function setThirdPlaceResult(h: number, a: number, ph?: number, pa?: number) {
  store.setThirdPlaceResult(props.tournament.id, h, a, ph, pa)
}
function simThirdPlace() {
  store.simulateThirdPlace(props.tournament.id)
}

// ── Modal ─────────────────────────────────────────────────────
function onEscKey(e: KeyboardEvent) {
  if (e.key === "Escape") closeFullBracket()
}

function openFullBracket() {
  showFullBracket.value = true
  fullZoom.value = 1
  fullPan.x = 0
  fullPan.y = 0
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onEscKey)
  nextTick(() => fullFitScreen())
}

function closeFullBracket() {
  showFullBracket.value = false
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onEscKey)
}

onMounted(() => {
  window.addEventListener("mousemove", onWindowMouseMove)
  window.addEventListener("mouseup", stopDrag)
})

onUnmounted(() => {
  window.removeEventListener("mousemove", onWindowMouseMove)
  window.removeEventListener("mouseup", stopDrag)
  document.removeEventListener("keydown", onEscKey)
  document.body.style.overflow = ""
})
</script>

<template>
  <div class="section-box">
    <h2 class="bracket-heading">
      {{ title ?? "Bracket" }}
      <div class="bracket-heading-right">
        <button
          v-if="bracketView === 'bracket'"
          class="btn-xs export-btn"
          :disabled="isExporting"
          @click="exportPng"
        >
          <Download :size="13" />
          <span class="btn-label">{{ isExporting ? "Exporting…" : "Export PNG" }}</span>
        </button>
        <div v-if="bracketView === 'bracket'" class="zoom-controls">
          <button class="btn-xs icon-only" :disabled="zoom <= 0.25" @click="zoomOut">
            <Minus :size="13" />
          </button>
          <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
          <button class="btn-xs icon-only" :disabled="zoom >= 2.5" @click="zoomIn">
            <Plus :size="13" />
          </button>
          <button class="btn-xs icon-only fit-btn" title="Fit to screen" @click="fitScreen">
            <Expand :size="13" />
          </button>
        </div>
        <div class="view-toggle">
          <button
            class="view-toggle-btn"
            :class="{ active: bracketView === 'bracket' }"
            @click="bracketView = 'bracket'"
          >
            Bracket
          </button>
          <button
            class="view-toggle-btn"
            :class="{ active: bracketView === 'fixtures' }"
            @click="bracketView = 'fixtures'"
          >
            Fixtures
          </button>
        </div>
        <button class="btn-xs" @click="openFullBracket">
          <Maximize2 :size="13" />
          <span class="btn-label">Full View</span>
        </button>
      </div>
    </h2>
    <div class="section-body bracket-body">
      <div class="flex sim-toolbar">
        <!-- Mobile: single dropdown trigger -->
        <div class="sim-dropdown">
          <button class="sim-dropdown-trigger" @click="showSimMenu = !showSimMenu">
            <Shuffle :size="14" />
            Simulate
            <ChevronDown :size="12" class="sim-chevron" :class="{ open: showSimMenu }" />
          </button>
          <div v-if="showSimMenu" class="sim-dropdown-panel">
            <button
              @click="
                simAllGradual()
                showSimMenu = false
              "
            >
              Simulate All
            </button>
            <button
              v-for="(round, ri) in tournament.rounds"
              :key="ri"
              @click="
                simRoundGradual(ri)
                showSimMenu = false
              "
            >
              Sim {{ round.name }}
            </button>
            <button
              v-if="tournament.hasThirdPlace && tournament.thirdPlaceMatch"
              :disabled="
                !tournament.thirdPlaceMatch.homeId ||
                !tournament.thirdPlaceMatch.awayId ||
                !!tournament.thirdPlaceMatch.result
              "
              @click="
                simThirdPlace()
                showSimMenu = false
              "
            >
              Sim 3rd Place
            </button>
          </div>
        </div>

        <!-- Desktop: inline buttons -->
        <button class="sim-inline" @click="simAllGradual">
          <Shuffle :size="14" />
          Simulate All
        </button>
        <button
          v-for="(round, ri) in tournament.rounds"
          :key="ri"
          class="sim-inline"
          @click="simRoundGradual(ri)"
        >
          Sim {{ round.name }}
        </button>
        <button
          v-if="tournament.hasThirdPlace && tournament.thirdPlaceMatch"
          class="sim-inline"
          :disabled="
            !tournament.thirdPlaceMatch.homeId ||
            !tournament.thirdPlaceMatch.awayId ||
            !!tournament.thirdPlaceMatch.result
          "
          @click="simThirdPlace"
        >
          Sim 3rd Place
        </button>
      </div>

      <!-- Bracket viewport: overflow hidden, drag-to-pan -->
      <div
        v-if="bracketView === 'bracket'"
        ref="bracketWrapperRef"
        class="bracket-wrapper"
        :class="{ dragging: isDragging }"
        @mousedown="startDrag"
        @wheel.prevent="onWheel($event, 'normal')"
        @touchstart.passive="onTouchStart($event, 'normal')"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          ref="bracketInnerRef"
          :class="['bracket-pan-layer', { zooming: isZooming }]"
          :style="{ transform: bracketTransform, ...panLayerStyle }"
        >
          <component
            :is="activeBracket"
            :tournament="tournament"
            :teams="teams"
            :is-exporting="isExporting"
            @set-result="setResult"
            @set-leg2-result="setLeg2Result"
            @sim-match="simMatch"
            @sim-leg1="simLeg1"
            @sim-leg2="simLeg2"
            @set-third-place-result="setThirdPlaceResult"
            @sim-third-place="simThirdPlace"
          />
        </div>
      </div>

      <FixtureView
        v-else
        class="fixture-wrapper"
        :tournament="tournament"
        :teams="teams"
        @set-result="setResult"
        @set-leg2-result="setLeg2Result"
        @sim-match="simMatch"
        @sim-leg1="simLeg1"
        @sim-leg2="simLeg2"
        @set-third-place-result="setThirdPlaceResult"
        @sim-third-place="simThirdPlace"
      />
    </div>
  </div>

  <!-- Mobile: sticky bottom view switcher -->
  <div class="bracket-mobile-tabs">
    <button
      class="bracket-mobile-tab"
      :class="{ active: bracketView === 'bracket' }"
      @click="bracketView = 'bracket'"
    >
      {{ t("tournament.tabs.bracket") }}
    </button>
    <button
      class="bracket-mobile-tab"
      :class="{ active: bracketView === 'fixtures' }"
      @click="bracketView = 'fixtures'"
    >
      {{ t("tournament.tabs.fixtures") }}
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="showFullBracket"
      class="modal-backdrop full-bracket-backdrop"
      @click.self="closeFullBracket"
    >
      <div class="full-bracket-modal">
        <div class="full-bracket-header">
          <span>{{ tournament.name }} — Knockout</span>
          <div class="full-bracket-header-right">
            <div class="zoom-controls">
              <button class="btn-xs icon-only" :disabled="fullZoom <= 0.25" @click="fullZoomOut">
                <Minus :size="13" />
              </button>
              <span class="zoom-label">{{ Math.round(fullZoom * 100) }}%</span>
              <button class="btn-xs icon-only" :disabled="fullZoom >= 2.5" @click="fullZoomIn">
                <Plus :size="13" />
              </button>
              <button class="btn-xs icon-only fit-btn" title="Fit to screen" @click="fullFitScreen">
                <Expand :size="13" />
              </button>
            </div>
            <button class="btn-xs" @click="closeFullBracket">
              <X :size="13" />
              Close
            </button>
          </div>
        </div>
        <div
          ref="fullWrapperRef"
          class="full-bracket-body"
          :class="{ dragging: fullIsDragging }"
          @mousedown="startFullDrag"
          @wheel.prevent="onWheel($event, 'full')"
          @touchstart.passive="onTouchStart($event, 'full')"
          @touchmove.prevent="onTouchMove"
          @touchend="onTouchEnd"
        >
          <div
            ref="fullInnerRef"
            :class="['bracket-pan-layer', { zooming: isZooming }]"
            :style="{ transform: fullTransform }"
          >
            <component
              :is="activeBracket"
              :tournament="tournament"
              :teams="teams"
              @set-result="setResult"
              @set-leg2-result="setLeg2Result"
              @sim-match="simMatch"
              @sim-leg1="simLeg1"
              @sim-leg2="simLeg2"
              @set-third-place-result="setThirdPlaceResult"
              @sim-third-place="simThirdPlace"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.bracket-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bracket-heading-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bracket-body {
  padding: 6px 0;
}

.sim-toolbar {
  padding: 0 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.sim-dropdown {
  display: none;
  position: relative;
}

.sim-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sim-chevron {
  transition: transform 0.15s;
  &.open {
    transform: rotate(180deg);
  }
}

.sim-dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 200;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 150px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);

  button {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    font-size: 13px;
    padding: 5px 10px;
    background: var(--bg);
    &:hover {
      background: color-mix(in srgb, var(--accent) 12%, var(--bg));
    }
  }
}

/* ── Pan / zoom viewport ── */
.bracket-wrapper {
  height: clamp(360px, 68vh, 780px);
  min-height: 280px;
  overflow: hidden;
  position: relative;
  cursor: grab;
  user-select: none;
}

.bracket-wrapper.dragging {
  cursor: grabbing;
}

.full-bracket-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
  user-select: none;
}

.full-bracket-body.dragging {
  cursor: grabbing;
}

/* The transformed layer — centered so scale grows outward from center */
.bracket-pan-layer {
  display: inline-block;
  transform-origin: 50% 50%;
  /* No will-change: transform — avoids premature rasterization that blurs on zoom */
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
}

.bracket-pan-layer.zooming {
  transition: transform 0.15s ease-out;
}

.fixture-wrapper {
  padding: 0 8px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom-label {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-ui);
  width: 32px;
  text-align: center;
}

.btn-xs.icon-only {
  padding: 3px 5px;
}

.fit-btn {
  margin-left: 2px;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.view-toggle-btn {
  padding: 3px 10px;
  font-size: 12px;
  font-family: var(--font-ui);
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  color: var(--text-muted);
  transition:
    background 0.1s,
    color 0.1s;
}

.view-toggle-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}

.view-toggle-btn:hover:not(.active) {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  color: var(--text);
}

.view-toggle-btn.active {
  background: var(--accent);
  color: #fff;
}

/* Full bracket modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.full-bracket-backdrop {
  z-index: 300;
}

.full-bracket-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
}

.full-bracket-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.full-bracket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  padding-top: calc(10px + env(safe-area-inset-top));
  border-bottom: 1px solid var(--border-light);
  background: var(--bg);
  font-family: var(--font);
  font-size: 15px;
  flex-shrink: 0;
}

/* ── Mobile bracket bottom tabs ── */
.bracket-mobile-tabs {
  display: none;
}

@media (max-width: 640px) {
  .bracket-mobile-tabs {
    display: flex;
    position: fixed;
    bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    z-index: 90;
    background: var(--surface);
    border-top: 1px solid var(--border-light);
    height: 44px;
  }

  .bracket-mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 500;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--text-muted);
    transition:
      color 0.12s,
      background 0.12s;
    border-top: 2px solid transparent;
    margin-top: -1px;
  }

  .bracket-mobile-tab.active {
    color: var(--accent);
    border-top-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }

  /* Hide desktop controls */
  .view-toggle {
    display: none;
  }
  .zoom-controls {
    display: none;
  }
  .export-btn {
    display: none;
  }
  .btn-label {
    display: none;
  }

  .bracket-body {
    padding-bottom: calc(52px + env(safe-area-inset-bottom));
  }

  .bracket-wrapper {
    height: clamp(300px, 60vh, 600px);
  }

  .full-bracket-modal {
    width: 100vw;
    height: 100dvh;
  }

  .sim-toolbar {
    gap: 5px;
    padding: 0 4px;

    .sim-inline {
      display: none;
    }

    .sim-dropdown {
      display: block;

      .sim-dropdown-trigger {
        padding: 4px 8px;
        font-size: 12px;
      }
    }
  }
}
</style>
