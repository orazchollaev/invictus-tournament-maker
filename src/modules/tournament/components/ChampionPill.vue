<script setup lang="ts">
/**
 * "🏆 Team" — a tournament's (or a series' latest) champion, for the trail of
 * a list row.
 */
import { Trophy } from "@lucide/vue"
import { AppIcon } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"

defineProps<{ team: Team }>()
</script>

<template>
  <span class="champion">
    <AppIcon :icon="Trophy" size="xs" class="champion-icon" />
    <TeamBadge :team="team" :size="12" />
  </span>
</template>

<style scoped>
.champion {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  max-width: 140px;
  min-width: 0;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-pill);
  background: var(--fill-1);
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text);
}

.champion-icon {
  flex-shrink: 0;
  color: var(--gold);
}
</style>
