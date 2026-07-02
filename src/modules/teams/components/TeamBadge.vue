<script setup lang="ts">
import { computed } from "vue"
import type { Team, TeamLike } from "../types"
import TeamNameAuto from "./TeamNameAuto.vue"
import FlagCircle from "./FlagCircle.vue"

const props = withDefaults(
  defineProps<{
    teamId?: string | null
    teams?: Team[]
    team?: Team | TeamLike | null
    size?: number
    reverse?: boolean
    fallback?: string
  }>(),
  { size: 14, reverse: false, fallback: "TBD" }
)
const team = computed(() => props.team ?? props.teams?.find((t) => t.id === props.teamId))
</script>

<template>
  <span class="team-badge" :class="{ reverse }">
    <FlagCircle v-if="team?.flag" :code="team.flag" :size="size" />
    <span
      v-else
      class="dot"
      :style="{ background: team?.color ?? '#ccc', width: size + 'px', height: size + 'px' }"
    />
    <TeamNameAuto :team="team" :fallback="fallback" class="name" />
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
.team-badge.reverse {
  flex-direction: row-reverse;
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.15);
}
.name {
  font-size: 12px;
  flex: 1;
  min-width: 0;
}
</style>
