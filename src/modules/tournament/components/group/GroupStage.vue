<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import GroupCard from "./GroupCard.vue"
import GroupLegend from "./GroupLegend.vue"

defineProps<{
  tournament: Tournament
  teams: Team[]
}>()
</script>

<template>
  <div class="gs-wrap">
    <div class="gs-groups">
      <GroupCard
        v-for="(group, gi) in tournament.groups"
        :key="gi"
        :group="group"
        :teams="teams"
        :qualifiers-per-group="tournament.qualifiersPerGroup ?? 2"
        :wildcard-count="tournament.wildcardCount ?? 0"
      />
    </div>

    <GroupLegend :wildcard-count="tournament.wildcardCount ?? 0" />
  </div>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.gs-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: var(--sp-3);
}

@media (max-width: 600px) {
  .gs-groups {
    grid-template-columns: 1fr;
  }
}
</style>
