<script setup lang="ts">
/** Simple initial-on-colour avatar — no photo picker for the basic player model. */
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    name: string
    color: string
    size?: number
  }>(),
  { size: 28 }
)

const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || "?")
</script>

<template>
  <span
    class="player-avatar"
    :style="{
      background: color,
      width: size + 'px',
      height: size + 'px',
      fontSize: size * 0.42 + 'px',
    }"
  >
    {{ initial }}
  </span>
</template>

<style scoped>
.player-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  color: #fff;
  font-weight: 700;
  font-family: var(--font-ui);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.15);
}
</style>
