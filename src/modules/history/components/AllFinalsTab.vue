<script setup lang="ts">
import { useI18n } from "vue-i18n"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"

export interface FinalEntry {
  season: number
  champName: string
  champColor: string
  champFlag?: string
  runnerName: string
  runnerColor: string
  runnerFlag?: string
  score: string
}

defineProps<{ finals: FinalEntry[] }>()

const { t } = useI18n()
</script>

<template>
  <div class="section-box">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-season">{{ t("history.table.season") }}</th>
          <th>{{ t("history.table.champion") }}</th>
          <th class="col-score">{{ t("history.table.result") }}</th>
          <th>{{ t("history.table.runnerUp") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in [...finals].reverse()" :key="entry.season">
          <td class="col-season">
            <span class="season-badge">S{{ entry.season }}</span>
          </td>
          <td>
            <div class="team-cell">
              <FlagCircle v-if="entry.champFlag" :code="entry.champFlag" :size="14" />
              <span v-else class="color-dot" :style="{ background: entry.champColor }" />
              <strong>{{ entry.champName }}</strong>
            </div>
          </td>
          <td class="col-score muted">{{ entry.score }}</td>
          <td>
            <div class="team-cell muted">
              <FlagCircle v-if="entry.runnerFlag" :code="entry.runnerFlag" :size="14" />
              <span v-else class="color-dot" :style="{ background: entry.runnerColor }" />
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
  overflow: hidden;
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
  border-radius: var(--radius);
  padding: 1px 6px;
  font-family: var(--font-ui);
}
</style>
