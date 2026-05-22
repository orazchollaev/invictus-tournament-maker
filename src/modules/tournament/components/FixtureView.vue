<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, Match } from "../types"
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { X, Shuffle } from "lucide-vue-next"

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
  "sim-match": [round: number, match: number]
  "set-third-place-result": [home: number, away: number, penHome?: number, penAway?: number]
  "sim-third-place": []
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

const editingMatch = ref<string | null>(null)
const editMode = ref<"score" | "penalty">("score")
const editHome = ref(0)
const editAway = ref(0)
const editPenHome = ref(0)
const editPenAway = ref(0)

interface FlatMatch extends Match {
  _origRound: number
  _origMatch: number
  _isThirdPlace?: boolean
}

function startEdit(match: FlatMatch) {
  editingMatch.value = match.id
  editMode.value = "score"
  editHome.value = match.result?.home ?? 0
  editAway.value = match.result?.away ?? 0
  editPenHome.value = match.result?.penHome ?? 0
  editPenAway.value = match.result?.penAway ?? 0
}
function cancelEdit() {
  editingMatch.value = null
  editMode.value = "score"
}
function saveResult(match: FlatMatch) {
  if (editHome.value === editAway.value) {
    editMode.value = "penalty"
    editPenHome.value = match.result?.penHome ?? 0
    editPenAway.value = match.result?.penAway ?? 0
    return
  }
  if (match._isThirdPlace) {
    emit("set-third-place-result", editHome.value, editAway.value)
  } else {
    emit("set-result", match._origRound, match._origMatch, editHome.value, editAway.value)
  }
  cancelEdit()
}
function savePenalties(match: FlatMatch) {
  if (editPenHome.value === editPenAway.value) return
  if (match._isThirdPlace) {
    emit(
      "set-third-place-result",
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
  } else {
    emit(
      "set-result",
      match._origRound,
      match._origMatch,
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
  }
  cancelEdit()
}

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

function isWinner(match: Match, teamId: string | null) {
  if (!match.result || !teamId) return false
  return getWinnerId(match) === teamId
}

function simMatch(match: FlatMatch) {
  if (match._isThirdPlace) emit("sim-third-place")
  else emit("sim-match", match._origRound, match._origMatch)
}

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

const isSoloLayout = computed(() => {
  const lastRoundIdx = props.tournament.rounds.length - 1
  return selectedRound.value === lastRoundIdx || selectedRound.value === "tp"
})

function scoreLabel(match: FlatMatch): string {
  if (!match.result) return "/"
  const pen =
    match.result.penHome !== undefined ? ` (${match.result.penHome}–${match.result.penAway})` : ""
  return `${match.result.home} – ${match.result.away}${pen}`
}

function scoreAccentColor(match: FlatMatch): string {
  if (!match.result) return ""
  const { home, away } = match.result
  if (home > away) return getTeam(match.homeId)?.color ?? ""
  if (away > home) return getTeam(match.awayId)?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="fixture-view">
    <!-- Round tabs -->
    <div class="round-tabs">
      <button
        v-for="opt in roundOptions"
        :key="String(opt.value)"
        class="round-tab"
        :class="{ active: selectedRound === opt.value, 'tp-tab': opt.value === 'tp' }"
        @click="selectedRound = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Match list -->
    <div class="fixture-list">
      <div
        v-for="match in filteredMatches"
        :key="match.id"
        class="fx-match"
        :class="{ editing: editingMatch === match.id, solo: isSoloLayout }"
      >
        <!-- Home team -->
        <span
          class="fx-team fx-team--home"
          :class="{
            winner: isWinner(match, match.homeId),
            loser: match.result && !isWinner(match, match.homeId),
          }"
        >
          <span class="fx-name">{{ getTeam(match.homeId)?.name ?? "TBD" }}</span>
          <span class="dot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
        </span>

        <!-- Score / edit zone -->
        <div class="fx-center">
          <template v-if="editingMatch === match.id && editMode === 'penalty'">
            <span class="pen-label">Pen</span>
            <input v-model.number="editPenHome" type="number" min="0" class="score-input" />
            <span class="dash">–</span>
            <input v-model.number="editPenAway" type="number" min="0" class="score-input" />
            <button
              class="primary btn-xs"
              :disabled="editPenHome === editPenAway"
              @click="savePenalties(match)"
            >
              OK
            </button>
            <button class="btn-xs" @click="cancelEdit"><X :size="11" /></button>
          </template>
          <template v-else-if="editingMatch === match.id">
            <input v-model.number="editHome" type="number" min="0" class="score-input" />
            <span class="dash">–</span>
            <input v-model.number="editAway" type="number" min="0" class="score-input" />
            <button class="primary btn-xs" @click="saveResult(match)">OK</button>
            <button class="btn-xs" @click="cancelEdit"><X :size="11" /></button>
          </template>
          <template v-else>
            <button
              class="fx-score-btn"
              :style="
                match.result ? { borderColor: scoreAccentColor(match), borderLeftWidth: '3px' } : {}
              "
              :disabled="!match.homeId || !match.awayId"
              @click="match.homeId && match.awayId ? startEdit(match) : undefined"
            >
              {{ scoreLabel(match) }}
            </button>
            <button
              v-if="match.homeId && match.awayId"
              class="btn-xs sim-btn"
              title="Random result"
              @click="simMatch(match)"
            >
              <Shuffle :size="12" />
            </button>
          </template>
        </div>

        <!-- Away team -->
        <span
          class="fx-team fx-team--away"
          :class="{
            winner: isWinner(match, match.awayId),
            loser: match.result && !isWinner(match, match.awayId),
          }"
        >
          <span class="dot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
          <span class="fx-name">{{ getTeam(match.awayId)?.name ?? "TBD" }}</span>
        </span>
      </div>

      <div v-if="filteredMatches.length === 0" class="empty-state">No matches yet.</div>
    </div>
  </div>
</template>

<style scoped>
.fixture-view {
  width: 100%;
}

/* ── Round tabs ── */
.round-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding: 0 8px 8px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}
.round-tab {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 3px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition:
    background 0.1s,
    color 0.1s,
    border-color 0.1s;
}
.round-tab:hover:not(.active) {
  background: var(--bg);
  color: var(--text);
  border-color: var(--border);
}
.round-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.round-tab.tp-tab.active {
  background: var(--accent-2);
  border-color: var(--accent-2);
}

/* ── Match rows ── */
.fixture-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 12px;
  padding: 0 8px 6px;
}

@media (max-width: 560px) {
  .fixture-list {
    grid-template-columns: 1fr;
  }
  .fx-match.solo {
    width: 100%;
    grid-column: auto;
  }
}

.empty-state {
  grid-column: 1 / -1;
}

.fx-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 0;
}
.fx-match.solo {
  grid-column: 1 / -1;
  width: 50%;
  justify-self: center;
}

/* ── Team cells ── */
.fx-team {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.fx-team--home {
  justify-content: flex-end;
}
.fx-team--away {
  justify-content: flex-start;
}
.fx-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.fx-team--home .fx-name {
  text-align: right;
}
.fx-team.winner .fx-name {
  font-weight: 700;
}
.fx-team.loser {
  opacity: 0.45;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.12);
}

/* ── Center zone (score + sim, or edit inputs) ── */
.fx-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex-shrink: 0;
}

/* ── Score button ── */
.fx-score-btn {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  justify-content: center;
  padding: 2px 6px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.1s;
}
.fx-score-btn:hover:not(:disabled) {
  background: var(--border-light);
}
.fx-score-btn:disabled {
  cursor: default;
  opacity: 0.5;
}

/* ── Sim button ── */
.sim-btn {
  flex-shrink: 0;
  opacity: 0.5;
  padding: 2px 4px;
}
.sim-btn:hover {
  opacity: 1;
  color: var(--accent);
}
.score-input {
  width: 30px;
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 2px 3px;
  font-size: 13px;
  font-weight: 700;
  color: inherit;
  -moz-appearance: textfield;
  appearance: textfield;
}
.score-input:focus {
  outline: none;
  border-color: var(--accent);
}
.score-input::-webkit-outer-spin-button,
.score-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.dash {
  color: var(--text-muted);
  font-size: 12px;
}
.pen-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-state {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
}
</style>
