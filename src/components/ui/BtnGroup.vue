<script setup lang="ts">
import type { Component } from "vue"

withDefaults(
  defineProps<{
    options: { value: string; label: string; icon?: Component; disabled?: boolean }[]
    modelValue: string
    size?: "xs" | "sm" | "md"
    block?: boolean
  }>(),
  { size: "sm" }
)

defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <div class="btn-group" :class="[`btn-group--${size}`, { 'btn-group--block': block }]">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :disabled="opt.disabled"
      :class="{ active: modelValue === opt.value, 'icon-only': opt.icon }"
      :title="opt.icon ? opt.label : undefined"
      :aria-label="opt.icon ? opt.label : undefined"
      @click="$emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" :size="14" />
      <template v-else>{{ opt.label }}</template>
    </button>
  </div>
</template>

<style scoped>
.btn-group {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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
  border-radius: calc(var(--radius) - 3px);
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
  font-size: var(--fs-sm);
  padding: var(--sp-1) var(--sp-3);
}
.btn-group--xs button {
  font-size: var(--fs-xs);
  padding: 2px var(--sp-2);
}

.btn-group--md button {
  font-size: var(--fs-xs);
  padding: 6px var(--sp-2);
}

.btn-group button:hover:not(.active):not(:disabled) {
  color: var(--text);
  background: var(--bg-hover);
}

.btn-group button.active {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
  box-shadow: var(--elev-1);
}

.btn-group button.active:hover {
  background: var(--accent-hover);
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
  width: 26px;
  height: 26px;
}
.btn-group--xs button.icon-only {
  width: 22px;
  height: 22px;
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
