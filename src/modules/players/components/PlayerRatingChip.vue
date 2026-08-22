<script setup lang="ts">
/**
 * A match rating, 1.0-10.0. The band colour is the whole point: a table
 * of thirty ratings should be readable at a glance without comparing
 * digits, so the number carries its own verdict.
 */
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    rating: number
    size?: "sm" | "md"
  }>(),
  { size: "sm" }
)

const band = computed(() => {
  if (props.rating >= 8) return "great"
  if (props.rating >= 7) return "good"
  if (props.rating >= 6) return "fair"
  return "poor"
})

const display = computed(() => props.rating.toFixed(1))
</script>

<template>
  <span class="rating" :class="[`rating--${band}`, `rating--${size}`]">{{ display }}</span>
</template>

<style scoped>
.rating {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4em;
  padding: 2px var(--sp-2);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  border: 1px solid transparent;
}

.rating--sm {
  font-size: var(--fs-sm);
}
.rating--md {
  font-size: var(--fs-md);
}

.rating--great {
  color: var(--on-accent);
  background: var(--success);
}
.rating--good {
  color: var(--accent);
  background: var(--accent-subtle);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
}
.rating--fair {
  color: var(--text);
  background: var(--bg-hover);
}
.rating--poor {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}
</style>
