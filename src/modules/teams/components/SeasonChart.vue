<script setup lang="ts">
export interface SeasonStat {
  label: string
  wins: number
  draws: number
  losses: number
}

defineProps<{ stats: SeasonStat[] }>()

function winRate(s: SeasonStat) {
  const total = s.wins + s.draws + s.losses
  return total > 0 ? Math.round((s.wins / total) * 100) : 0
}

function pct(n: number, s: SeasonStat) {
  const total = s.wins + s.draws + s.losses
  return total > 0 ? (n / total) * 100 : 0
}
</script>

<template>
  <div class="season-chart">
    <div class="chart-header">
      <span class="col-label">Season</span>
      <span class="col-bar" />
      <span class="col-wdl">
        <span class="wdl-w">W</span>
        <span class="wdl-d">D</span>
        <span class="wdl-l">L</span>
      </span>
      <span class="col-pct">Win%</span>
    </div>

    <div v-for="s in stats" :key="s.label" class="chart-row">
      <span class="col-label season-label" :title="s.label">{{ s.label }}</span>

      <span class="col-bar">
        <span class="bar-track">
          <span class="bar-seg seg-w" :style="{ width: pct(s.wins, s) + '%' }" />
          <span class="bar-seg seg-d" :style="{ width: pct(s.draws, s) + '%' }" />
          <span class="bar-seg seg-l" :style="{ width: pct(s.losses, s) + '%' }" />
        </span>
      </span>

      <span class="col-wdl">
        <span class="wdl-val wdl-w">{{ s.wins }}</span>
        <span class="wdl-val wdl-d">{{ s.draws }}</span>
        <span class="wdl-val wdl-l">{{ s.losses }}</span>
      </span>

      <span
        class="col-pct pct-val"
        :class="winRate(s) >= 60 ? 'pct-high' : winRate(s) <= 35 ? 'pct-low' : ''"
      >
        {{ winRate(s) }}%
      </span>
    </div>
  </div>
</template>

<style scoped>
.season-chart {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.chart-header,
.chart-row {
  display: grid;
  grid-template-columns: 140px 1fr 84px 42px;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}

.chart-header {
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 6px;
  margin-bottom: 2px;
}

.chart-row {
  border-radius: 4px;
  transition: background 0.1s;
}

.chart-row:hover {
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}

/* Columns */
.col-label {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.season-label {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text);
  font-size: 12px;
}

.col-bar {
  min-width: 0;
}

.bar-track {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--border-light);
  width: 100%;
}

.bar-seg {
  height: 100%;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.seg-w {
  background: var(--success);
}
.seg-d {
  background: var(--text-muted);
  opacity: 0.6;
}
.seg-l {
  background: var(--danger);
}

/* W/D/L */
.col-wdl {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.wdl-w,
.wdl-d,
.wdl-l {
  font-size: 11px;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
}

.col-label .wdl-w,
.col-label .wdl-d,
.col-label .wdl-l {
  font-weight: 600;
}

.wdl-w {
  color: var(--success);
}
.wdl-d {
  color: var(--text-muted);
}
.wdl-l {
  color: var(--danger);
}

.wdl-val {
  font-size: 12px;
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  font-family: var(--font-ui);
}

/* Win% */
.col-pct {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pct-val {
  font-size: 12px;
  font-family: var(--font-ui);
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.pct-high {
  color: var(--success);
}
.pct-low {
  color: var(--danger);
}
</style>
