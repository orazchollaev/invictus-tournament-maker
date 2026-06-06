<script setup lang="ts">
import { computed, ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import BracketMatchCard from "./BracketMatchCard.vue"
import BracketThirdPlaceCard from "./BracketThirdPlaceCard.vue"
import { getWinnerId } from "@/engine"
import { type DisplayMatch, type ConnInfo, buildConnInfo, teamColor } from "./bracketUtils"
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

const numRounds = computed(() => displayRounds.value.length)
const nonFinalCount = computed(() => Math.max(0, numRounds.value - 1))
const finalRi = computed(() => numRounds.value - 1)

function lCount(ri: number): number {
  return Math.floor((displayRounds.value[ri]?.length ?? 0) / 2)
}
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

const bracketH = computed(() => {
  if (nonFinalCount.value === 0) return CARD_H
  const n = lCount(0)
  return n <= 0 ? CARD_H : n * CARD_H + (n - 1) * CARD_GAP
})

function matchCenterY(ri: number, miLocal: number): number {
  const count = ri === finalRi.value ? 1 : lCount(ri) || 1
  const slot = bracketH.value / count
  return slot * miLocal + slot / 2
}

const totalW = computed(() =>
  nonFinalCount.value === 0 ? CARD_W : 2 * nonFinalCount.value * (CARD_W + COL_GAP) + CARD_W
)

function lColX(ri: number): number {
  return ri * (CARD_W + COL_GAP)
}
const finalX = computed(() => nonFinalCount.value * (CARD_W + COL_GAP))
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

const champBannerTop = computed(() => HEADER_H + bracketH.value / 2 + CARD_H / 2 + -120)

const containerH = computed(() => {
  let h = HEADER_H + bracketH.value
  if (props.tournament.hasThirdPlace && thirdPlaceMatch.value) {
    h += TP_GAP + HEADER_H + CARD_H
  }
  if (champion.value) {
    h = Math.max(h + 8, champBannerTop.value + CHAMP_H + 8)
  }
  return h
})

// ── Hover helpers ─────────────────────────────────────────────
function isMatchDimmed(ri: number, mi: number): boolean {
  if (!settings.bracketHighlightOnHover || !hoveredTeamId.value) return false
  const m = displayRounds.value[ri]?.[mi]
  return m?.homeId !== hoveredTeamId.value && m?.awayId !== hoveredTeamId.value
}

function isFinalDimmed(): boolean {
  if (!settings.bracketHighlightOnHover || !hoveredTeamId.value) return false
  const m = displayRounds.value[finalRi.value]?.[0]
  return m?.homeId !== hoveredTeamId.value && m?.awayId !== hoveredTeamId.value
}

// ── SVG connectors ────────────────────────────────────────────
// Left-side connectors (matches 0..lCount-1)
function connInfosL(ri: number): ConnInfo[] {
  const nextCount = lCount(ri + 1)
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

// Right-side connectors (matches rStart..end)
function connInfosR(ri: number): ConnInfo[] {
  const nextCount = lCount(ri + 1)
  const offset = rStart(ri)
  return Array.from({ length: nextCount }, (_, ci) =>
    buildConnInfo(
      ri,
      ci,
      displayRounds.value,
      props.teams,
      matchCenterY,
      hoveredTeamId.value,
      settings.bracketHighlightOnHover,
      offset,
      settings.bracketConnectorColors
    )
  )
}

// Segment builder for left-side connectors (arms go right → center)
function segsL(p: ConnInfo, w: number) {
  const m = w / 2
  const yMid = (p.ay + p.by) / 2
  const base = p.active ? "var(--accent)" : "var(--border)"
  const baseOp = p.active ? 0.55 : 0.4
  const dimOp = 0.08
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
    { d: `M0,${p.ay} H${m}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M0,${p.by} H${m}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${m},${p.ay} V${yMid}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M${m},${yMid} V${p.by}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${m},${yMid - 1} H${w}`, stroke: p.topColor ?? base, opacity: topOp, w: 1.5 },
    { d: `M${m},${yMid + 1} H${w}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 1.5 },
  ]
}

// Segment builder for right-side connectors (arms go left → center)
function segsR(p: ConnInfo, w: number) {
  const m = w / 2
  const yMid = (p.ay + p.by) / 2
  const base = p.active ? "var(--accent)" : "var(--border)"
  const baseOp = p.active ? 0.55 : 0.4
  const dimOp = 0.08
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
    { d: `M${w},${p.ay} H${m}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M${w},${p.by} H${m}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${m},${p.ay} V${yMid}`, stroke: p.topColor ?? base, opacity: topOp, w: 2 },
    { d: `M${m},${yMid} V${p.by}`, stroke: p.bottomColor ?? base, opacity: botOp, w: 2 },
    { d: `M${m},${yMid - 1} H0`, stroke: p.topColor ?? base, opacity: topOp, w: 1.5 },
    { d: `M${m},${yMid + 1} H0`, stroke: p.bottomColor ?? base, opacity: botOp, w: 1.5 },
  ]
}

// Final connector line color (left/right innermost → final)
function finalLineColor(side: "home" | "away"): string {
  if (!settings.bracketConnectorColors)
    return side === "home"
      ? displayRounds.value[finalRi.value]?.[0]?.homeId
        ? "var(--accent)"
        : "var(--border)"
      : displayRounds.value[finalRi.value]?.[0]?.awayId
        ? "var(--accent)"
        : "var(--border)"
  const finalMatch = displayRounds.value[finalRi.value]?.[0]
  const teamId = side === "home" ? finalMatch?.homeId : finalMatch?.awayId
  return teamColor(teamId, props.teams) ?? (teamId ? "var(--accent)" : "var(--border)")
}

function finalLineOpacity(side: "home" | "away"): number {
  const finalMatch = displayRounds.value[finalRi.value]?.[0]
  const teamId = side === "home" ? finalMatch?.homeId : finalMatch?.awayId
  if (!teamId) return 0.4
  if (settings.bracketHighlightOnHover && hoveredTeamId.value) {
    return hoveredTeamId.value === teamId ? 0.9 : 0.1
  }
  return teamColor(teamId, props.teams) ? 0.85 : 0.55
}
</script>

<template>
  <div class="bracket-wrap">
    <div class="bracket" :style="{ width: totalW + 'px', height: containerH + 'px' }">
      <!-- ═══════════════════════════════════════════════════
           LEFT SIDE  (rounds 0 → nonFinalCount-1, first-half matches)
      ════════════════════════════════════════════════════════ -->
      <template v-for="n in nonFinalCount" :key="'L' + n">
        <div
          class="round-title"
          :style="{ position: 'absolute', top: 0, left: lColX(n - 1) + 'px', width: CARD_W + 'px' }"
        >
          {{ allRounds[n - 1].name }}
        </div>

        <BracketMatchCard
          v-for="(match, mi) in displayRounds[n - 1].slice(0, lCount(n - 1))"
          :key="match.id"
          :match="match"
          :teams="teams"
          :is-final="false"
          :is-exporting="isExporting"
          :dimmed="isMatchDimmed(n - 1, mi)"
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
          @hover-team="
            (id) => {
              hoveredTeamId = id
            }
          "
        />

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
          <template v-for="(p, pi) in connInfosL(n - 1)" :key="pi">
            <path
              v-for="(seg, si) in segsL(p, COL_GAP)"
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
          fill="none"
          stroke-width="2"
          :style="{
            stroke: finalLineColor('home'),
            strokeOpacity: finalLineOpacity('home'),
            transition: 'stroke-opacity 0.2s ease, stroke 0.2s ease',
          }"
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
        :is-exporting="isExporting"
        :dimmed="isFinalDimmed()"
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
        @hover-team="
          (id) => {
            hoveredTeamId = id
          }
        "
      />

      <!-- ═══════════════════════════════════════════════════
           RIGHT SIDE  (rounds 0 → nonFinalCount-1, second-half matches)
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
          fill="none"
          stroke-width="2"
          :style="{
            stroke: finalLineColor('away'),
            strokeOpacity: finalLineOpacity('away'),
            transition: 'stroke-opacity 0.2s ease, stroke 0.2s ease',
          }"
        />
      </svg>

      <template v-for="n in nonFinalCount" :key="'R' + n">
        <div
          class="round-title"
          :style="{ position: 'absolute', top: 0, left: rColX(n - 1) + 'px', width: CARD_W + 'px' }"
        >
          {{ allRounds[n - 1].name }}
        </div>

        <BracketMatchCard
          v-for="(match, mi) in displayRounds[n - 1].slice(rStart(n - 1))"
          :key="match.id"
          :match="match"
          :teams="teams"
          :is-final="false"
          :is-exporting="isExporting"
          :dimmed="isMatchDimmed(n - 1, rStart(n - 1) + mi)"
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
          @hover-team="
            (id) => {
              hoveredTeamId = id
            }
          "
        />

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
          <template v-for="(p, pi) in connInfosR(n - 1)" :key="pi">
            <path
              v-for="(seg, si) in segsR(p, COL_GAP)"
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
        <BracketThirdPlaceCard
          :match="thirdPlaceMatch!"
          :teams="teams"
          :style="{
            position: 'absolute',
            top: finalCardTop + CARD_H + 30 + 'px',
            left: finalX + 'px',
            width: CARD_W + 'px',
          }"
          @set-result="(h, a, ph, pa) => emit('set-third-place-result', h, a, ph, pa)"
          @sim="emit('sim-third-place')"
        />
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
  width: max-content;
  padding: 8px 16px 16px;
}

.bracket {
  position: relative;
  flex-shrink: 0;
  min-width: fit-content;
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
}
.final-title {
  color: #c9a227 !important;
}
.tp-title {
  color: var(--accent-2);
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
