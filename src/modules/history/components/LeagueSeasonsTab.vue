<script setup lang="ts">
import { computed } from "vue"
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppCard, AppChip, AppTable } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { LeagueSeasonEntry } from "../types"

const props = defineProps<{ seasons: LeagueSeasonEntry[] }>()

const { t } = useI18n()

/** Newest season first. */
const rows = computed(() => [...props.seasons].reverse())
</script>

<template>
  <AppCard>
    <AppTable>
      <thead>
        <tr>
          <th class="col-season">{{ t("history.table.season") }}</th>
          <th>{{ t("history.table.champion") }}</th>
          <th>{{ t("history.table.runnerUp") }}</th>
          <th>{{ t("history.table.thirdPlace") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in rows" :key="entry.season">
          <td class="col-season">
            <AppChip square>S{{ entry.season }}</AppChip>
          </td>
          <td>
            <div v-if="entry.first" class="team-cell">
              <strong><TeamBadge :team="entry.first" /></strong>
              <span class="pts-badge">
                <Trophy :size="12" />
                {{ entry.first.pts }} pts
              </span>
            </div>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <div v-if="entry.second" class="team-cell muted">
              <TeamBadge :team="entry.second" />
              <span class="pts-label">{{ entry.second.pts }} pts</span>
            </div>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <div v-if="entry.third" class="team-cell muted">
              <TeamBadge :team="entry.third" />
              <span class="pts-label">{{ entry.third.pts }} pts</span>
            </div>
            <span v-else class="muted">—</span>
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
.pts-badge,
.pts-label {
  font-size: var(--fs-xs);
  font-family: var(--font-ui);
  margin-left: var(--sp-1);
}
.pts-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent);
  font-weight: 600;
}
.pts-label {
  color: var(--text-muted);
}
</style>
