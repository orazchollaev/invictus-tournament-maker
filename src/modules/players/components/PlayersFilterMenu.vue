<script setup lang="ts">
/**
 * Combined filter button for PlayersPage: team filter (searchable combobox)
 * + sort by name/power. Built on reka-ui Popover (not DropdownMenu) because
 * DropdownMenuContent's roving-focus/typeahead would fight the Combobox's
 * own search input — Popover is non-modal and doesn't trap keyboard input.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { PlayersSortKey } from "@/modules/settings/store"
import type { Team } from "@/modules/teams/types"
import { AppButton, AppIcon } from "@/components/ui"
import TeamSelect from "./TeamSelect.vue"
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

defineProps<{ teams: Team[] }>()
const teamFilter = defineModel<string>("teamFilter", { required: true })
const sortKey = defineModel<PlayersSortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: "default", label: t("players.sortDefault") },
  { value: "name", label: t("teamSelector.sortName") },
  { value: "power", label: t("teamSelector.sortPower") },
])

const filterActive = computed(() => sortKey.value !== "default" || teamFilter.value !== "all")

function onSortSelect(key: unknown) {
  if (typeof key !== "string" || sortKey.value === key) return
  sortKey.value = key as PlayersSortKey
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
      <PopoverContent class="players-filter-menu" align="end" :side-offset="6">
        <p class="players-filter-label">{{ t("players.filter.teamLabel") }}</p>
        <TeamSelect
          v-model="teamFilter"
          :teams="teams"
          allow-all
          :placeholder="t('players.filter.searchPlaceholder')"
        />

        <div class="players-filter-sep" />

        <p class="players-filter-label">{{ t("players.filter.sortLabel") }}</p>
        <RadioGroupRoot
          :model-value="sortKey"
          class="players-filter-group"
          @update:model-value="onSortSelect"
        >
          <RadioGroupItem
            v-for="opt in sortOptions"
            :key="opt.value"
            class="players-filter-item"
            :value="opt.value"
          >
            {{ opt.label }}
            <RadioGroupIndicator class="players-filter-item-check">
              <AppIcon :icon="Check" size="xs" />
            </RadioGroupIndicator>
          </RadioGroupItem>
        </RadioGroupRoot>

        <template v-if="sortKey !== 'default'">
          <div class="players-filter-sep" />
          <RadioGroupRoot
            :model-value="sortAsc ? 'asc' : 'desc'"
            class="players-filter-group"
            @update:model-value="onDirSelect"
          >
            <RadioGroupItem class="players-filter-item" value="asc">
              <AppIcon :icon="ArrowUp" size="xs" class="players-filter-item-icon" />
              {{ t("teams.sortAsc") }}
              <RadioGroupIndicator class="players-filter-item-check">
                <AppIcon :icon="Check" size="xs" />
              </RadioGroupIndicator>
            </RadioGroupItem>
            <RadioGroupItem class="players-filter-item" value="desc">
              <AppIcon :icon="ArrowDown" size="xs" class="players-filter-item-icon" />
              {{ t("teams.sortDesc") }}
              <RadioGroupIndicator class="players-filter-item-check">
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
.players-filter-menu {
  z-index: 1000;
  width: 240px;
  padding: var(--sp-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elev-2);
}

.players-filter-label {
  margin: 0 0 var(--sp-1);
  padding: 0 var(--sp-1);
  font-size: var(--fs-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}

.players-filter-group {
  display: flex;
  flex-direction: column;
}

.players-filter-item {
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

.players-filter-item:hover {
  background: var(--bg-hover);
}

.players-filter-item[data-state="checked"] {
  color: var(--accent);
  font-weight: 600;
}

.players-filter-item-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.players-filter-item[data-state="checked"] .players-filter-item-icon {
  color: var(--accent);
}

.players-filter-item-check {
  margin-left: auto;
  display: flex;
  color: var(--accent);
  flex-shrink: 0;
}

.players-filter-sep {
  height: 1px;
  margin: var(--sp-2) calc(var(--sp-1) * -1);
  background: var(--border-light);
}

.players-filter-menu[data-state="open"] {
  animation: players-filter-menu-in 0.14s ease-out both;
}
.players-filter-menu[data-state="closed"] {
  animation: players-filter-menu-out 0.1s ease-in both;
}

@keyframes players-filter-menu-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes players-filter-menu-out {
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
  .players-filter-menu[data-state="open"],
  .players-filter-menu[data-state="closed"] {
    animation: none;
  }
}
</style>
