<script setup lang="ts">
/**
 * Sort + category filter for the teams list. The category picker sits in the
 * shared AppSortFilterMenu's `lead` slot, so the trigger dot and sorting stay
 * the shared menu's.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { TeamsSortKey } from "@/modules/settings/store"
import { AppSelect, AppSortFilterMenu } from "@/components/ui"
import { useTeamsStore } from "../store"

/** Sentinel for "no category filter" — AppSelect cannot hold an empty value. */
const ALL = "all"

const sortKey = defineModel<TeamsSortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })
const categoryKey = defineModel<string>("categoryKey", { default: ALL })
const categoryValue = defineModel<string>("categoryValue", { default: ALL })

const { t } = useI18n()
const store = useTeamsStore()

const sortOptions = computed(() => [
  { value: "default" as const, label: t("teams.sortDefault") },
  { value: "name" as const, label: t("teamSelector.sortName") },
  { value: "power" as const, label: t("teamSelector.sortPower") },
])

const allOption = computed(() => ({ value: ALL, label: t("teams.filter.all") }))

const keyOptions = computed(() => [
  allOption.value,
  ...store.categoryKeys.map((k) => ({ value: k, label: k })),
])

const valueOptions = computed(() => [
  allOption.value,
  ...store.categoryValues(categoryKey.value).map((v) => ({ value: v, label: v })),
])

function onKeyChange(key: string) {
  categoryKey.value = key
  categoryValue.value = ALL
}
</script>

<template>
  <AppSortFilterMenu
    v-model:sort-key="sortKey"
    v-model:sort-asc="sortAsc"
    :sort-options="sortOptions"
    :extra-active="categoryKey !== ALL"
    :sort-label="store.categoryKeys.length ? t('teams.filter.sortLabel') : undefined"
    :width="store.categoryKeys.length ? '240px' : undefined"
  >
    <template v-if="store.categoryKeys.length" #lead>
      <p class="sort-filter-label">{{ t("teams.filter.categoryLabel") }}</p>
      <AppSelect
        :model-value="categoryKey"
        :options="keyOptions"
        @update:model-value="onKeyChange"
      />
      <template v-if="categoryKey !== ALL">
        <p class="sort-filter-label value-label">{{ t("teams.filter.valueLabel") }}</p>
        <AppSelect v-model="categoryValue" :options="valueOptions" searchable />
      </template>
    </template>
  </AppSortFilterMenu>
</template>

<style scoped>
.value-label {
  margin-top: var(--sp-2);
}
</style>
