<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppCard, AppChip, AppTable } from "@/components/ui"
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

const props = defineProps<{ finals: FinalEntry[] }>()

const { t } = useI18n()

/** Newest season first. Reversed here rather than in the template so the
    array isn't copied on every render. */
const rows = computed(() => [...props.finals].reverse())
</script>

<template>
  <AppCard>
    <AppTable>
      <thead>
        <tr>
          <th class="col-season">{{ t("history.table.season") }}</th>
          <th>{{ t("history.table.champion") }}</th>
          <th class="col-score">{{ t("history.table.result") }}</th>
          <th>{{ t("history.table.runnerUp") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in rows" :key="entry.season">
          <td class="col-season">
            <AppChip square>S{{ entry.season }}</AppChip>
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
    </AppTable>
  </AppCard>
</template>

<style scoped>
.col-season {
  width: 72px;
}
.col-score {
  width: 140px;
  font-size: var(--fs-sm);
  font-family: var(--font-ui);
}
</style>
