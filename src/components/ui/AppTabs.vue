<script setup lang="ts">
/**
 * Page-level tabs — the underline family. Pairs with `AppTab`.
 *
 * This is the canonical implementation. The old global `.phase-tabs` strip
 * has been folded into the scoped `.tabs` below; `.phase-tab` stays global
 * because `AppTab` still wears it. `.gs-subtab`, the history tabs and
 * `.bracket-mobile-tab` all fold into this too.
 *
 * For *inline* one-of-N filters (the old `.fv-tab`, `.tier-tab`,
 * `.view-toggle-btn`, `.mode-toggle`, `.dc-speed-btn`) use `AppButtonGroup`
 * instead — that is the segmented-control role, not this one.
 */
import { TabsRoot, TabsList } from "reka-ui"

withDefaults(
  defineProps<{
    modelValue: string
    size?: "sm" | "md"
    /** Pin below the app header while the panel scrolls. */
    sticky?: boolean
    /** Reading direction, for locales that run right to left. */
    dir?: "ltr" | "rtl"
  }>(),
  { size: "md" }
)

defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <TabsRoot
    :model-value="modelValue"
    :dir="dir"
    @update:model-value="$emit('update:modelValue', String($event))"
  >
    <TabsList class="tabs" :class="[`tabs--${size}`, { 'tabs--sticky': sticky }]">
      <slot />
    </TabsList>
    <slot name="panel" />
  </TabsRoot>
</template>

<style scoped>
/* A segmented-control track; the segments are the global .phase-tab
   (assets/style/components.css). */
.tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  margin-bottom: var(--sp-3);
  border-radius: var(--radius-pill);
  background: var(--fill-1);
}

.tabs--sticky {
  position: sticky;
  top: var(--sticky-top);
  z-index: var(--z-sticky);
}

@media (max-width: 600px) {
  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    margin-bottom: var(--sp-2);
  }
  .tabs::-webkit-scrollbar {
    display: none;
  }
  .tabs--sticky {
    top: var(--safe-top);
  }
}
</style>
