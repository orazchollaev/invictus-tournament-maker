<script setup lang="ts">
import { useI18n } from "vue-i18n"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

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
            <strong class="team-cell">
              <TeamBadge
                :team="{ name: entry.champName, color: entry.champColor, flag: entry.champFlag }"
              />
            </strong>
          </td>
          <td class="col-score muted">{{ entry.score }}</td>
          <td>
            <TeamBadge
              class="team-cell muted"
              :team="{ name: entry.runnerName, color: entry.runnerColor, flag: entry.runnerFlag }"
            />
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
