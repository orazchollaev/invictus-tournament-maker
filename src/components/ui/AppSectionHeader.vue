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
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg);
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

/* ── Design languages ────────────────────────────────────────────
   iOS: the grouped-list header — small, muted, uppercase, sitting on the
   card's own fill rather than in a tinted strip. */
[data-design="ios"] .section-header {
  background: transparent;
  padding-bottom: var(--sp-2);
}
[data-design="ios"] .section-header-title {
  color: var(--text-muted);
  letter-spacing: 0.04em;
}

/* M3: a title in sentence case, in the text colour, no strip. */
[data-design="android"] .section-header {
  background: transparent;
}
[data-design="android"] .section-header-title {
  font-size: var(--fs-base);
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--text);
}

@media (max-width: 600px) {
  .section-header {
    padding: var(--sp-2) var(--sp-3);
  }
}
</style>
