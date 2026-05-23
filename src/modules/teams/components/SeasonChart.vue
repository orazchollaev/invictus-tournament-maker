<script setup lang="ts">
import { computed } from "vue"

export interface SeasonStat {
  label: string
  wins: number
  draws: number
  losses: number
}

const props = defineProps<{
  stats: SeasonStat[]
}>()

const VIEW_W = 600
const LEFT_PAD = 136
const RIGHT_PAD = 8
const BAR_AREA = VIEW_W - LEFT_PAD - RIGHT_PAD
const ROW_H = 34
const BAR_H = 18
const TOP_PAD = 4

const svgHeight = computed(() => TOP_PAD * 2 + props.stats.length * ROW_H)

function barY(i: number) {
  return TOP_PAD + i * ROW_H + (ROW_H - BAR_H) / 2
}

function labelY(i: number) {
  return TOP_PAD + i * ROW_H + ROW_H / 2
}

interface Segment {
  x: number
  width: number
  color: string
  count: number
  key: string
}

function segments(stat: SeasonStat): Segment[] {
  const total = stat.wins + stat.draws + stat.losses
  if (total === 0) return []
  const wW = (stat.wins / total) * BAR_AREA
  const dW = (stat.draws / total) * BAR_AREA
  const lW = (stat.losses / total) * BAR_AREA
  const result: Segment[] = []
  if (stat.wins > 0)
    result.push({ x: LEFT_PAD, width: wW, color: "success", count: stat.wins, key: "w" })
  if (stat.draws > 0)
    result.push({ x: LEFT_PAD + wW, width: dW, color: "muted", count: stat.draws, key: "d" })
  if (stat.losses > 0)
    result.push({ x: LEFT_PAD + wW + dW, width: lW, color: "danger", count: stat.losses, key: "l" })
  return result
}

function truncate(text: string, max = 22): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text
}
</script>

<template>
  <div class="chart-wrap">
    <div class="chart-legend">
      <span class="leg-item">
        <span class="leg-dot leg-w" />
        W
      </span>
      <span class="leg-item">
        <span class="leg-dot leg-d" />
        D
      </span>
      <span class="leg-item">
        <span class="leg-dot leg-l" />
        L
      </span>
    </div>
    <svg :viewBox="`0 0 ${VIEW_W} ${svgHeight}`" :height="svgHeight" width="100%" class="chart-svg">
      <g v-for="(stat, i) in stats" :key="stat.label">
        <!-- Row background on hover -->
        <rect x="0" :y="TOP_PAD + i * ROW_H" :width="VIEW_W" :height="ROW_H" class="row-bg" />

        <!-- Label -->
        <text x="0" :y="labelY(i)" dominant-baseline="middle" class="bar-label">
          <title>{{ stat.label }}</title>
          {{ truncate(stat.label) }}
        </text>

        <!-- Empty track -->
        <rect :x="LEFT_PAD" :y="barY(i)" :width="BAR_AREA" :height="BAR_H" class="bar-track" />

        <!-- Stacked segments -->
        <g v-for="seg in segments(stat)" :key="seg.key">
          <rect
            :x="seg.x"
            :y="barY(i)"
            :width="seg.width"
            :height="BAR_H"
            :class="`seg-${seg.color}`"
          />
          <!-- Count label inside segment if wide enough -->
          <text
            v-if="seg.width >= 22"
            :x="seg.x + seg.width / 2"
            :y="barY(i) + BAR_H / 2"
            dominant-baseline="middle"
            text-anchor="middle"
            class="seg-label"
          >
            {{ seg.count }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.chart-wrap {
  width: 100%;
  overflow: hidden;
}

.chart-legend {
  display: flex;
  gap: 14px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.leg-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}

.leg-w {
  background: var(--success);
}
.leg-d {
  background: var(--text-muted);
}
.leg-l {
  background: var(--danger);
}

.chart-svg {
  display: block;
  overflow: visible;
}

.row-bg {
  fill: transparent;
}

.row-bg:hover {
  fill: color-mix(in srgb, var(--accent) 4%, transparent);
}

.bar-label {
  font-size: 11px;
  fill: var(--text-muted);
  font-family: var(--font-ui);
}

.bar-track {
  fill: var(--border-light);
  rx: 2;
}

.seg-success {
  fill: var(--success);
}
.seg-muted {
  fill: var(--text-muted);
}
.seg-danger {
  fill: var(--danger);
}

rect.seg-success,
rect.seg-muted,
rect.seg-danger {
  rx: 2;
}

.seg-label {
  font-size: 10px;
  fill: #fff;
  font-family: var(--font-ui);
  font-weight: 600;
  pointer-events: none;
}
</style>
