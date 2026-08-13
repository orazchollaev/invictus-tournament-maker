<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { FixtureMatchCard, FixtureTieCard, type FlatMatch } from "./fixture"

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [
    round: number,
    match: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "set-leg2-result": [
    round: number,
    match: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "sim-match": [round: number, match: number]
  "sim-leg1": [round: number, match: number]
  "sim-leg2": [round: number, match: number]
  "set-third-place-result": [home: number, away: number, penHome?: number, penAway?: number]
  "set-third-place-leg2-result": [
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "clear-result": [round: number, match: number]
  "clear-leg2-result": [round: number, match: number]
  "clear-third-place-result": []
  "clear-third-place-leg2-result": []
  "sim-third-place": []
  "sim-third-place-leg1": []
  "sim-third-place-leg2": []
}>()

const roundOptions = computed(() => {
  const opts: { label: string; value: number | "tp" }[] = props.tournament.rounds.map((r, i) => ({
    label: r.name,
    value: i,
  }))
  if (props.tournament.hasThirdPlace && props.tournament.thirdPlaceMatch) {
    opts.push({ label: "3rd Place", value: "tp" })
  }
  return opts
})

const selectedRound = ref<number | "tp">(roundOptions.value[0]?.value ?? 0)

const filteredMatches = computed((): FlatMatch[] => {
  if (selectedRound.value === "tp") {
    const tp = props.tournament.thirdPlaceMatch
    if (!tp) return []
    return [{ ...tp, _origRound: -1, _origMatch: -1, _isThirdPlace: true }]
  }
  const ri = selectedRound.value as number
  return (props.tournament.rounds[ri]?.matches ?? []).map((m, mi) => ({
    ...m,
    _origRound: ri,
    _origMatch: mi,
  }))
})

const isSoloLayout = computed(() => {
  const lastRoundIdx = props.tournament.rounds.length - 1
  return selectedRound.value === lastRoundIdx || selectedRound.value === "tp"
})

/** The cards own the entry UI; this only maps a card event onto coordinates. */
function onSetResult(
  match: FlatMatch,
  home: number,
  away: number,
  penHome?: number,
  penAway?: number
) {
  if (match._isThirdPlace) {
    emit("set-third-place-result", home, away, penHome, penAway)
  } else {
    emit("set-result", match._origRound, match._origMatch, home, away, penHome, penAway)
  }
}

function onClearResult(match: FlatMatch) {
  if (match._isThirdPlace) emit("clear-third-place-result")
  else emit("clear-result", match._origRound, match._origMatch)
}

function onSetTieResult(
  match: FlatMatch,
  leg: 1 | 2,
  home: number,
  away: number,
  penHome?: number,
  penAway?: number
) {
  if (leg === 2) {
    if (match._isThirdPlace) emit("set-third-place-leg2-result", home, away, penHome, penAway)
    else emit("set-leg2-result", match._origRound, match._origMatch, home, away, penHome, penAway)
  } else {
    onSetResult(match, home, away, penHome, penAway)
  }
}

function onClearTieResult(match: FlatMatch, leg: 1 | 2) {
  if (leg === 2) {
    if (match._isThirdPlace) emit("clear-third-place-leg2-result")
    else emit("clear-leg2-result", match._origRound, match._origMatch)
  } else {
    onClearResult(match)
  }
}

function simMatch(match: FlatMatch) {
  if (match._isThirdPlace) {
    emit("sim-third-place")
  } else {
    emit("sim-match", match._origRound, match._origMatch)
  }
}

function simTieLeg(match: FlatMatch, leg: 1 | 2) {
  if (match._isThirdPlace) {
    if (leg === 1) emit("sim-third-place-leg1")
    else emit("sim-third-place-leg2")
  } else {
    if (leg === 1) emit("sim-leg1", match._origRound, match._origMatch)
    else emit("sim-leg2", match._origRound, match._origMatch)
  }
}
</script>

<template>
  <div class="fv">
    <!-- Round tabs -->
    <div class="fv-tabs">
      <button
        v-for="opt in roundOptions"
        :key="String(opt.value)"
        class="fv-tab"
        :class="{ active: selectedRound === opt.value, 'tp-tab': opt.value === 'tp' }"
        @click="selectedRound = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Match grid -->
    <div class="fv-grid" :class="{ solo: isSoloLayout }">
      <template v-for="match in filteredMatches" :key="match.id">
        <FixtureTieCard
          v-if="match.leg2Result !== undefined"
          :match="match"
          :teams="teams"
          @set-result="onSetTieResult"
          @clear-result="onClearTieResult"
          @sim-leg1="(m) => simTieLeg(m, 1)"
          @sim-leg2="(m) => simTieLeg(m, 2)"
        />
        <FixtureMatchCard
          v-else
          :match="match"
          :teams="teams"
          @set-result="onSetResult"
          @clear-result="onClearResult"
          @sim="simMatch"
        />
      </template>

      <div v-if="filteredMatches.length === 0" class="fv-empty">No matches yet.</div>
    </div>
  </div>
</template>

<style scoped>
.fv {
  width: 100%;
}

.fv-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding: 0 0 8px 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 12px;
}

.fv-tab {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 99px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.03em;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
}
.fv-tab:hover:not(.active) {
  background: var(--bg);
  color: var(--text);
  border-color: var(--border);
}
.fv-tab.active {
  background: var(--accent);
  color: var(--on-accent);
  border-color: var(--accent);
}
.fv-tab.tp-tab.active {
  background: var(--accent-2);
  border-color: var(--accent-2);
}

.fv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 0 8px 0;
}
.fv-grid.solo {
  grid-template-columns: 1fr;
  max-width: 440px;
  margin: 0 auto;
}

.fv-empty {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  padding: 24px 0;
}
</style>
