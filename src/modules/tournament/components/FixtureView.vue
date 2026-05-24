<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, Match, MatchResult } from "../types"
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

// editKey: "{matchId}_leg{1|2}" for double-leg, "{matchId}" for single-leg/third-place
const editingKey = ref<string | null>(null)
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

function getEditKey(match: FlatMatch, leg: 1 | 2 = 1): string {
  return match.leg2Result !== undefined ? `${match.id}_leg${leg}` : match.id
}

function startEdit(match: FlatMatch, leg: 1 | 2 = 1) {
  editingKey.value = getEditKey(match, leg)
  editMode.value = "score"
  const src: MatchResult | null | undefined = leg === 2 ? match.leg2Result : match.result
  editHome.value = src?.home ?? 0
  editAway.value = src?.away ?? 0
  editPenHome.value = src?.penHome ?? 0
  editPenAway.value = src?.penAway ?? 0
}

function cancelEdit() {
  editingKey.value = null
  editMode.value = "score"
}

function isEditing(match: FlatMatch, leg: 1 | 2 = 1): boolean {
  return editingKey.value === getEditKey(match, leg)
}

function saveResult(match: FlatMatch, leg: 1 | 2 = 1) {
  if (leg === 2) {
    // Check aggregate tie → need penalty
    const l1 = match.result
    if (l1) {
      const aggHome = l1.home + editAway.value
      const aggAway = l1.away + editHome.value
      if (aggHome === aggAway) {
        editMode.value = "penalty"
        editPenHome.value = 0
        editPenAway.value = 0
        return
      }
    }
    emit("set-leg2-result", match._origRound, match._origMatch, editHome.value, editAway.value)
    cancelEdit()
    return
  }

  // Leg 1 of double-leg: draw allowed, no penalty
  if (match.leg2Result !== undefined) {
    if (match._isThirdPlace) {
      emit("set-third-place-result", editHome.value, editAway.value)
    } else {
      emit("set-result", match._origRound, match._origMatch, editHome.value, editAway.value)
    }
    cancelEdit()
    return
  }

  // Single-leg: draw → penalty
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

function savePenalties(match: FlatMatch, leg: 1 | 2 = 1) {
  if (editPenHome.value === editPenAway.value) return
  if (leg === 2) {
    emit(
      "set-leg2-result",
      match._origRound,
      match._origMatch,
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
    cancelEdit()
    return
  }
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

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

const isSoloLayout = computed(() => {
  const lastRoundIdx = props.tournament.rounds.length - 1
  return selectedRound.value === lastRoundIdx || selectedRound.value === "tp"
})

function scoreLabelSingle(result: MatchResult | null | undefined): string {
  if (!result) return "/"
  const pen = result.penHome !== undefined ? ` (${result.penHome}–${result.penAway})` : ""
  return `${result.home} – ${result.away}${pen}`
}

function legWinner(result: MatchResult | null | undefined, side: "home" | "away"): boolean {
  if (!result) return false
  return side === "home" ? result.home > result.away : result.away > result.home
}

function aggLabel(match: FlatMatch): string {
  if (!match.result || !match.leg2Result) return "–"
  const h = match.result.home + match.leg2Result.away
  const a = match.result.away + match.leg2Result.home
  return `${h} – ${a}`
}

function aggWinnerId(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  return getWinnerId(match)
}

function singleScoreColor(match: FlatMatch): string {
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
      <template v-for="match in filteredMatches" :key="match.id">
        <!-- ── Çift Maç (Double-leg) ── -->
        <div
          v-if="match.leg2Result !== undefined"
          class="fx-double-tie"
          :class="{ solo: isSoloLayout }"
        >
          <!-- Aggregate header -->
          <div class="fx-agg-row">
            <span class="fx-agg-teams">
              <span class="dot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
              {{ getTeam(match.homeId)?.name ?? "TBD" }}
              <span
                class="fx-agg-score"
                :class="{
                  'agg-home': aggWinnerId(match) === match.homeId,
                  'agg-away': aggWinnerId(match) === match.awayId,
                }"
              >
                {{ aggLabel(match) }}
              </span>
              {{ getTeam(match.awayId)?.name ?? "TBD" }}
              <span class="dot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
            </span>
            <button
              v-if="match.homeId && match.awayId"
              class="btn-xs sim-btn"
              title="Her iki maçı simüle et"
              @click="$emit('sim-match', match._origRound, match._origMatch)"
            >
              <Shuffle :size="12" />
            </button>
          </div>

          <!-- Leg 1: homeId evinde -->
          <div class="fx-leg-block">
            <span class="fx-leg-tag">L1</span>
            <div class="fx-match-inner">
              <span
                class="fx-team fx-team--home"
                :class="{
                  winner: legWinner(match.result, 'home'),
                  loser: !!match.result && !legWinner(match.result, 'home'),
                }"
              >
                <span class="fx-name">{{ getTeam(match.homeId)?.name ?? "TBD" }}</span>
                <span class="dot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
              </span>
              <div class="fx-center">
                <template v-if="isEditing(match, 1)">
                  <input v-model.number="editHome" type="number" min="0" class="score-input" />
                  <span class="dash">–</span>
                  <input v-model.number="editAway" type="number" min="0" class="score-input" />
                  <button class="primary btn-xs" @click="saveResult(match, 1)">OK</button>
                  <button class="btn-xs" @click="cancelEdit"><X :size="11" /></button>
                </template>
                <template v-else>
                  <button
                    class="fx-score-btn"
                    :disabled="!match.homeId || !match.awayId"
                    @click="match.homeId && match.awayId ? startEdit(match, 1) : undefined"
                  >
                    {{ scoreLabelSingle(match.result) }}
                  </button>
                  <button
                    v-if="match.homeId && match.awayId"
                    class="btn-xs sim-btn"
                    title="1. maçı simüle et"
                    @click="$emit('sim-leg1', match._origRound, match._origMatch)"
                  >
                    <Shuffle :size="12" />
                  </button>
                </template>
              </div>
              <span
                class="fx-team fx-team--away"
                :class="{
                  winner: legWinner(match.result, 'away'),
                  loser: !!match.result && !legWinner(match.result, 'away'),
                }"
              >
                <span class="dot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
                <span class="fx-name">{{ getTeam(match.awayId)?.name ?? "TBD" }}</span>
              </span>
            </div>
          </div>

          <!-- Leg 2: awayId evinde (takımlar yer değiştirdi) -->
          <div class="fx-leg-block">
            <span class="fx-leg-tag">L2</span>
            <div class="fx-match-inner">
              <span
                class="fx-team fx-team--home"
                :class="{
                  winner: legWinner(match.leg2Result, 'home'),
                  loser: !!match.leg2Result && !legWinner(match.leg2Result, 'home'),
                }"
              >
                <span class="fx-name">{{ getTeam(match.awayId)?.name ?? "TBD" }}</span>
                <span class="dot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
              </span>
              <div class="fx-center">
                <template v-if="isEditing(match, 2) && editMode === 'penalty'">
                  <span class="pen-label">Pen</span>
                  <input v-model.number="editPenHome" type="number" min="0" class="score-input" />
                  <span class="dash">–</span>
                  <input v-model.number="editPenAway" type="number" min="0" class="score-input" />
                  <button
                    class="primary btn-xs"
                    :disabled="editPenHome === editPenAway"
                    @click="savePenalties(match, 2)"
                  >
                    OK
                  </button>
                  <button class="btn-xs" @click="cancelEdit"><X :size="11" /></button>
                </template>
                <template v-else-if="isEditing(match, 2)">
                  <input v-model.number="editHome" type="number" min="0" class="score-input" />
                  <span class="dash">–</span>
                  <input v-model.number="editAway" type="number" min="0" class="score-input" />
                  <button class="primary btn-xs" @click="saveResult(match, 2)">OK</button>
                  <button class="btn-xs" @click="cancelEdit"><X :size="11" /></button>
                </template>
                <template v-else>
                  <button
                    class="fx-score-btn"
                    :disabled="!match.result"
                    @click="match.result ? startEdit(match, 2) : undefined"
                  >
                    {{ match.leg2Result ? scoreLabelSingle(match.leg2Result) : "/" }}
                  </button>
                  <button
                    v-if="match.result"
                    class="btn-xs sim-btn"
                    title="2. maçı simüle et"
                    @click="$emit('sim-leg2', match._origRound, match._origMatch)"
                  >
                    <Shuffle :size="12" />
                  </button>
                </template>
              </div>
              <span
                class="fx-team fx-team--away"
                :class="{
                  winner: legWinner(match.leg2Result, 'away'),
                  loser: !!match.leg2Result && !legWinner(match.leg2Result, 'away'),
                }"
              >
                <span class="dot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
                <span class="fx-name">{{ getTeam(match.homeId)?.name ?? "TBD" }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- ── Tek Maç (Single-leg) ── -->
        <div v-else class="fx-match" :class="{ editing: isEditing(match), solo: isSoloLayout }">
          <span
            class="fx-team fx-team--home"
            :class="{
              winner: match.result && getWinnerId(match) === match.homeId,
              loser: match.result && getWinnerId(match) !== match.homeId,
            }"
          >
            <span class="fx-name">{{ getTeam(match.homeId)?.name ?? "TBD" }}</span>
            <span class="dot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
          </span>

          <div class="fx-center">
            <template v-if="isEditing(match) && editMode === 'penalty'">
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
            <template v-else-if="isEditing(match)">
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
                  match.result
                    ? { borderColor: singleScoreColor(match), borderLeftWidth: '3px' }
                    : {}
                "
                :disabled="!match.homeId || !match.awayId"
                @click="match.homeId && match.awayId ? startEdit(match) : undefined"
              >
                {{ scoreLabelSingle(match.result) }}
              </button>
              <button
                v-if="match.homeId && match.awayId"
                class="btn-xs sim-btn"
                title="Random result"
                @click="$emit('sim-match', match._origRound, match._origMatch)"
              >
                <Shuffle :size="12" />
              </button>
            </template>
          </div>

          <span
            class="fx-team fx-team--away"
            :class="{
              winner: match.result && getWinnerId(match) === match.awayId,
              loser: match.result && getWinnerId(match) !== match.awayId,
            }"
          >
            <span class="dot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
            <span class="fx-name">{{ getTeam(match.awayId)?.name ?? "TBD" }}</span>
          </span>
        </div>
      </template>

      <div v-if="filteredMatches.length === 0" class="empty-state">No matches yet.</div>
    </div>
  </div>
</template>

<style scoped>
.fixture-view {
  width: 100%;
}

/* Round tabs */
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

/* Grid */
.fixture-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  padding: 0 8px 6px;
}
@media (max-width: 560px) {
  .fixture-list {
    grid-template-columns: 1fr;
  }
  .fx-match.solo,
  .fx-double-tie.solo {
    width: 100%;
    grid-column: auto;
  }
}

.empty-state {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 20px 0;
}

/* Single-leg match */
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

/* Double-leg tie card */
.fx-double-tie {
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  padding: 5px 7px;
  background: var(--bg);
  font-size: 12px;
}
.fx-double-tie.solo {
  grid-column: 1 / -1;
  width: 50%;
  justify-self: center;
}

.fx-agg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 2px;
}
.fx-agg-teams {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);
  flex-wrap: wrap;
  min-width: 0;
}
.fx-agg-score {
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 12px;
  color: var(--text);
  padding: 0 3px;
}
.fx-agg-score.agg-home {
  color: var(--success);
}
.fx-agg-score.agg-away {
  color: var(--danger);
}

.fx-leg-block {
  display: flex;
  align-items: center;
  gap: 4px;
}
.fx-leg-tag {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  width: 14px;
  flex-shrink: 0;
}
.fx-match-inner {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

/* Teams */
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

/* Center */
.fx-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex-shrink: 0;
}

/* Score button */
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
</style>
