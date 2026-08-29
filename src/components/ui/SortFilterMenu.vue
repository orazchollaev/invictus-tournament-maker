<script setup lang="ts" generic="T extends string">
/**
 * Generic sort-filter button: an icon trigger that opens a panel with a
 * sort-key choice and, once a non-default key is active, an asc/desc choice.
 *
 * Built on reka-ui Popover + RadioGroup rather than DropdownMenu — picking
 * an option doesn't close the panel, so flipping key and direction (or
 * changing your mind) doesn't mean reopening it every time. Used by
 * Teams/Tournaments/History list pages; PlayersFilterMenu follows the same
 * pattern with an extra team-picker section.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import AppButton from "./AppButton.vue"
import AppIcon from "./AppIcon.vue"
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  RadioGroupRoot,
  RadioGroupItem,
  RadioGroupIndicator,
} from "reka-ui"
import { ArrowDown, ArrowUp, ListFilter, Check } from "@lucide/vue"

const props = defineProps<{
  sortOptions: { value: T; label: string }[]
  /** sortKey value that means "no explicit sort" — hides the asc/desc section. Defaults to "default". */
  defaultValue?: T
}>()

const sortKey = defineModel<T>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const defaultVal = computed(() => props.defaultValue ?? ("default" as T))
const filterActive = computed(() => sortKey.value !== defaultVal.value)

function onSortSelect(key: unknown) {
  if (typeof key !== "string" || sortKey.value === (key as T)) return
  sortKey.value = key as T
  sortAsc.value = key === "name"
}

function onDirSelect(dir: unknown) {
  if (dir !== "asc" && dir !== "desc") return
  sortAsc.value = dir === "asc"
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <AppButton
        type="button"
        icon-only
        size="md"
        :variant="filterActive ? 'tonal' : 'outlined'"
        :title="t('common.filter')"
        class="filter-trigger"
      >
        <AppIcon :icon="ListFilter" size="xs" />
        <span v-if="filterActive" class="filter-dot" />
      </AppButton>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="sort-filter-menu" align="end" :side-offset="6">
        <RadioGroupRoot
          :model-value="sortKey"
          class="sort-filter-group"
          @update:model-value="onSortSelect"
        >
          <RadioGroupItem
            v-for="opt in sortOptions"
            :key="opt.value"
            class="sort-filter-item"
            :value="opt.value"
          >
            {{ opt.label }}
            <RadioGroupIndicator class="sort-filter-item-check">
              <AppIcon :icon="Check" size="xs" />
            </RadioGroupIndicator>
          </RadioGroupItem>
        </RadioGroupRoot>

        <template v-if="filterActive">
          <div class="sort-filter-sep" />
          <RadioGroupRoot
            :model-value="sortAsc ? 'asc' : 'desc'"
            class="sort-filter-group"
            @update:model-value="onDirSelect"
          >
            <RadioGroupItem class="sort-filter-item" value="asc">
              <AppIcon :icon="ArrowUp" size="xs" class="sort-filter-item-icon" />
              {{ t("teams.sortAsc") }}
              <RadioGroupIndicator class="sort-filter-item-check">
                <AppIcon :icon="Check" size="xs" />
              </RadioGroupIndicator>
            </RadioGroupItem>
            <RadioGroupItem class="sort-filter-item" value="desc">
              <AppIcon :icon="ArrowDown" size="xs" class="sort-filter-item-icon" />
              {{ t("teams.sortDesc") }}
              <RadioGroupIndicator class="sort-filter-item-check">
                <AppIcon :icon="Check" size="xs" />
              </RadioGroupIndicator>
            </RadioGroupItem>
          </RadioGroupRoot>
        </template>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>

<style scoped>
.filter-trigger {
  position: relative;
  flex-shrink: 0;
}

.filter-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}
</style>

<!-- Unscoped: PopoverPortal teleports content to <body>, past scoped-attr propagation. -->
<style>
.sort-filter-menu {
  z-index: 1000;
  min-width: 168px;
  padding: var(--sp-1);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elev-2);
}

.sort-filter-group {
  display: flex;
  flex-direction: column;
}

.sort-filter-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: none;
  border-radius: calc(var(--radius) - 3px);
  background: transparent;
  font-size: var(--fs-sm);
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text);
  cursor: pointer;
  outline: none;
  user-select: none;
  text-align: left;
}

.sort-filter-item:hover {
  background: var(--bg-hover);
}

.sort-filter-item[data-state="checked"] {
  color: var(--accent);
  font-weight: 600;
}

.sort-filter-item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.sort-filter-item[data-state="checked"] .sort-filter-item-icon {
  color: var(--accent);
}

.sort-filter-item-check {
  margin-left: auto;
  display: flex;
  color: var(--accent);
  flex-shrink: 0;
}

.sort-filter-sep {
  height: 1px;
  margin: var(--sp-1) calc(var(--sp-1) * -1);
  background: var(--border-light);
}

.sort-filter-menu[data-state="open"] {
  animation: sort-filter-menu-in 0.14s ease-out both;
}
.sort-filter-menu[data-state="closed"] {
  animation: sort-filter-menu-out 0.1s ease-in both;
}

@keyframes sort-filter-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes sort-filter-menu-out {
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
   Same treatment as the select menu: iOS floats a blurred, outline-free
   card; M3 elevates a tonal sheet with full-bleed rows. */
[data-design="ios"] .sort-filter-menu {
  border-color: transparent;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  box-shadow: var(--elev-3);
}
[data-design="ios"] .sort-filter-item {
  border-radius: 8px;
  font-size: var(--fs-base);
  font-weight: 400;
}
[data-design="ios"] .sort-filter-item:active {
  background: var(--bg-hover);
}

[data-design="android"] .sort-filter-menu {
  border-color: transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  box-shadow: var(--elev-2);
  padding: var(--sp-1) 0;
}
[data-design="android"] .sort-filter-item {
  border-radius: 0;
  padding: var(--sp-3) var(--sp-4);
  font-size: var(--fs-base);
  font-weight: 400;
}
[data-design="android"] .sort-filter-item[data-state="checked"] {
  background: var(--fill-2);
}
[data-design="android"] .sort-filter-sep {
  margin-inline: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sort-filter-menu[data-state="open"],
  .sort-filter-menu[data-state="closed"] {
    animation: none;
  }
}
</style>
