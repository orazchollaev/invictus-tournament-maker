<script setup lang="ts" generic="K extends string">
/**
 * An overflow menu: a "⋯" button that opens a short list of actions. Picking
 * one closes the menu and reports its key. For options that stay open while
 * the user changes them, use AppSortFilterMenu instead.
 *
 * The `trigger` slot swaps the "⋯" button for any button of the caller's (it
 * is rendered as-child, so it gets `data-state="open"` while the menu is up).
 * `active` marks the current item, for a menu that navigates between views;
 * `block` opens the list at the trigger's full width.
 */
import type { Component } from "vue"
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from "reka-ui"
import { Ellipsis } from "@lucide/vue"
import AppButton from "./AppButton.vue"
import AppIcon from "./AppIcon.vue"

export interface AppMenuItem<Key extends string = string> {
  key: Key
  label: string
  icon?: Component
  disabled?: boolean
  /** Destructive (delete): drawn in the danger colour. */
  danger?: boolean
}

defineProps<{
  items: AppMenuItem<K>[]
  /** Accessible name for the default trigger, which shows only an icon. */
  label: string
  active?: K
  block?: boolean
}>()

const emit = defineEmits<{ select: [key: K] }>()
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <slot name="trigger">
        <AppButton icon-only variant="outlined" :aria-label="label" :title="label">
          <AppIcon :icon="Ellipsis" size="md" />
        </AppButton>
      </slot>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        class="app-menu"
        :class="{ 'app-menu--block': block }"
        :align="block ? 'start' : 'end'"
        :side-offset="6"
      >
        <DropdownMenuItem
          v-for="item in items"
          :key="item.key"
          class="app-menu-item"
          :class="{
            'app-menu-item--active': item.key === active,
            'app-menu-item--danger': item.danger,
          }"
          :aria-current="item.key === active ? 'page' : undefined"
          :disabled="item.disabled"
          @select="emit('select', item.key)"
        >
          <AppIcon v-if="item.icon" :icon="item.icon" size="sm" class="app-menu-icon" />
          {{ item.label }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<!-- Unscoped: DropdownMenuPortal teleports content to <body>, past scoped-attr propagation. -->
<style>
/* The same floating, outline-free card as the select and sort menus. */
.app-menu {
  z-index: 1000;
  min-width: 200px;
  padding: var(--sp-1);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  border: 1px solid transparent;
  border-radius: 14px;
  box-shadow: var(--elev-3);
}

.app-menu-item {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: 8px;
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  color: var(--text);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.app-menu-item[data-highlighted] {
  background: var(--bg-hover);
}

.app-menu--block {
  width: var(--reka-dropdown-menu-trigger-width);
}

.app-menu-item--active,
.app-menu-item--active[data-highlighted] {
  color: var(--accent);
  background: var(--accent-subtle);
  font-weight: 600;
}
.app-menu-item--active .app-menu-icon {
  color: var(--accent);
}

.app-menu-item--danger,
.app-menu-item--danger .app-menu-icon {
  color: var(--danger);
}

.app-menu-item[data-disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-menu-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.app-menu[data-state="open"] {
  animation: app-menu-in 0.14s ease-out both;
}

@keyframes app-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-menu[data-state="open"] {
    animation: none;
  }
}
</style>
