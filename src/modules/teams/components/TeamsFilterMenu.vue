<script setup lang="ts">
/**
 * Sort filter for the teams list — a single icon button (AppButton trigger)
 * that opens a dropdown with sort-key options and, once a non-default key is
 * active, an asc/desc choice. Keeps `search-row` in TeamsPage.vue compact.
 *
 * The dropdown content is teleported (DropdownMenuPortal → <body>) through
 * several reka-ui `as-child` wrapper layers, so its styling lives in a plain
 * (unscoped) `<style>` block under a `teams-filter-*` prefix rather than
 * `<style scoped>` — scoped attrs aren't reliably preserved that far down
 * the forwarding chain.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { TeamsSortKey } from "@/modules/settings/store"
import { AppButton, AppIcon } from "@/components/ui"
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuSeparator,
} from "reka-ui"
import { ArrowDown, ArrowUp, ListFilter, Check } from "@lucide/vue"

const sortKey = defineModel<TeamsSortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: "default", label: t("teams.sortDefault") },
  { value: "name", label: t("teamSelector.sortName") },
  { value: "power", label: t("teamSelector.sortPower") },
])

const filterActive = computed(() => sortKey.value !== "default")

function onSortSelect(key: unknown) {
  if (typeof key !== "string" || sortKey.value === key) return
  sortKey.value = key as TeamsSortKey
  sortAsc.value = key === "name"
}

function onDirSelect(dir: unknown) {
  if (dir !== "asc" && dir !== "desc") return
  sortAsc.value = dir === "asc"
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
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
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="teams-filter-menu" align="end" :side-offset="6">
        <DropdownMenuRadioGroup :model-value="sortKey" @update:model-value="onSortSelect">
          <DropdownMenuRadioItem
            v-for="opt in sortOptions"
            :key="opt.value"
            class="teams-filter-item"
            :value="opt.value"
          >
            {{ opt.label }}
            <DropdownMenuItemIndicator class="teams-filter-item-check">
              <AppIcon :icon="Check" size="xs" />
            </DropdownMenuItemIndicator>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <template v-if="filterActive">
          <DropdownMenuSeparator class="teams-filter-sep" />
          <DropdownMenuRadioGroup
            :model-value="sortAsc ? 'asc' : 'desc'"
            @update:model-value="onDirSelect"
          >
            <DropdownMenuRadioItem class="teams-filter-item" value="asc">
              <AppIcon :icon="ArrowUp" size="xs" class="teams-filter-item-icon" />
              {{ t("teams.sortAsc") }}
              <DropdownMenuItemIndicator class="teams-filter-item-check">
                <AppIcon :icon="Check" size="xs" />
              </DropdownMenuItemIndicator>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem class="teams-filter-item" value="desc">
              <AppIcon :icon="ArrowDown" size="xs" class="teams-filter-item-icon" />
              {{ t("teams.sortDesc") }}
              <DropdownMenuItemIndicator class="teams-filter-item-check">
                <AppIcon :icon="Check" size="xs" />
              </DropdownMenuItemIndicator>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </template>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
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

<!-- Unscoped: this content is teleported to <body> via DropdownMenuPortal,
     past scoped-attr propagation, so it's styled with a plain global block. -->
<style>
.teams-filter-menu {
  z-index: 1000;
  min-width: 168px;
  padding: var(--sp-1);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elev-2);
}

.teams-filter-item {
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

.teams-filter-item[data-highlighted] {
  background: var(--bg-hover);
}

.teams-filter-item[data-state="checked"] {
  color: var(--accent);
  font-weight: 600;
}

.teams-filter-item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.teams-filter-item[data-state="checked"] .teams-filter-item-icon {
  color: var(--accent);
}

.teams-filter-item-check {
  margin-left: auto;
  display: flex;
  color: var(--accent);
  flex-shrink: 0;
}

.teams-filter-sep {
  height: 1px;
  margin: var(--sp-1) calc(var(--sp-1) * -1);
  background: var(--border-light);
}

.teams-filter-menu[data-state="open"] {
  animation: teams-filter-menu-in 0.14s ease-out both;
}
.teams-filter-menu[data-state="closed"] {
  animation: teams-filter-menu-out 0.1s ease-in both;
}

@keyframes teams-filter-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes teams-filter-menu-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
}

@media (prefers-reduced-motion: reduce) {
  .teams-filter-menu[data-state="open"],
  .teams-filter-menu[data-state="closed"] {
    animation: none;
  }
}
</style>
