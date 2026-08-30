<script setup lang="ts">
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppCard, AppTable } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import type { ChampEntry } from "../types"

defineProps<{ champions: ChampEntry[]; finalsLabel?: string }>()

const { t } = useI18n()
</script>

<template>
  <AppCard>
    <AppTable>
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
              <Trophy :size="12" />
              {{ entry.wins }}
            </span>
            <span v-else class="muted">—</span>
          </td>
          <td class="col-num muted">{{ entry.finals }}</td>
        </tr>
      </tbody>
    </AppTable>
  </AppCard>
</template>

<style scoped>
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
  gap: var(--sp-1);
  color: var(--accent);
  font-weight: 700;
}
</style>
