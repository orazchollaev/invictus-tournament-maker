<script setup lang="ts">
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"

export interface LeagueSeasonEntry {
  season: number
  first: { name: string; color: string; pts: number } | null
  second: { name: string; color: string; pts: number } | null
  third: { name: string; color: string; pts: number } | null
}

defineProps<{ seasons: LeagueSeasonEntry[] }>()

const { t } = useI18n()
</script>

<template>
  <div class="section-box">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-season">{{ t("history.table.season") }}</th>
          <th>{{ t("history.table.champion") }}</th>
          <th>{{ t("history.table.runnerUp") }}</th>
          <th>{{ t("history.table.thirdPlace") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in [...seasons].reverse()" :key="entry.season">
          <td class="col-season">
            <span class="season-badge">S{{ entry.season }}</span>
          </td>
          <td>
            <div v-if="entry.first" class="team-cell">
              <span class="color-dot" :style="{ background: entry.first.color }" />
              <strong>{{ entry.first.name }}</strong>
              <span class="pts-badge">
                <Trophy :size="10" />
                {{ entry.first.pts }} pts
              </span>
            </div>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <div v-if="entry.second" class="team-cell muted">
              <span class="color-dot" :style="{ background: entry.second.color }" />
              {{ entry.second.name }}
              <span class="pts-label">{{ entry.second.pts }} pts</span>
            </div>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <div v-if="entry.third" class="team-cell muted">
              <span class="color-dot" :style="{ background: entry.third.color }" />
              {{ entry.third.name }}
              <span class="pts-label">{{ entry.third.pts }} pts</span>
            </div>
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.section-box {
  overflow: hidden;
}
.col-season {
  width: 72px;
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
.pts-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--accent);
  font-weight: 600;
  font-family: var(--font-ui);
  margin-left: 4px;
}
.pts-label {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-ui);
  margin-left: 4px;
}
</style>
