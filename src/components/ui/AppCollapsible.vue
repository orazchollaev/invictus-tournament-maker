<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from "reka-ui"
import { ChevronDown } from "@lucide/vue"

/** A titled section that folds its content away, closed by default. */
defineProps<{ title: string }>()

const open = defineModel<boolean>("open", { default: false })
</script>

<template>
  <CollapsibleRoot v-model:open="open" class="collapsible">
    <CollapsibleTrigger class="collapsible-trigger">
      <span>{{ title }}</span>
      <ChevronDown :size="14" class="collapsible-icon" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <slot />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>

<style scoped>
.collapsible {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.collapsible-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  box-shadow: none;
  cursor: pointer;
  font-size: var(--fs-sm);
  font-weight: 700;
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-align: start;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.collapsible-trigger:hover {
  color: var(--text);
  border-color: var(--border);
}
.collapsible-trigger:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.collapsible-icon {
  flex-shrink: 0;
  transition: transform var(--dur-fast) var(--ease);
}
.collapsible-trigger[data-state="open"] .collapsible-icon {
  transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .collapsible-trigger,
  .collapsible-icon {
    transition: none;
  }
}
</style>
