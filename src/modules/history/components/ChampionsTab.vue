<script setup lang="ts">
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

export interface ChampEntry {
  teamId: string
  name: string
  color: string
  flag?: string
  wins: number
  finals: number
}

defineProps<{ champions: ChampEntry[]; finalsLabel?: string }>()

const { t } = useI18n()
</script>

<template>
  <div class="section-box">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th>{{ t("history.table.team") }}</th>
          <th class="col-num">{{ t("history.table.titles") }}</th>
          <th class="col-num">{{ finalsLabel ?? t("history.table.finals") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(entry, i) in champions" :key="entry.teamId">
          <td class="col-rank muted">{{ i + 1 }}</td>
          <td>
            <TeamBadge :team="entry" class="team-cell" />
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
  overflow: hidden;
}
.col-rank {
  width: 36px;
  text-align: center;
}
.col-num {
  width: 100px;
  text-align: center;
}
.win-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  font-weight: 700;
}
</style>
