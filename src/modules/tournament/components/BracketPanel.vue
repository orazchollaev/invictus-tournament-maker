<script setup lang="ts">
import { ref, onUnmounted } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import Bracket from "./Bracket.vue"
import FixtureView from "./FixtureView.vue"
import { useTournamentStore } from "../store"
import { Maximize2, Shuffle, X } from "lucide-vue-next"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  title?: string
}>()

const store = useTournamentStore()
const bracketView = ref<"bracket" | "fixtures">("bracket")
const showFullBracket = ref(false)

function setResult(ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) {
  store.setResult(props.tournament.id, ri, mi, h, a, ph, pa)
}

function simMatch(ri: number, mi: number) {
  store.simulateBracketMatch(props.tournament.id, ri, mi)
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
          Full View
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
      </div>
      <Bracket
        v-if="bracketView === 'bracket'"
        class="bracket-wrapper"
        :tournament="tournament"
        :teams="teams"
        @set-result="setResult"
        @sim-match="simMatch"
        @set-third-place-result="setThirdPlaceResult"
        @sim-third-place="simThirdPlace"
      />
      <FixtureView
        v-else
        class="fixture-wrapper"
        :tournament="tournament"
        :teams="teams"
        @set-result="setResult"
        @sim-match="simMatch"
        @set-third-place-result="setThirdPlaceResult"
        @sim-third-place="simThirdPlace"
      />
    </div>
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
          <button class="btn-xs" @click="closeFullBracket">
            <X :size="13" />
            Close
          </button>
        </div>
        <div class="full-bracket-body">
          <Bracket
            :tournament="tournament"
            :teams="teams"
            @set-result="setResult"
            @sim-match="simMatch"
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
  max-height: 600px;
  padding: 0 10px;
  overflow: auto;
}

.fixture-wrapper {
  padding: 0 8px;
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
  width: 96vw;
  height: 92vh;
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

@media (max-width: 600px) {
  .full-bracket-modal {
    width: 100vw;
    height: 100dvh;
  }
}
</style>
