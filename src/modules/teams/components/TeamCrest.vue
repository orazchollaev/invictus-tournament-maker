<script setup lang="ts">
/**
 * A team's crest on its own, no name: the uploaded image, else the flag, else
 * a dot in the team colour. For rows and headers that place the name
 * themselves; TeamBadge is the crest-plus-name pair.
 */
import { ref, watch } from "vue"
import type { Team, TeamLike } from "../types"
import { isDrawnCrest } from "../utils/imageUtils"
import FlagCircle from "./FlagCircle.vue"

const props = withDefaults(defineProps<{ team: Team | TeamLike; size?: number }>(), {
  size: 32,
})

const imgError = ref(false)
watch(
  () => props.team.image,
  () => {
    imgError.value = false
  }
)
</script>

<template>
  <img
    v-if="team.image && !imgError"
    :src="team.image"
    class="crest"
    :class="{ 'crest--drawn': isDrawnCrest(team.image) }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    alt=""
    @error="imgError = true"
  />
  <FlagCircle v-else-if="team.flag" :code="team.flag" :size="size" />
  <span
    v-else
    class="dot"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      borderWidth: `${Math.max(2, Math.round(size / 10))}px`,
      '--dot-color': team.color ?? 'var(--border)',
    }"
  />
</template>

<style scoped>
.crest,
.dot {
  flex-shrink: 0;
  border-radius: 50%;
}

.crest {
  display: block;
  object-fit: contain;
}
.crest--drawn {
  border-radius: 0;
}

.dot {
  box-sizing: border-box;
  border-style: solid;
  border-color: color-mix(in srgb, var(--dot-color) 65%, #000);
  background: var(--dot-color);
}
</style>
