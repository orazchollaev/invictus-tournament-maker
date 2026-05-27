<script setup lang="ts">
export interface FinalEntry {
  season: number
  champName: string
  champColor: string
  runnerName: string
  runnerColor: string
  score: string
}

defineProps<{ finals: FinalEntry[] }>()
</script>

<template>
  <div class="section-box">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-season">Season</th>
          <th>Champion</th>
          <th class="col-score">Result</th>
          <th>Runner-up</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in [...finals].reverse()" :key="entry.season">
          <td class="col-season">
            <span class="season-badge">S{{ entry.season }}</span>
          </td>
          <td>
            <div class="team-cell">
              <span class="color-dot" :style="{ background: entry.champColor }" />
              <strong>{{ entry.champName }}</strong>
            </div>
          </td>
          <td class="col-score muted">{{ entry.score }}</td>
          <td>
            <div class="team-cell muted">
              <span class="color-dot" :style="{ background: entry.runnerColor }" />
              {{ entry.runnerName }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.section-box {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 10px 14px 9px;
  border-bottom: 1px solid var(--border-light);
  font-family: var(--font-ui);
}
.data-table td {
  padding: 9px 14px;
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}

.col-season {
  width: 72px;
}
.col-score {
  width: 140px;
  font-size: 12px;
  font-family: var(--font-ui);
}

.season-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 2px;
  padding: 1px 6px;
  font-family: var(--font-ui);
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.color-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
}
.muted {
  color: var(--text-muted);
}
</style>
