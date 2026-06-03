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

// ── 3rd place edit state ──────────────────────────────────────
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

const numRounds = computed(() => displayRounds.value.length)
// Number of non-final rounds (each has a left and right column)
const nonFinalCount = computed(() => Math.max(0, numRounds.value - 1))
const finalRi = computed(() => numRounds.value - 1)

// Left side uses the first half of each non-final round's matches
function lCount(ri: number): number {
  return Math.floor((displayRounds.value[ri]?.length ?? 0) / 2)
}
// Right side starts at the second half
function rStart(ri: number): number {
  return lCount(ri)
}

// ── Layout constants ──────────────────────────────────────────
const CARD_H = 62
const CARD_GAP = 22
const CARD_W = 220
const COL_GAP = 48
const HEADER_H = 28
const TP_GAP = 32
const CHAMP_H = 52

// Bracket height is determined by left side of first round
const bracketH = computed(() => {
  if (nonFinalCount.value === 0) return CARD_H
  const n = lCount(0)
  return n <= 0 ? CARD_H : n * CARD_H + (n - 1) * CARD_GAP
})

// Vertical center of a match card (local index within one side)
function matchCenterY(ri: number, miLocal: number): number {
  const count = ri === finalRi.value ? 1 : lCount(ri) || 1
  const slot = bracketH.value / count
  return slot * miLocal + slot / 2
}

// Total pixel width of the bracket
const totalW = computed(() =>
  nonFinalCount.value === 0 ? CARD_W : 2 * nonFinalCount.value * (CARD_W + COL_GAP) + CARD_W
)

// X of left column ri (0 = outermost)
function lColX(ri: number): number {
  return ri * (CARD_W + COL_GAP)
}
// X of final column (center)
const finalX = computed(() => nonFinalCount.value * (CARD_W + COL_GAP))
// X of right column ri (0 = outermost, rightmost)
function rColX(ri: number): number {
  return totalW.value - CARD_W - ri * (CARD_W + COL_GAP)
}

const finalCardTop = computed(() => HEADER_H + bracketH.value / 2 - CARD_H / 2 + 25)

const champion = computed(() => {
  const finalMatch = allRounds.value[finalRi.value]?.matches[0]
  if (!finalMatch?.result) return null
  const winnerId = getWinnerId(finalMatch)
  return props.teams.find((t) => t.id === winnerId) ?? null
})

// Banner sits 12px below the final card (right under the golden card)
const champBannerTop = computed(() => HEADER_H + bracketH.value / 2 + CARD_H / 2 + -120)

const containerH = computed(() => {
  let h = HEADER_H + bracketH.value
  if (props.tournament.hasThirdPlace && thirdPlaceMatch.value) {
    h += TP_GAP + HEADER_H + CARD_H
  }
  if (champion.value) {
    // Ensure container is tall enough to show the banner below the final card
    h = Math.max(h + 8, champBannerTop.value + CHAMP_H + 8)
  }
  return h
})

// ── SVG connectors ────────────────────────────────────────────
interface CP {
  ay: number
  by: number
  dy: number
  active: boolean
}

// Connector is "active" when the destination match already has both teams (winners advanced)
function connPaths(ri: number): CP[] {
  const nextCount = lCount(ri + 1)
  return Array.from({ length: nextCount }, (_, ci) => {
    const destMatch = displayRounds.value[ri + 1]?.[ci]
    return {
      ay: matchCenterY(ri, ci * 2),
      by: matchCenterY(ri, ci * 2 + 1),
      dy: matchCenterY(ri + 1, ci),
      active: !!(destMatch?.homeId && destMatch?.awayId),
    }
  })
}

// Left-side path: sources at x=0, destination at x=w
function pathL(p: CP, w: number): string {
  const m = w / 2
  return `M0,${p.ay} H${m} M0,${p.by} H${m} M${m},${p.ay} V${p.by} M${m},${(p.ay + p.by) / 2} H${w}`
}

// Right-side path (mirror): sources at x=w, destination at x=0
function pathR(p: CP, w: number): string {
  const m = w / 2
  return `M${w},${p.ay} H${m} M${w},${p.by} H${m} M${m},${p.ay} V${p.by} M${m},${(p.ay + p.by) / 2} H0`
}

function connStroke(active: boolean) {
  return active ? "var(--accent)" : "var(--border)"
}
function connOpacity(active: boolean) {
  return active ? 0.55 : 0.4
}
</script>

<template>
  <div class="bracket-wrap">
    <div class="bracket" :style="{ width: totalW + 'px', height: containerH + 'px' }">
      <!-- ═══════════════════════════════════════════════════
           LEFT SIDE  (rounds 0 → nonFinalCount-1, first-half matches)
           Columns go left → right, converging toward the final
      ════════════════════════════════════════════════════════ -->
      <template v-for="n in nonFinalCount" :key="'L' + n">
        <!-- Round header -->
        <div
          class="round-title"
          :style="{ position: 'absolute', top: 0, left: lColX(n - 1) + 'px', width: CARD_W + 'px' }"
        >
          {{ allRounds[n - 1].name }}
        </div>

        <!-- Match cards (first half of round) -->
        <BracketMatchCard
          v-for="(match, mi) in displayRounds[n - 1].slice(0, lCount(n - 1))"
          :key="match.id"
          :match="match"
          :teams="teams"
          :is-final="false"
          :style="{
            position: 'absolute',
            top: HEADER_H + matchCenterY(n - 1, mi) - CARD_H / 2 + 'px',
            left: lColX(n - 1) + 'px',
            width: CARD_W + 'px',
            animationDelay: `${(n - 1) * 0.08 + mi * 0.05}s`,
          }"
          @set-result="(r, m, h, a, ph, pa) => emit('set-result', r, m, h, a, ph, pa)"
          @set-leg2-result="(r, m, h, a, ph, pa) => emit('set-leg2-result', r, m, h, a, ph, pa)"
          @sim-match="(r, m) => emit('sim-match', r, m)"
          @sim-leg1="(r, m) => emit('sim-leg1', r, m)"
          @sim-leg2="(r, m) => emit('sim-leg2', r, m)"
        />

        <!-- Connector SVG to next inner left column -->
        <svg
          v-if="n < nonFinalCount"
          :style="{
            position: 'absolute',
            top: HEADER_H + 'px',
            left: lColX(n - 1) + CARD_W + 'px',
            width: COL_GAP + 'px',
            height: bracketH + 'px',
          }"
          overflow="visible"
          style="display: block"
        >
          <path
            v-for="(p, pi) in connPaths(n - 1)"
            :key="pi"
            :d="pathL(p, COL_GAP)"
            fill="none"
            :stroke="connStroke(p.active)"
            :stroke-opacity="connOpacity(p.active)"
            stroke-width="2"
          />
        </svg>
      </template>

      <!-- Left innermost column → final connector -->
      <svg
        v-if="nonFinalCount > 0"
        :style="{
          position: 'absolute',
          top: HEADER_H + 'px',
          left: lColX(nonFinalCount - 1) + CARD_W + 'px',
          width: COL_GAP + 'px',
          height: bracketH + 'px',
        }"
        overflow="visible"
        style="display: block"
      >
        <line
          x1="0"
          :y1="matchCenterY(nonFinalCount - 1, 0)"
          :x2="COL_GAP"
          :y2="bracketH / 2"
          :stroke="connStroke(!!displayRounds[finalRi]?.[0]?.homeId)"
          :stroke-opacity="connOpacity(!!displayRounds[finalRi]?.[0]?.homeId)"
          stroke-width="2"
        />
      </svg>

      <!-- ═══════════════════════════════════════════════════
           FINAL  (center column)
      ════════════════════════════════════════════════════════ -->
      <div
        class="round-title final-title"
        :style="{ position: 'absolute', top: 0, left: finalX + 'px', width: CARD_W + 'px' }"
      >
        {{ allRounds[finalRi].name }}
      </div>
      <BracketMatchCard
        v-if="displayRounds[finalRi]?.[0]"
        :match="displayRounds[finalRi][0]"
        :teams="teams"
        :is-final="true"
        :style="{
          position: 'absolute',
          top: HEADER_H + bracketH / 2 - CARD_H / 2 + 'px',
          left: finalX + 'px',
          width: CARD_W + 'px',
          animationDelay: `${(numRounds - 1) * 0.08}s`,
        }"
        @set-result="(r, m, h, a, ph, pa) => emit('set-result', r, m, h, a, ph, pa)"
        @set-leg2-result="(r, m, h, a, ph, pa) => emit('set-leg2-result', r, m, h, a, ph, pa)"
        @sim-match="(r, m) => emit('sim-match', r, m)"
        @sim-leg1="(r, m) => emit('sim-leg1', r, m)"
        @sim-leg2="(r, m) => emit('sim-leg2', r, m)"
      />

      <!-- ═══════════════════════════════════════════════════
           RIGHT SIDE  (rounds 0 → nonFinalCount-1, second-half matches)
           Columns go right → left, converging toward the final
      ════════════════════════════════════════════════════════ -->

      <!-- Final → right innermost column connector -->
      <svg
        v-if="nonFinalCount > 0"
        :style="{
          position: 'absolute',
          top: HEADER_H + 'px',
          left: finalX + CARD_W + 'px',
          width: COL_GAP + 'px',
          height: bracketH + 'px',
        }"
        overflow="visible"
        style="display: block"
      >
        <line
          :x1="COL_GAP"
          :y1="matchCenterY(nonFinalCount - 1, 0)"
          x2="0"
          :y2="bracketH / 2"
          :stroke="connStroke(!!displayRounds[finalRi]?.[0]?.awayId)"
          :stroke-opacity="connOpacity(!!displayRounds[finalRi]?.[0]?.awayId)"
          stroke-width="2"
        />
      </svg>

      <template v-for="n in nonFinalCount" :key="'R' + n">
        <!-- Round header -->
        <div
          class="round-title"
          :style="{ position: 'absolute', top: 0, left: rColX(n - 1) + 'px', width: CARD_W + 'px' }"
        >
          {{ allRounds[n - 1].name }}
        </div>

        <!-- Match cards (second half of round) -->
        <BracketMatchCard
          v-for="(match, mi) in displayRounds[n - 1].slice(rStart(n - 1))"
          :key="match.id"
          :match="match"
          :teams="teams"
          :is-final="false"
          :style="{
            position: 'absolute',
            top: HEADER_H + matchCenterY(n - 1, mi) - CARD_H / 2 + 'px',
            left: rColX(n - 1) + 'px',
            width: CARD_W + 'px',
            animationDelay: `${(n - 1) * 0.08 + mi * 0.05}s`,
          }"
          @set-result="(r, m, h, a, ph, pa) => emit('set-result', r, m, h, a, ph, pa)"
          @set-leg2-result="(r, m, h, a, ph, pa) => emit('set-leg2-result', r, m, h, a, ph, pa)"
          @sim-match="(r, m) => emit('sim-match', r, m)"
          @sim-leg1="(r, m) => emit('sim-leg1', r, m)"
          @sim-leg2="(r, m) => emit('sim-leg2', r, m)"
        />

        <!-- Connector SVG to next inner right column -->
        <svg
          v-if="n < nonFinalCount"
          :style="{
            position: 'absolute',
            top: HEADER_H + 'px',
            left: rColX(n) + CARD_W + 'px',
            width: COL_GAP + 'px',
            height: bracketH + 'px',
          }"
          overflow="visible"
          style="display: block"
        >
          <path
            v-for="(p, pi) in connPaths(n - 1)"
            :key="pi"
            :d="pathR(p, COL_GAP)"
            fill="none"
            :stroke="connStroke(p.active)"
            :stroke-opacity="connOpacity(p.active)"
            stroke-width="2"
          />
        </svg>
      </template>

      <!-- ═══════════════════════════════════════════════════
           3RD PLACE  (below the final, centered)
      ════════════════════════════════════════════════════════ -->
      <template v-if="tournament.hasThirdPlace && thirdPlaceMatch">
        <div
          class="round-title tp-title"
          :style="{
            position: 'absolute',
            top: finalCardTop + CARD_H + 'px',
            left: finalX + 'px',
            width: CARD_W + 'px',
          }"
        >
          3rd Place
        </div>
        <div
          class="tp-card"
          :style="{
            position: 'absolute',
            top: finalCardTop + CARD_H + 30 + 'px',
            left: finalX + 'px',
            width: CARD_W + 'px',
          }"
        >
          <template v-if="!thirdPlaceMatch.homeId || !thirdPlaceMatch.awayId">
            <div class="tp-waiting">Waiting for semi-finals…</div>
          </template>
          <template v-else>
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
                  <input v-model.number="tpPH" type="number" min="0" class="tp-inp tp-inp--pen" />
                </template>
                <template v-else>
                  <span v-if="thirdPlaceMatch.result" class="tp-sc">
                    {{ thirdPlaceMatch.result.home }}
                    <span v-if="thirdPlaceMatch.result.penHome !== undefined" class="tp-pen-sup">
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
                  <input v-model.number="tpPA" type="number" min="0" class="tp-inp tp-inp--pen" />
                </template>
                <template v-else>
                  <span v-if="thirdPlaceMatch.result" class="tp-sc">
                    {{ thirdPlaceMatch.result.away }}
                    <span v-if="thirdPlaceMatch.result.penAway !== undefined" class="tp-pen-sup">
                      [{{ thirdPlaceMatch.result.penAway }}p]
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
                <button class="icon-btn" @click="emit('sim-third-place')">
                  <Shuffle :size="11" />
                </button>
              </template>
            </div>
          </template>
        </div>
      </template>

      <!-- ═══════════════════════════════════════════════════
           CHAMPION BANNER
      ════════════════════════════════════════════════════════ -->
      <template v-if="champion">
        <div
          class="champ-banner"
          :style="{
            position: 'absolute',
            top: champBannerTop + 'px',
            left: finalX + 'px',
            width: CARD_W + 'px',
          }"
        >
          <span class="champ-trophy">🏆</span>
          <span class="champ-label">Champion</span>
          <TeamBadge :team-id="champion.id" :teams="teams" class="champ-badge" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bracket-wrap {
  /* overflow handled by BracketPanel pan/zoom layer */
  width: max-content;
  padding: 8px 16px 16px;
}

.bracket {
  position: relative;
  flex-shrink: 0;
  min-width: fit-content;
}

/* ── Round title ── */
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
}
.final-title {
  color: #c9a227 !important;
}
.tp-title {
  color: var(--accent-2);
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
.tp-waiting {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px 8px;
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

/* ── Champion banner ── */
.champ-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, #c9a227 14%, var(--surface)),
    color-mix(in srgb, #c9a227 6%, var(--surface))
  );
  border: 1px solid color-mix(in srgb, #c9a227 45%, var(--border-light));
  border-radius: var(--radius);
  box-shadow:
    0 0 0 1px color-mix(in srgb, #c9a227 20%, transparent),
    0 2px 12px color-mix(in srgb, #c9a227 18%, transparent);
  animation: champ-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  box-sizing: border-box;
}

.champ-trophy {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.champ-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #c9a227;
  flex-shrink: 0;
}

.champ-badge {
  font-weight: 700;
  font-size: 13px;
  min-width: 0;
  flex: 1;
}

@keyframes champ-appear {
  from {
    opacity: 0;
    transform: scale(0.85) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
