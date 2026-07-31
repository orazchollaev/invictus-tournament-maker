<script setup lang="ts">
/** A single trigger inside `AppTabs`. */
import { TabsTrigger } from "reka-ui"

defineProps<{
  value: string
  disabled?: boolean
}>()
</script>

<template>
  <TabsTrigger class="tab" :value="value" :disabled="disabled">
    <slot />
  </TabsTrigger>
</template>

<style scoped>
.tab {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-4);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin-bottom: -1px;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.tab:hover:not(:disabled) {
  color: var(--text);
}

.tab[data-state="active"] {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.tab:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Compact variant, set by the parent's size modifier. */
:global(.tabs--sm) .tab {
  padding: var(--sp-1) var(--sp-3);
  font-size: var(--fs-sm);
}

@media (max-width: 640px) {
  .tab {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-sm);
    flex-shrink: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab {
    transition: none;
  }
}
</style>
