<script setup lang="ts">
import type { Component } from "vue"
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui"

withDefaults(
  defineProps<{
    options: { value: string; label: string; icon?: Component; disabled?: boolean }[]
    modelValue: string
    size?: "xs" | "sm" | "md"
    block?: boolean
  }>(),
  { size: "sm" }
)

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

// A segmented control always has one segment on. Reka's single toggle group
// lets a second tap on the active item clear it, which arrives here as an
// empty value; dropping that keeps the current segment selected.
function onUpdate(value: unknown) {
  if (typeof value === "string" && value) emit("update:modelValue", value)
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    class="btn-group"
    :class="[`btn-group--${size}`, { 'btn-group--block': block }]"
    :model-value="modelValue"
    @update:model-value="onUpdate"
  >
    <ToggleGroupItem
      v-for="opt in options"
      :key="opt.value"
      :value="opt.value"
      :disabled="opt.disabled"
      :class="{ active: modelValue === opt.value, 'icon-only': opt.icon }"
      :title="opt.icon ? opt.label : undefined"
      :aria-label="opt.icon ? opt.label : undefined"
    >
      <component :is="opt.icon" v-if="opt.icon" :size="14" />
      <template v-else>{{ opt.label }}</template>
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>

<style scoped>
/* The system segmented control: grey track, white thumb, dark label.
   The accent never fills a segment. */
.btn-group {
  display: inline-flex;
  gap: 0;
  padding: 2px;
  background: var(--fill-1);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
}

.btn-group--block {
  display: flex;
  width: 100%;
}
.btn-group--block button {
  flex: 1;
  justify-content: center;
}

.btn-group button {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  border: none;
  background: none;
  box-shadow: none;
  border-radius: var(--radius-pill);
  font-family: var(--font-ui);
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}

.btn-group--sm button {
  height: 28px;
  font-size: var(--fs-sm);
  padding: 0 var(--sp-3);
}
.btn-group--xs button {
  font-size: var(--fs-xs);
  padding: 2px var(--sp-2);
}

.btn-group--md button {
  height: 26px;
  font-size: var(--fs-xs);
  padding: 0 var(--sp-2);
}

.btn-group button:hover:not(.active):not(:disabled) {
  color: var(--text);
  background: var(--bg-hover);
}

.btn-group button.active,
.btn-group button.active:hover {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.btn-group button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-group button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-group button.icon-only {
  padding: 0;
  justify-content: center;
}
.btn-group--sm button.icon-only {
  width: 24px;
  height: 24px;
}
/* 24px is the floor a tap target may be painted at (WCAG 2.5.8). */
.btn-group--xs button.icon-only {
  width: 24px;
  height: 24px;
}
.btn-group--md button.icon-only {
  width: 26px;
  height: 26px;
}

@media (max-width: 600px) {
  .btn-group {
    flex-wrap: wrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-group button {
    transition: none;
  }
}
</style>
