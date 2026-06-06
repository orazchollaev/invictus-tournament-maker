<script setup lang="ts">
import { ref, computed } from "vue"
import type { Match } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { getWinnerId } from "@/engine"
import { Pencil, Shuffle, X, Check } from "@lucide/vue"

const props = defineProps<{
  match: Match & { _origRound: number; _origMatch: number }
  teams: Team[]
  isFinal?: boolean
  isExporting?: boolean
  dimmed?: boolean
}>()

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
  "hover-team": [teamId: string | null]
}>()

const isDouble = computed(() => props.match.leg2Result !== undefined)

const agg = computed(() => {
  const m = props.match
  if (!m.result || m.leg2Result == null) return null
  return { home: m.result.home + m.leg2Result.away, away: m.result.away + m.leg2Result.home }
})

// Per-team per-leg goals (+ penalty) for compact display
const legs = computed(() => {
  const m = props.match
  if (!isDouble.value) return null
  return {
    homeL1: m.result?.home ?? null,
    homeL2: m.leg2Result?.away ?? null,
    homeP: m.leg2Result?.penAway ?? null, // homeId penalty goals
    awayL1: m.result?.away ?? null,
    awayL2: m.leg2Result?.home ?? null,
    awayP: m.leg2Result?.penHome ?? null, // awayId penalty goals
  }
})

function isWinner(teamId: string | null) {
  if (!props.match.result || !teamId) return false
  return getWinnerId(props.match) === teamId
}

// ── Shared edit refs ──
const editH = ref(0)
const editA = ref(0)
const editPH = ref(0)
const editPA = ref(0)

// ── Single-leg ──
type SMode = "off" | "score" | "penalty"
const sMode = ref<SMode>("off")

function singleEdit() {
  editH.value = props.match.result?.home ?? 0
  editA.value = props.match.result?.away ?? 0
  sMode.value = "score"
}
function singleCancel() {
  sMode.value = "off"
}
function singleSave() {
  if (editH.value === editA.value) {
    editPH.value = props.match.result?.penHome ?? 0
    editPA.value = props.match.result?.penAway ?? 0
    sMode.value = "penalty"
    return
  }
  emit("set-result", props.match._origRound, props.match._origMatch, editH.value, editA.value)
  sMode.value = "off"
}
function singlePenSave() {
  if (editPH.value === editPA.value) return
  emit(
    "set-result",
    props.match._origRound,
    props.match._origMatch,
    editH.value,
    editA.value,
    editPH.value,
    editPA.value
  )
  sMode.value = "off"
}

// ── Double-leg ──
const editingLeg = ref<null | 1 | 2>(null)
const legMode = ref<"score" | "penalty">("score")
// "idle" | "edit" | "sim" — which action is pending leg-pick
const dblPick = ref<"idle" | "edit" | "sim">("idle")

function legEdit(leg: 1 | 2) {
  dblPick.value = "idle"
  editingLeg.value = leg
  legMode.value = "score"
  editH.value = leg === 1 ? (props.match.result?.home ?? 0) : (props.match.leg2Result?.home ?? 0)
  editA.value = leg === 1 ? (props.match.result?.away ?? 0) : (props.match.leg2Result?.away ?? 0)
  editPH.value = 0
  editPA.value = 0
}
function legCancel() {
  editingLeg.value = null
  legMode.value = "score"
  dblPick.value = "idle"
}
function legSave() {
  const ri = props.match._origRound,
    mi = props.match._origMatch
  if (editingLeg.value === 1) {
    emit("set-result", ri, mi, editH.value, editA.value)
    editingLeg.value = null
    return
  }
  const l1 = props.match.result
  if (l1 && l1.home + editA.value === l1.away + editH.value) {
    legMode.value = "penalty"
    editPH.value = 0
    editPA.value = 0
    return
  }
  emit("set-leg2-result", ri, mi, editH.value, editA.value)
  editingLeg.value = null
}
function legPenSave() {
  if (editPH.value === editPA.value) return
  emit(
    "set-leg2-result",
    props.match._origRound,
    props.match._origMatch,
    editH.value,
    editA.value,
    editPH.value,
    editPA.value
  )
  editingLeg.value = null
  legMode.value = "score"
}
function dblSelectLeg(leg: 1 | 2) {
  if (dblPick.value === "edit") {
    legEdit(leg)
  } else {
    if (leg === 1) emit("sim-leg1", props.match._origRound, props.match._origMatch)
    else emit("sim-leg2", props.match._origRound, props.match._origMatch)
    dblPick.value = "idle"
  }
}

const isEditing = computed(() => sMode.value !== "off" || editingLeg.value !== null)
</script>

<template>
  <div class="mc" :class="{ final: isFinal, dimmed }" @mouseleave="$emit('hover-team', null)">
    <!-- ── Left: team names ── -->
    <div class="mc-teams">
      <div
        class="mc-row"
        :class="{ winner: isWinner(match.homeId), loser: match.result && !isWinner(match.homeId) }"
        @mouseenter="match.homeId && $emit('hover-team', match.homeId)"
      >
        <TeamBadge :team-id="match.homeId" :teams="teams" />
      </div>
      <div
        class="mc-row mc-row--away"
        :class="{ winner: isWinner(match.awayId), loser: match.result && !isWinner(match.awayId) }"
        @mouseenter="match.awayId && $emit('hover-team', match.awayId)"
      >
        <TeamBadge :team-id="match.awayId" :teams="teams" />
      </div>
    </div>

    <!-- ── Right: scores + actions (only when teams assigned) ── -->
    <template v-if="match.homeId && match.awayId">
      <!-- Score column -->
      <div class="mc-scores">
        <!-- Home score cell -->
        <div
          class="mc-scell"
          :class="{
            winner: isWinner(match.homeId),
            loser: match.result && !isWinner(match.homeId),
          }"
        >
          <template v-if="!isDouble">
            <!-- Single-leg: display or input -->
            <template v-if="sMode === 'off'">
              <span v-if="match.result" class="sc">
                {{ match.result.home }}
                <span v-if="match.result.penHome !== undefined" class="pen-sup">
                  [{{ match.result.penHome }}p]
                </span>
              </span>
              <span v-else class="sc tbd">–</span>
            </template>
            <template v-else-if="sMode === 'score'">
              <input v-model.number="editH" type="number" min="0" class="sinp" />
            </template>
            <template v-else>
              <!-- penalty mode: static score + pen input side by side -->
              <span class="pen-base">{{ editH }}</span>
              <input v-model.number="editPH" type="number" min="0" class="sinp sinp--pen" />
            </template>
          </template>
          <template v-else>
            <!-- Double-leg: display or input -->
            <template v-if="editingLeg === null">
              <span v-if="agg !== null" class="sc">{{ agg.home }}</span>
              <span v-else-if="match.result" class="sc">{{ match.result.home }}</span>
              <span v-else class="sc tbd">–</span>
              <span v-if="legs && legs.homeL1 !== null" class="leg-mini">
                {{ legs.homeL1 }}·{{ legs.homeL2 ?? "–" }}
                <span v-if="legs.homeP !== null" class="pen-sup">[{{ legs.homeP }}p]</span>
              </span>
            </template>
            <template v-else>
              <span class="leg-lbl">{{ legMode === "penalty" ? "P" : `L${editingLeg}` }}</span>
              <!-- homeId goals: L1→editH, L2→editA (homeId is "away" in leg2), L2pen→editPA -->
              <input
                v-if="legMode === 'score' && editingLeg === 1"
                v-model.number="editH"
                type="number"
                min="0"
                class="sinp"
              />
              <input
                v-else-if="legMode === 'score' && editingLeg === 2"
                v-model.number="editA"
                type="number"
                min="0"
                class="sinp"
              />
              <input v-else v-model.number="editPA" type="number" min="0" class="sinp" />
            </template>
          </template>
        </div>

        <!-- Away score cell -->
        <div
          class="mc-scell mc-scell--away"
          :class="{
            winner: isWinner(match.awayId),
            loser: match.result && !isWinner(match.awayId),
          }"
        >
          <template v-if="!isDouble">
            <template v-if="sMode === 'off'">
              <span v-if="match.result" class="sc">
                {{ match.result.away }}
                <span v-if="match.result.penAway !== undefined" class="pen-sup">
                  [{{ match.result.penAway }}p]
                </span>
              </span>
              <span v-else class="sc tbd">–</span>
            </template>
            <template v-else-if="sMode === 'score'">
              <input v-model.number="editA" type="number" min="0" class="sinp" />
            </template>
            <template v-else>
              <span class="pen-base">{{ editA }}</span>
              <input v-model.number="editPA" type="number" min="0" class="sinp sinp--pen" />
            </template>
          </template>
          <template v-else>
            <template v-if="editingLeg === null">
              <span v-if="agg !== null" class="sc">{{ agg.away }}</span>
              <span v-else-if="match.result" class="sc">{{ match.result.away }}</span>
              <span v-else class="sc tbd">–</span>
              <span v-if="legs && legs.awayL1 !== null" class="leg-mini">
                {{ legs.awayL1 }}·{{ legs.awayL2 ?? "–" }}
                <span v-if="legs.awayP !== null" class="pen-sup">[{{ legs.awayP }}p]</span>
              </span>
            </template>
            <template v-else>
              <span class="leg-lbl">{{ legMode === "penalty" ? "P" : `L${editingLeg}` }}</span>
              <!-- awayId goals: L1→editA, L2→editH (awayId is "home" in leg2), L2pen→editPH -->
              <input
                v-if="legMode === 'score' && editingLeg === 1"
                v-model.number="editA"
                type="number"
                min="0"
                class="sinp"
              />
              <input
                v-else-if="legMode === 'score' && editingLeg === 2"
                v-model.number="editH"
                type="number"
                min="0"
                class="sinp"
              />
              <input v-else v-model.number="editPH" type="number" min="0" class="sinp" />
            </template>
          </template>
        </div>
      </div>

      <!-- Action column -->
      <div v-if="!isExporting" class="mc-actions">
        <!-- Editing: ✓ ✗ -->
        <template v-if="isEditing">
          <button
            class="abt ok"
            @click="
              isDouble
                ? legMode === 'penalty'
                  ? legPenSave()
                  : legSave()
                : sMode === 'penalty'
                  ? singlePenSave()
                  : singleSave()
            "
          >
            <Check :size="11" />
          </button>
          <button class="abt" @click="isDouble ? legCancel() : singleCancel()">
            <X :size="11" />
          </button>
        </template>
        <!-- Double-leg picking a leg -->
        <template v-else-if="isDouble && dblPick !== 'idle'">
          <button class="abt abt--leg" @click="dblSelectLeg(1)">L1</button>
          <button class="abt abt--leg" :disabled="!match.result" @click="dblSelectLeg(2)">
            L2
          </button>
        </template>
        <!-- Single-leg idle -->
        <template v-else-if="!isDouble">
          <button class="abt" title="Edit" @click="singleEdit"><Pencil :size="11" /></button>
          <button
            class="abt"
            title="Simulate"
            @click="$emit('sim-match', match._origRound, match._origMatch)"
          >
            <Shuffle :size="11" />
          </button>
        </template>
        <!-- Double-leg idle: ✎ 🔀 -->
        <template v-else>
          <button
            class="abt"
            :class="{ active: dblPick === 'edit' }"
            title="Edit"
            @click="dblPick = dblPick === 'edit' ? 'idle' : 'edit'"
          >
            <Pencil :size="11" />
          </button>
          <button
            class="abt"
            :class="{ active: dblPick === 'sim' }"
            title="Simulate"
            @click="dblPick = dblPick === 'sim' ? 'idle' : 'sim'"
          >
            <Shuffle :size="11" />
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Card shell ── */
.mc {
  display: flex;
  flex-direction: row;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 12px;
  box-sizing: border-box;
  overflow: hidden;
  animation: fade-up 0.28s ease both;
  transition:
    opacity 0.2s ease,
    filter 0.2s ease;
}
.mc.final {
  border-color: #c9a227;
  box-shadow:
    0 0 0 1px #c9a22733,
    0 2px 10px #c9a22720;
}
.mc.dimmed {
  opacity: 0.22;
  filter: saturate(0.15);
}

/* ── Teams column (left, fills remaining width) ── */
.mc-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Team row ── */
.mc-row {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 6px;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.mc-row--away {
  border-bottom: none;
}
.mc-row.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  font-weight: 700;
}
.mc-row.loser {
  opacity: 0.5;
}
.mc.final .mc-row.winner {
  background: color-mix(in srgb, #c9a227 12%, var(--surface));
}

/* ── Score column (right of teams) ── */
.mc-scores {
  width: 54px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
}

.mc-scell {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.mc-scell--away {
  border-bottom: none;
}
.mc-scell.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}
.mc-scell.loser {
  opacity: 0.5;
}
.mc.final .mc-scell.winner {
  background: color-mix(in srgb, #c9a227 12%, var(--surface));
}

/* ── Score chip ── */
.sc {
  font-weight: 700;
  font-size: 12px;
  background: color-mix(in srgb, var(--text-muted) 10%, var(--surface));
  border-radius: 3px;
  padding: 1px 5px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  animation: score-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.sc.tbd {
  color: var(--text-muted);
  font-weight: 400;
  background: transparent;
  animation: none;
}
.mc.final .sc {
  background: color-mix(in srgb, #c9a227 16%, var(--surface));
  color: #b8860b;
}
.pen-sup {
  font-size: 9px;
  font-weight: 400;
  color: var(--text-muted);
}

/* Penalty edit inline (single-leg) */
.pen-base {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  min-width: 10px;
  text-align: center;
  flex-shrink: 0;
}

/* Double-leg mini breakdown (e.g. "2·1") */
.leg-mini {
  font-size: 9px;
  color: var(--text-muted);
  font-family: var(--font-ui);
  white-space: nowrap;
  flex-shrink: 0;
}

/* Double-leg edit label (L1 / L2 / P) */
.leg-lbl {
  font-size: 9px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  flex-shrink: 0;
  min-width: 10px;
}

/* ── Number inputs ── */
.sinp {
  width: 26px;
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 1px 2px;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  flex-shrink: 0;
  -moz-appearance: textfield;
  appearance: textfield;
  box-sizing: border-box;
}
.sinp--pen {
  width: 22px;
  font-size: 11px;
}
.sinp:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
.sinp::-webkit-outer-spin-button,
.sinp::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* ── Action column ── */
.mc-actions {
  width: 28px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border-left: 1px solid var(--border-light);
  background: var(--bg);
  box-sizing: border-box;
}
.mc.final .mc-actions {
  background: color-mix(in srgb, #c9a227 5%, var(--bg));
  border-left-color: #c9a22733;
}

/* ── Icon buttons ── */
.abt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition:
    color 0.1s,
    border-color 0.1s,
    background 0.1s;
}
/* Leg-pick label buttons (L1 / L2) */
.abt--leg {
  width: 20px;
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-ui);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-light));
}
.abt--leg:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border-color: var(--accent);
}
/* Active state when pick mode is open */
.abt.active {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-light));
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.abt:hover:not(:disabled):not(.abt--leg) {
  color: var(--text);
  border-color: var(--border);
  background: color-mix(in srgb, var(--border) 30%, transparent);
}
.abt.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 40%, var(--border-light));
}
.abt.ok:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success) 10%, transparent);
}
.abt:disabled {
  opacity: 0.25;
  cursor: default;
}
</style>
