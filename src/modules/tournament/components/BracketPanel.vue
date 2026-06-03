<script setup lang="ts">
import { ref, computed, onUnmounted, nextTick } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import Bracket from "./Bracket.vue"
import BracketOld from "./BracketOld.vue"
import FixtureView from "./FixtureView.vue"
import { useTournamentStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import { Maximize2, Minus, Plus, Shuffle, X, Download } from "@lucide/vue"
import { toPng } from "html-to-image"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  title?: string
}>()

const store = useTournamentStore()
const settings = useSettingsStore()

const activeBracket = computed(() => {
  const style = settings.bracketStyle
  if (style === "double-sided") return Bracket
  if (style === "classic") return BracketOld
  const knockoutTeams = (props.tournament.rounds[0]?.matches.length ?? 0) * 2
  return knockoutTeams >= 17 ? Bracket : BracketOld
})

const bracketView = ref<"bracket" | "fixtures">("bracket")
const showFullBracket = ref(false)
const zoom = ref(1)
const fullZoom = ref(1)
const bracketWrapperRef = ref<HTMLElement | null>(null)
const isExporting = ref(false)

async function exportPng() {
  const wrapper = bracketWrapperRef.value
  if (!wrapper || isExporting.value) return
  isExporting.value = true
  const prevZoom = zoom.value
  zoom.value = 1
  await nextTick()
  try {
    const el = (wrapper.querySelector(".bracket") as HTMLElement) ?? wrapper
    const dataUrl = await toPng(el, { pixelRatio: 2 })
    const link = document.createElement("a")
    link.download = `${props.tournament.name}-S${props.tournament.season}.png`
    link.href = dataUrl
    link.click()
  } finally {
    zoom.value = prevZoom
    isExporting.value = false
  }
}

function zoomIn() {
  zoom.value = Math.min(2, +(zoom.value + 0.1).toFixed(1))
}
function zoomOut() {
  zoom.value = Math.max(0.5, +(zoom.value - 0.1).toFixed(1))
}
function fullZoomIn() {
  fullZoom.value = Math.min(2, +(fullZoom.value + 0.1).toFixed(1))
}
function fullZoomOut() {
  fullZoom.value = Math.max(0.5, +(fullZoom.value - 0.1).toFixed(1))
}

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

function onEscKey(e: KeyboardEvent) {
  if (e.key === "Escape") closeFullBracket()
}

function openFullBracket() {
  showFullBracket.value = true
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onEscKey)
}

function closeFullBracket() {
  showFullBracket.value = false
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onEscKey)
}

onUnmounted(() => {
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
          <button class="btn-xs icon-only" :disabled="zoom <= 0.5" @click="zoomOut">
            <Minus :size="13" />
          </button>
          <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
          <button class="btn-xs icon-only" :disabled="zoom >= 2" @click="zoomIn">
            <Plus :size="13" />
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
        <button @click="store.simulateAll(tournament.id)">
          <Shuffle :size="14" />
          Simulate All
        </button>
        <button
          v-for="(round, ri) in tournament.rounds"
          :key="ri"
          @click="store.simulateRound(tournament.id, ri)"
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
          @click="simThirdPlace"
        >
          Sim 3rd Place
        </button>
      </div>
      <div v-if="bracketView === 'bracket'" ref="bracketWrapperRef" class="bracket-wrapper">
        <component
          :is="activeBracket"
          :style="{ zoom }"
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

  <!-- Mobile: sticky bottom view switcher (above main bottom nav) -->
  <div class="bracket-mobile-tabs">
    <button
      class="bracket-mobile-tab"
      :class="{ active: bracketView === 'bracket' }"
      @click="bracketView = 'bracket'"
    >
      Bracket
    </button>
    <button
      class="bracket-mobile-tab"
      :class="{ active: bracketView === 'fixtures' }"
      @click="bracketView = 'fixtures'"
    >
      Fixtures
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
              <button class="btn-xs icon-only" :disabled="fullZoom <= 0.5" @click="fullZoomOut">
                <Minus :size="13" />
              </button>
              <span class="zoom-label">{{ Math.round(fullZoom * 100) }}%</span>
              <button class="btn-xs icon-only" :disabled="fullZoom >= 2" @click="fullZoomIn">
                <Plus :size="13" />
              </button>
            </div>
            <button class="btn-xs" @click="closeFullBracket">
              <X :size="13" />
              Close
            </button>
          </div>
        </div>
        <div class="full-bracket-body">
          <component
            :is="activeBracket"
            :style="{ zoom: fullZoom }"
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

.bracket-wrapper {
  max-height: clamp(400px, 70vh, 800px);
  min-height: 300px;
  padding: 0 10px;
  overflow: auto;
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
  border-bottom: 1px solid var(--border-light);
  background: var(--bg);
  font-family: var(--font);
  font-size: 15px;
  flex-shrink: 0;
}

.full-bracket-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

/* ── Mobile bracket bottom tabs ── */
.bracket-mobile-tabs {
  display: none;
}

@media (max-width: 640px) {
  .bracket-mobile-tabs {
    display: flex;
    position: fixed;
    bottom: 56px; /* above main bottom nav */
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

  /* Hide desktop toggle & extra controls */
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

  /* Extra padding so content isn't hidden behind the bracket tab bar */
  .bracket-body {
    padding-bottom: 52px;
  }

  .full-bracket-modal {
    width: 100vw;
    height: 100dvh;
  }

  .sim-toolbar {
    gap: 5px;
    padding: 0 4px;

    button {
      padding: 4px 8px;
      font-size: 12px;
    }
  }
}
</style>
