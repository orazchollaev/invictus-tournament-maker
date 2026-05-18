<script setup lang="ts">
import { computed } from "vue"
import type { Team } from "../types"

const props = defineProps<{ teamId: string | null; teams: Team[] }>()
const team = computed(() => props.teams.find((t) => t.id === props.teamId))
</script>

<template>
  <span class="team-badge">
    <span class="dot" :style="{ background: team?.color ?? '#ccc' }" />
    <span class="name">{{ team?.name ?? "TBD" }}</span>
  </span>
</template>

<style scoped>
.team-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.15);
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
</style>
