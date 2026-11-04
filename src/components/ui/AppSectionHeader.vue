<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="section-header">
    <h2 class="section-header-title">
      <slot>{{ title }}</slot>
    </h2>

    <div v-if="$slots.actions" class="section-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
/* The grouped-list header: small, muted, uppercase, on the card's own fill. */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4) var(--sp-2);
  background: transparent;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.section-header-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .section-header {
    padding: var(--sp-2) var(--sp-3);
  }
}
</style>
