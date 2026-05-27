<script setup lang="ts">
import { Trophy } from "lucide-vue-next"

export interface ChampEntry {
  teamId: string
  name: string
  color: string
  wins: number
  finals: number
}

defineProps<{ champions: ChampEntry[] }>()
</script>

<template>
  <div class="section-box">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th>Team</th>
          <th class="col-num">Titles</th>
          <th class="col-num">Finals</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in champions" :key="entry.teamId">
          <td class="col-rank muted">{{ i + 1 }}</td>
          <td>
            <div class="team-cell">
              <span class="color-dot" :style="{ background: entry.color }" />
              {{ entry.name }}
            </div>
          </td>
          <td class="col-num">
            <span v-if="entry.wins > 0" class="win-count">
              <Trophy :size="11" />
              {{ entry.wins }}
            </span>
            <span v-else class="muted">—</span>
          </td>
          <td class="col-num muted">{{ entry.finals }}</td>
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

.col-rank {
  width: 36px;
  text-align: center;
}
.col-num {
  width: 100px;
  text-align: center;
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

.win-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 700;
}
.muted {
  color: var(--text-muted);
}
</style>
