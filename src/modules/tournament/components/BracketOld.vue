<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, Match } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import BracketMatchCard from "./BracketMatchCard.vue"
import { getWinnerId } from "@/engine"
import { Shuffle, X, Check, Pencil } from "@lucide/vue"

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

// ── 3rd place edit state (single-leg only) ────────────────────
const tpMode = ref<"off" | "score" | "penalty">("off")
const tpH = ref(0)
const tpA = ref(0)
const tpPH = ref(0)
const tpPA = ref(0)
const thirdPlaceMatch = computed(() => props.tournament.thirdPlaceMatch ?? null)

function tpEdit() {
  const m = thirdPlaceMatch.value
  if (!m) return
  tpH.value = m.result?.home ?? 0
  tpA.value = m.result?.away ?? 0
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
  emit("set-third-place-result", tpH.value, tpA.value)
  tpMode.value = "off"
}
function tpPenSave() {
  if (tpPH.value === tpPA.value) return
  emit("set-third-place-result", tpH.value, tpA.value, tpPH.value, tpPA.value)
  tpMode.value = "off"
}

function isWinnerTp(teamId: string | null) {
  const m = thirdPlaceMatch.value
  if (!m?.result || !teamId) return false
  return getWinnerId(m) === teamId
}

// ── Bracket data ──────────────────────────────────────────────
type DisplayMatch = Match & { _origRound: number; _origMatch: number }

const allRounds = computed(() => props.tournament.rounds)
const displayRounds = computed((): DisplayMatch[][] =>
  allRounds.value.map((r, ri) =>
    r.matches.map((m, mi) => ({ ...m, _origRound: ri, _origMatch: mi }))
  )
)

// ── Layout constants ──────────────────────────────────────────
const CARD_H = 58 // 28 home + 28 away + 2px outer borders
const CARD_H_DOUBLE = 58 // same: no extra rows
const CARD_GAP = 20
const CARD_W = 190
const COL_GAP = 32
const HEADER_H = 28

function isDoubleLegRound(ri: number): boolean {
  return displayRounds.value[ri]?.[0]?.leg2Result !== undefined
}

function cardH(ri: number): number {
  return isDoubleLegRound(ri) ? CARD_H_DOUBLE : CARD_H
}

const totalBracketH = computed(() => {
  const n = displayRounds.value[0]?.length ?? 1
  const h = cardH(0)
  return n * h + (n - 1) * CARD_GAP
})

function matchCenterY(ri: number, mi: number): number {
  const n = displayRounds.value[0]?.length ?? 1
  const h0 = cardH(0)
  const totalH = n * h0 + (n - 1) * CARD_GAP
  const slot = totalH / (displayRounds.value[ri]?.length ?? 1)
  return slot * mi + slot / 2
}

function cardTop(ri: number, mi: number): number {
  return matchCenterY(ri, mi) - cardH(ri) / 2
}

// ── SVG connectors ────────────────────────────────────────────
interface ConnPath {
  ay: number
  by: number
  dy: number
}

function connectorPaths(ri: number): ConnPath[] {
  const nextCount = displayRounds.value[ri + 1]?.length ?? 0
  return Array.from({ length: nextCount }, (_, ci) => ({
    ay: matchCenterY(ri, ci * 2),
    by: matchCenterY(ri, ci * 2 + 1),
    dy: matchCenterY(ri + 1, ci),
  }))
}

function svgPath(p: ConnPath, w: number): string {
  const mid = w / 2
  return [
    `M0,${p.ay} H${mid}`,
    `M0,${p.by} H${mid}`,
    `M${mid},${p.ay} V${p.by}`,
    `M${mid},${(p.ay + p.by) / 2} H${w}`,
  ].join(" ")
}
</script>

<template>
  <div class="bracket-wrap">
    <div class="bracket" :style="{ height: totalBracketH + HEADER_H + 'px' }">
      <template v-for="(roundMatches, ri) in displayRounds" :key="'round-' + ri">
        <div class="round-col" :style="{ width: CARD_W + 'px' }">
          <div class="round-title" :class="{ 'final-title': ri === displayRounds.length - 1 }">
            {{ allRounds[ri].name }}
          </div>
          <div class="matches-area" :style="{ height: totalBracketH + 'px' }">
            <BracketMatchCard
              v-for="(match, mi) in roundMatches"
              :key="match.id"
              :match="match"
              :teams="teams"
              :is-final="ri === displayRounds.length - 1"
              :style="{
                position: 'absolute',
                top: cardTop(ri, mi) + 'px',
                left: 0,
                right: 0,
                animationDelay: `${ri * 0.08 + mi * 0.05}s`,
              }"
              @set-result="(r, m, h, a, ph, pa) => emit('set-result', r, m, h, a, ph, pa)"
              @set-leg2-result="(r, m, h, a, ph, pa) => emit('set-leg2-result', r, m, h, a, ph, pa)"
              @sim-match="(r, m) => emit('sim-match', r, m)"
              @sim-leg1="(r, m) => emit('sim-leg1', r, m)"
              @sim-leg2="(r, m) => emit('sim-leg2', r, m)"
            />
          </div>
        </div>

        <div
          v-if="ri < displayRounds.length - 1"
          class="conn-col"
          :style="{
            width: COL_GAP + 'px',
            marginTop: HEADER_H + 'px',
            height: totalBracketH + 'px',
          }"
        >
          <svg width="100%" height="100%" style="display: block; overflow: visible">
            <path
              v-for="(p, pi) in connectorPaths(ri)"
              :key="pi"
              :d="svgPath(p, COL_GAP)"
              fill="none"
              stroke="var(--border-light)"
              stroke-width="1.5"
            />
          </svg>
        </div>
      </template>

      <!-- ── 3rd place ── -->
      <template v-if="tournament.hasThirdPlace && thirdPlaceMatch">
        <div
          class="tp-divider"
          :style="{ marginTop: HEADER_H + 'px', height: totalBracketH + 'px' }"
        />
        <div class="round-col" :style="{ width: CARD_W + 'px' }">
          <div class="round-title tp-title">3rd Place</div>
          <div class="matches-area" :style="{ height: totalBracketH + 'px' }">
            <div
              class="tp-card"
              :style="{
                position: 'absolute',
                top: totalBracketH / 2 - CARD_H / 2 + 'px',
                left: 0,
                right: 0,
              }"
            >
              <template v-if="!thirdPlaceMatch.homeId || !thirdPlaceMatch.awayId">
                <div class="tp-waiting">Waiting for semi-finals…</div>
              </template>
              <template v-else>
                <!-- Teams column -->
                <div class="tp-teams">
                  <div
                    class="tp-row"
                    :class="{
                      winner: isWinnerTp(thirdPlaceMatch.homeId),
                      loser: thirdPlaceMatch.result && !isWinnerTp(thirdPlaceMatch.homeId),
                    }"
                  >
                    <TeamBadge :team-id="thirdPlaceMatch.homeId" :teams="teams" />
                  </div>
                  <div
                    class="tp-row tp-row--away"
                    :class="{
                      winner: isWinnerTp(thirdPlaceMatch.awayId),
                      loser: thirdPlaceMatch.result && !isWinnerTp(thirdPlaceMatch.awayId),
                    }"
                  >
                    <TeamBadge :team-id="thirdPlaceMatch.awayId" :teams="teams" />
                  </div>
                </div>
                <!-- Score column -->
                <div class="tp-scores">
                  <div
                    class="tp-scell"
                    :class="{
                      winner: isWinnerTp(thirdPlaceMatch.homeId),
                      loser: thirdPlaceMatch.result && !isWinnerTp(thirdPlaceMatch.homeId),
                    }"
                  >
                    <template v-if="tpMode === 'score'">
                      <input v-model.number="tpH" type="number" min="0" class="tp-inp" />
                    </template>
                    <template v-else-if="tpMode === 'penalty'">
                      <span class="tp-pen-base">{{ tpH }}</span>
                      <input
                        v-model.number="tpPH"
                        type="number"
                        min="0"
                        class="tp-inp tp-inp--pen"
                      />
                    </template>
                    <template v-else>
                      <span v-if="thirdPlaceMatch.result" class="tp-sc">
                        {{ thirdPlaceMatch.result.home }}
                        <span
                          v-if="thirdPlaceMatch.result.penHome !== undefined"
                          class="tp-pen-sup"
                        >
                          [{{ thirdPlaceMatch.result.penHome }}p]
                        </span>
                      </span>
                      <span v-else class="tp-sc tbd">–</span>
                    </template>
                  </div>
                  <div
                    class="tp-scell tp-scell--away"
                    :class="{
                      winner: isWinnerTp(thirdPlaceMatch.awayId),
                      loser: thirdPlaceMatch.result && !isWinnerTp(thirdPlaceMatch.awayId),
                    }"
                  >
                    <template v-if="tpMode === 'score'">
                      <input v-model.number="tpA" type="number" min="0" class="tp-inp" />
                    </template>
                    <template v-else-if="tpMode === 'penalty'">
                      <span class="tp-pen-base">{{ tpA }}</span>
                      <input
                        v-model.number="tpPA"
                        type="number"
                        min="0"
                        class="tp-inp tp-inp--pen"
                      />
                    </template>
                    <template v-else>
                      <span v-if="thirdPlaceMatch.result" class="tp-sc">
                        {{ thirdPlaceMatch.result.away }}
                        <span
                          v-if="thirdPlaceMatch.result.penAway !== undefined"
                          class="tp-pen-sup"
                        >
                          [{{ thirdPlaceMatch.result.penAway }}p]
                        </span>
                      </span>
                      <span v-else class="tp-sc tbd">–</span>
                    </template>
                  </div>
                </div>
                <!-- Action column -->
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
                    <button class="icon-btn" @click="emit('sim-third-place')">
                      <Shuffle :size="11" />
                    </button>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bracket-wrap {
  width: fit-content;
  max-width: 100%;
  overflow-x: auto;
  padding-bottom: 8px;
}
.bracket {
  display: flex;
  align-items: flex-start;
  position: relative;
}

/* ── Round column ── */
.round-col {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.round-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 8px 8px;
  text-align: center;
  height: 28px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.final-title {
  color: #c9a227 !important;
}
.tp-title {
  color: var(--accent-2);
}

.matches-area {
  position: relative;
  width: 100%;
}

/* ── Connector ── */
.conn-col {
  flex-shrink: 0;
}

/* ── 3rd place card ── */
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
.tp-divider {
  width: 1px;
  background: var(--border-light);
  flex-shrink: 0;
  margin-left: 16px;
  margin-right: 16px;
  opacity: 0.5;
}
.tp-waiting {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px 8px;
}

/* ── 3rd place card columns ── */
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
  border-radius: 3px;
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
  border-radius: 3px;
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
