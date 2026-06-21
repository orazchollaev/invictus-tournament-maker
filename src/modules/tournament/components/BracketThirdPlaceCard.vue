<script setup lang="ts">
import { ref } from "vue"
import type { Match } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { getWinnerId } from "@/engine"
import { Shuffle, X, Check, Pencil } from "@lucide/vue"

const props = defineProps<{ match: Match; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [home: number, away: number, penHome?: number, penAway?: number]
  sim: []
}>()

const tpMode = ref<"off" | "score" | "penalty">("off")
const tpH = ref(0)
const tpA = ref(0)
const tpPH = ref(0)
const tpPA = ref(0)

function isWinnerTp(teamId: string | null) {
  if (!props.match.result || !teamId) return false
  return getWinnerId(props.match) === teamId
}

function tpEdit() {
  tpH.value = props.match.result?.home ?? 0
  tpA.value = props.match.result?.away ?? 0
  tpPH.value = 0
  tpPA.value = 0
  tpMode.value = "score"
}
function tpCancel() {
  tpMode.value = "off"
}
function tpSave() {
  if (tpH.value === tpA.value) {
    tpMode.value = "penalty"
    return
  }
  emit("set-result", tpH.value, tpA.value)
  tpMode.value = "off"
}
function tpPenSave() {
  if (tpPH.value === tpPA.value) return
  emit("set-result", tpH.value, tpA.value, tpPH.value, tpPA.value)
  tpMode.value = "off"
}
</script>

<template>
  <div class="tp-card">
    <!-- Teams column: always rendered, TeamBadge shows TBD placeholder when id is null -->
    <div class="tp-teams">
      <div
        class="tp-row"
        :class="{
          winner: isWinnerTp(match.homeId),
          loser: match.result && !isWinnerTp(match.homeId),
        }"
      >
        <TeamBadge :team-id="match.homeId" :teams="teams" />
      </div>
      <div
        class="tp-row tp-row--away"
        :class="{
          winner: isWinnerTp(match.awayId),
          loser: match.result && !isWinnerTp(match.awayId),
        }"
      >
        <TeamBadge :team-id="match.awayId" :teams="teams" />
      </div>
    </div>

    <!-- Scores + actions: only once both teams are known, same gating as MatchCard -->
    <template v-if="match.homeId && match.awayId">
      <div class="tp-scores">
        <div
          class="tp-scell"
          :class="{
            winner: isWinnerTp(match.homeId),
            loser: match.result && !isWinnerTp(match.homeId),
          }"
        >
          <template v-if="tpMode === 'score'">
            <input v-model.number="tpH" type="number" min="0" class="tp-inp" />
          </template>
          <template v-else-if="tpMode === 'penalty'">
            <span class="tp-pen-base">{{ tpH }}</span>
            <input v-model.number="tpPH" type="number" min="0" class="tp-inp tp-inp--pen" />
          </template>
          <template v-else>
            <span v-if="match.result" class="tp-sc">
              {{ match.result.home }}
              <span v-if="match.result.penHome !== undefined" class="tp-pen-sup">
                [{{ match.result.penHome }}p]
              </span>
            </span>
            <span v-else class="tp-sc tbd">–</span>
          </template>
        </div>
        <div
          class="tp-scell tp-scell--away"
          :class="{
            winner: isWinnerTp(match.awayId),
            loser: match.result && !isWinnerTp(match.awayId),
          }"
        >
          <template v-if="tpMode === 'score'">
            <input v-model.number="tpA" type="number" min="0" class="tp-inp" />
          </template>
          <template v-else-if="tpMode === 'penalty'">
            <span class="tp-pen-base">{{ tpA }}</span>
            <input v-model.number="tpPA" type="number" min="0" class="tp-inp tp-inp--pen" />
          </template>
          <template v-else>
            <span v-if="match.result" class="tp-sc">
              {{ match.result.away }}
              <span v-if="match.result.penAway !== undefined" class="tp-pen-sup">
                [{{ match.result.penAway }}p]
              </span>
            </span>
            <span v-else class="tp-sc tbd">–</span>
          </template>
        </div>
      </div>

      <div class="tp-actions">
        <template v-if="tpMode !== 'off'">
          <button
            class="icon-btn ok"
            :disabled="tpMode === 'penalty' && tpPH === tpPA"
            @click="tpMode === 'penalty' ? tpPenSave() : tpSave()"
          >
            <Check :size="11" />
          </button>
          <button class="icon-btn" @click="tpCancel"><X :size="11" /></button>
        </template>
        <template v-else>
          <button class="icon-btn" @click="tpEdit"><Pencil :size="11" /></button>
          <button class="icon-btn" @click="emit('sim')"><Shuffle :size="11" /></button>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tp-card {
  display: flex;
  flex-direction: row;
  border: 1px solid color-mix(in srgb, var(--accent-2) 35%, var(--border-light));
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.tp-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.tp-row {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 6px;
  gap: 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.tp-row--away {
  border-bottom: none;
}
.tp-row.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  font-weight: 700;
}
.tp-row.loser {
  opacity: 0.5;
}

.tp-scores {
  width: 54px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
}
.tp-scell {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
  box-sizing: border-box;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.tp-scell--away {
  border-bottom: none;
}
.tp-scell.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}
.tp-scell.loser {
  opacity: 0.5;
}

.tp-sc {
  font-weight: 700;
  font-size: 12px;
  background: color-mix(in srgb, var(--text-muted) 10%, var(--surface));
  border-radius: var(--radius);
  padding: 1px 5px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}
.tp-sc.tbd {
  color: var(--text-muted);
  font-weight: 400;
  background: transparent;
}
.tp-pen-sup {
  font-size: 9px;
  font-weight: 400;
  color: var(--text-muted);
}
.tp-pen-base {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  min-width: 10px;
  text-align: center;
}
.tp-inp {
  width: 26px;
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 1px 2px;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  -moz-appearance: textfield;
  appearance: textfield;
  box-sizing: border-box;
}
.tp-inp--pen {
  width: 22px;
  font-size: 11px;
}
.tp-inp:focus {
  outline: none;
}
.tp-inp::-webkit-outer-spin-button,
.tp-inp::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.tp-actions {
  width: 28px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border-left: 1px solid color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
  background: var(--bg);
  box-sizing: border-box;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
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
.icon-btn:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border);
  background: color-mix(in srgb, var(--border) 30%, transparent);
}
.icon-btn.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 40%, var(--border-light));
}
.icon-btn.ok:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success) 10%, transparent);
}
.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
