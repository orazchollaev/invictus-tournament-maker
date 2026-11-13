<script setup lang="ts">
import { computed } from "vue"
import { useProgressiveCount } from "@/composables/useProgressiveCount"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import GroupCard from "./GroupCard.vue"
import GroupLegend from "./GroupLegend.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

// 32 groups is ~2,400 nodes; mounting them all in one go froze slow phones
// right after the draw. A phone screen shows about three cards.
const shown = useProgressiveCount(() => props.tournament.groups?.length ?? 0, {
  initial: 4,
  step: 4,
})
const visibleGroups = computed(() => (props.tournament.groups ?? []).slice(0, shown.value))
</script>

<template>
  <div class="gs-wrap">
    <div class="gs-groups">
      <GroupCard
        v-for="(group, gi) in visibleGroups"
        :key="gi"
        :group="group"
        :teams="teams"
        :qualifiers-per-group="tournament.qualifiersPerGroup ?? 2"
        :wildcard-count="tournament.wildcardCount ?? 0"
      />
    </div>

    <!-- Held back until the last card is in, so it does not sit mid-list and jump. -->
    <GroupLegend
      v-if="visibleGroups.length === (tournament.groups?.length ?? 0)"
      :wildcard-count="tournament.wildcardCount ?? 0"
    />
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
