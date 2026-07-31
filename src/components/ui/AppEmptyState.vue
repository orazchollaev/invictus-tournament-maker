<script setup lang="ts">
/**
 * Empty/zero state. `TeamsPage` and `TournamentsPage` carried byte-identical
 * copies of this markup and CSS.
 */
import type { Component } from "vue"

defineProps<{
  icon?: Component
  title?: string
  description?: string
}>()
</script>

<template>
  <div class="empty">
    <component :is="icon" v-if="icon" :size="40" class="empty-icon" />
    <p v-if="title" class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot />
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-7) var(--sp-4);
  text-align: center;
  animation: scale-in var(--dur-slow) var(--ease);
}

.empty-icon {
  color: var(--text-muted);
  opacity: 0.5;
  animation: float 3s var(--ease) infinite;
}

.empty-title {
  margin: 0;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
}

.empty-desc {
  margin: 0;
  max-width: 40ch;
  font-size: var(--fs-base);
  color: var(--text-muted);
}

.empty-action {
  margin-top: var(--sp-2);
}

@media (prefers-reduced-motion: reduce) {
  .empty,
  .empty-icon {
    animation: none;
  }
}
</style>
