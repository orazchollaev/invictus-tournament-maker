<script setup lang="ts">
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppCard, AppIcon } from "@/components/ui"
import type { Tournament } from "@/modules/tournament/types"

defineProps<{ wins: Tournament[] }>()

const { t } = useI18n()
</script>

<template>
  <AppCard :title="t('teams.detail.tournamentTitles')">
    <div v-for="tw in wins" :key="tw.id" class="trophy-row">
      <AppIcon :icon="Trophy" size="md" class="trophy-icon" />
      <span class="trophy-name">{{ tw.name }}</span>
      <span class="trophy-season">{{ t("teams.detail.seasonN", { n: tw.season }) }}</span>
    </div>
  </AppCard>
</template>

<style scoped>
.trophy-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border-light);
  font-size: var(--fs-base);
}
.trophy-row:last-child {
  border-bottom: none;
}

.trophy-icon {
  color: var(--medal-gold);
}

.trophy-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trophy-season {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}
</style>
