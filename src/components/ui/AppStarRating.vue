<script setup lang="ts">
/**
 * Read-only half-star display. Purely cosmetic: the caller passes any 0-5
 * float (e.g. team power rescaled), this only renders it — it never becomes
 * the source of truth for a value stored elsewhere.
 */
import { computed } from "vue"
import { Star } from "@lucide/vue"

const props = withDefaults(defineProps<{ value: number; size?: number }>(), { size: 14 })

const fills = computed(() =>
  Array.from({ length: 5 }, (_, i) => Math.max(0, Math.min(1, props.value - i)))
)
</script>

<template>
  <span class="star-rating" :title="`${value.toFixed(1)} / 5`">
    <span
      v-for="(fill, i) in fills"
      :key="i"
      class="star"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <Star :size="size" class="star-outline" />
      <span class="star-fill" :style="{ width: `${fill * 100}%` }">
        <Star :size="size" fill="currentColor" class="star-icon" />
      </span>
    </span>
  </span>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.star {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.star-outline {
  display: block;
  color: var(--border);
}

.star-fill {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: var(--warning);
}

.star-icon {
  display: block;
}
</style>
