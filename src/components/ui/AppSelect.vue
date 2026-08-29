<script setup lang="ts" generic="T extends string">
/** Plain single-select dropdown (reka-ui Select) for short option lists — no search needed. */
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui"
import { ChevronDown, Check } from "@lucide/vue"
import AppIcon from "./AppIcon.vue"

defineProps<{
  options: { value: T; label: string }[]
  placeholder?: string
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <SelectRoot v-model="model">
    <SelectTrigger class="asel-trigger">
      <SelectValue class="asel-value" :placeholder="placeholder" />
      <SelectIcon class="asel-icon">
        <AppIcon :icon="ChevronDown" size="xs" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="asel-content" :side-offset="4" position="popper">
        <SelectViewport class="asel-viewport">
          <SelectItem v-for="opt in options" :key="opt.value" :value="opt.value" class="asel-item">
            <SelectItemText>{{ opt.label }}</SelectItemText>
            <SelectItemIndicator class="asel-item-check">
              <AppIcon :icon="Check" size="xs" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
.asel-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: var(--fs-md);
  font-weight: 400;
  font-family: var(--font-ui);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.asel-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.asel-value {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asel-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}

/* ── Design languages ────────────────────────────────────────────
   The trigger has to read as the same control as the <input> next to
   it, so it copies exactly what design.css does to a plain field:
   iOS fills it and drops the outline, M3 keeps the outline on no fill.
   Padding and type size stay on the shared baseline — changing them
   here is what made this sit a size off from the name field. */
[data-design="ios"] .asel-trigger {
  border-color: transparent;
  background: var(--fill-1);
}
[data-design="ios"] .asel-trigger:focus-visible {
  border-color: var(--accent);
  background: var(--surface);
}
[data-design="ios"] .asel-icon {
  color: color-mix(in srgb, var(--text-muted) 70%, transparent);
}

[data-design="android"] .asel-trigger {
  border-color: var(--border);
  background: transparent;
}
[data-design="android"] .asel-trigger:focus-visible {
  box-shadow:
    inset 0 0 0 1px var(--accent),
    var(--focus-ring);
}
</style>

<!-- Unscoped: SelectPortal teleports content to <body>, past scoped-attr propagation. -->
<style>
.asel-content {
  z-index: 1000;
  width: var(--reka-select-trigger-width);
  max-height: 280px;
  padding: var(--sp-1);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elev-2);
  overflow: hidden;
}

.asel-viewport {
  overflow-y: auto;
}

.asel-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: calc(var(--radius) - 3px);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.asel-item[data-highlighted] {
  background: var(--bg-hover);
}

.asel-item[data-state="checked"] {
  color: var(--accent);
  font-weight: 600;
}

.asel-item-check {
  margin-left: auto;
  display: flex;
  color: var(--accent);
  flex-shrink: 0;
}

.asel-content[data-state="open"] {
  animation: asel-content-in 0.14s ease-out both;
}
.asel-content[data-state="closed"] {
  animation: asel-content-out 0.1s ease-in both;
}

@keyframes asel-content-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes asel-content-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
}

/* ── Design languages ────────────────────────────────────────────
   iOS: a floating menu — no outline, heavy blur, tight rows. */
[data-design="ios"] .asel-content {
  border-color: transparent;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  box-shadow: var(--elev-3);
}
[data-design="ios"] .asel-item {
  border-radius: 8px;
  font-size: var(--fs-base);
  font-weight: 400;
}
[data-design="ios"] .asel-item[data-state="checked"] {
  font-weight: 500;
}

/* M3: an elevated tonal menu, square-ish rows, no outline. */
[data-design="android"] .asel-content {
  border-color: transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  box-shadow: var(--elev-2);
  padding: var(--sp-1) 0;
}
[data-design="android"] .asel-item {
  border-radius: 0;
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fs-base);
  font-weight: 400;
}
[data-design="android"] .asel-item[data-state="checked"] {
  background: var(--fill-2);
}

@media (prefers-reduced-motion: reduce) {
  .asel-content[data-state="open"],
  .asel-content[data-state="closed"] {
    animation: none;
  }
}
</style>
