<script setup lang="ts">
import { computed, ref, watch } from "vue"
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
  { size: 16, reverse: false, fallback: "TBD" }
)
const team = computed(() => props.team ?? props.teams?.find((t) => t.id === props.teamId))
const dotBorderWidth = computed(() => Math.max(1, Math.round(props.size / 6)))

const imgError = ref(false)
watch(
  () => team.value?.image,
  () => {
    imgError.value = false
  }
)
</script>

<template>
  <span class="team-badge" :class="{ reverse }">
    <img
      v-if="team?.image && !imgError"
      :src="team.image"
      class="crest-img"
      :style="{ width: size + 4 + 'px', height: size + 4 + 'px' }"
      alt=""
      @error="imgError = true"
    />
    <FlagCircle v-else-if="team?.flag" :code="team.flag" :size="size + 2" />
    <span
      v-else
      class="dot"
      :style="{
        '--dot-color': team?.color ?? '#ccc',
        width: size + 2 + 'px',
        height: size + 2 + 'px',
        borderWidth: dotBorderWidth + 'px',
      }"
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border-style: solid;
  border-color: color-mix(in srgb, var(--dot-color) 65%, #000);
  background: var(--dot-color);
}
.crest-img {
  border-radius: 50%;
  object-fit: contain;
  display: block;
  flex-shrink: 0;
}
.name {
  font-size: 12px;
  flex: 1;
  min-width: 0;
}
</style>
