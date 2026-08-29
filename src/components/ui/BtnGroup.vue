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

/* Heights are pinned rather than left to line-height + padding: a group
   sits next to an icon AppButton in every search row, and the two have
   to come out the same height. 24 + 3px padding + 1px border on each
   side = the 32px outer box an icon AppButton paints. */
.btn-group--sm button {
  height: 24px;
  font-size: var(--fs-sm);
  padding: 0 var(--sp-3);
}
.btn-group--xs button {
  font-size: var(--fs-xs);
  padding: 2px var(--sp-2);
}

.btn-group--md button {
  height: 24px;
  font-size: var(--fs-xs);
  padding: 0 var(--sp-2);
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
  width: 24px;
  height: 24px;
}
/* 24px is the floor a tap target may be painted at (WCAG 2.5.8). */
.btn-group--xs button.icon-only {
  width: 24px;
  height: 24px;
}

/* ── Design languages ────────────────────────────────────────────
   iOS: the system segmented control — grey track, white thumb, dark
   label. The accent never fills a segment there. */
[data-design="ios"] .btn-group {
  gap: 0;
  padding: 2px;
  border-color: transparent;
  border-radius: var(--radius-pill);
  background: var(--fill-1);
}
[data-design="ios"] .btn-group button {
  border-radius: var(--radius-pill);
}
[data-design="ios"] .btn-group button.active,
[data-design="ios"] .btn-group button.active:hover {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}

/* M3: an outlined segmented button — one shared outline, the selected
   segment filled with the accent's container tone. */
[data-design="android"] .btn-group {
  gap: 0;
  padding: 0;
  border-color: var(--border);
  border-radius: var(--radius-pill);
  background: transparent;
  overflow: hidden;
}
[data-design="android"] .btn-group button {
  border-radius: 0;
  padding-block: var(--sp-2);
}
[data-design="android"] .btn-group button + button {
  border-left: 1px solid var(--border);
}
[data-design="android"] .btn-group button.active,
[data-design="android"] .btn-group button.active:hover {
  background: var(--fill-3);
  color: var(--accent);
  box-shadow: none;
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
