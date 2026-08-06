<script setup lang="ts">
/**
 * The uppercase muted label with a 3px accent rule. Existed as four
 * separate copies (`.section-box h2`, `.stats-panel-header`,
 * `.chart-header`, `.srp-card-title`) with four different paddings —
 * plus `.gs-group-header`, which the tournament group cards carried.
 *
 * `AppCard` renders this internally when given a `title`; use this
 * component directly only when the header sits outside a card.
 */
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
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg);
}

/* Flex, because titles routinely carry a leading icon alongside the label. */
.section-header-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent);
}

.section-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .section-header {
    padding: var(--sp-2) var(--sp-3);
  }
}
</style>
