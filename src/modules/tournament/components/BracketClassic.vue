<script setup lang="ts">
import { computed, ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import BracketMatchCard from "./BracketMatchCard.vue"
import BracketThirdPlaceCard from "./BracketThirdPlaceCard.vue"
import { type DisplayMatch, type ConnInfo, buildConnInfo } from "./bracketUtils"
import { useSettingsStore } from "@/modules/settings/store"

const props = defineProps<{ tournament: Tournament; teams: Team[]; isExporting?: boolean }>()
const settings = useSettingsStore()
const hoveredTeamId = ref<string | null>(null)
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

const thirdPlaceMatch = computed(() => props.tournament.thirdPlaceMatch ?? null)

// ── Bracket data ──────────────────────────────────────────────
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

// ── Hover helpers ─────────────────────────────────────────────
function isMatchDimmed(ri: number, mi: number): boolean {
  if (!settings.bracketHighlightOnHover || !hoveredTeamId.value) return false
  const m = displayRounds.value[ri]?.[mi]
  return m?.homeId !== hoveredTeamId.value && m?.awayId !== hoveredTeamId.value
}

// ── SVG connectors ────────────────────────────────────────────
function connectorInfos(ri: number): ConnInfo[] {
  const nextCount = displayRounds.value[ri + 1]?.length ?? 0
  return Array.from({ length: nextCount }, (_, ci) =>
    buildConnInfo(
      ri,
      ci,
      displayRounds.value,
      props.teams,
      matchCenterY,
      hoveredTeamId.value,
      settings.bracketHighlightOnHover,
      0,
      settings.bracketConnectorColors
    )
  )
}

function svgSegments(p: ConnInfo, w: number) {
  const mid = w / 2
  const yMid = (p.ay + p.by) / 2
  const base = p.active ? "var(--accent)" : "var(--border)"
  const baseOp = p.active ? 0.55 : 0.4
  const dimOp = 0.08

  // Per-strand opacity: dimmed connector → both dim; hover active → only the hovered side shows
  const topOp = p.dimmed
    ? dimOp
    : p.hoverActive
      ? p.topHovered
        ? 0.9
        : dimOp
      : p.topColor
        ? 0.85
        : baseOp
  const botOp = p.dimmed
    ? dimOp
    : p.hoverActive
      ? p.bottomHovered
        ? 0.9
        : dimOp
      : p.bottomColor
        ? 0.85
        : baseOp

  return [
    { d: `M0,${p.ay} H${mid}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M0,${p.by} H${mid}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${mid},${p.ay} V${yMid}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M${mid},${yMid} V${p.by}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${mid},${yMid - 1} H${w}`, stroke: p.topColor ?? base, opacity: topOp, w: 1.5 },
    { d: `M${mid},${yMid + 1} H${w}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 1.5 },
  ]
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
              :is-exporting="isExporting"
              :dimmed="isMatchDimmed(ri, mi)"
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
              @hover-team="
                (id) => {
                  hoveredTeamId = id
                }
              "
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
            <template v-for="(p, pi) in connectorInfos(ri)" :key="pi">
              <path
                v-for="(seg, si) in svgSegments(p, COL_GAP)"
                :key="si"
                :d="seg.d"
                fill="none"
                :stroke-width="seg.w"
                :style="{
                  stroke: seg.stroke,
                  strokeOpacity: seg.opacity,
                  transition: 'stroke-opacity 0.2s ease, stroke 0.2s ease',
                }"
              />
            </template>
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
            <BracketThirdPlaceCard
              :match="thirdPlaceMatch!"
              :teams="teams"
              :style="{
                position: 'absolute',
                top: totalBracketH / 2 - CARD_H / 2 + 'px',
                left: 0,
                right: 0,
              }"
              @set-result="(h, a, ph, pa) => emit('set-third-place-result', h, a, ph, pa)"
              @sim="emit('sim-third-place')"
            />
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

.conn-col {
  flex-shrink: 0;
}

.tp-divider {
  width: 1px;
  background: var(--border-light);
  flex-shrink: 0;
  margin-left: 16px;
  margin-right: 16px;
  opacity: 0.5;
}
</style>
