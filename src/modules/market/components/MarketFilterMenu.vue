<script setup lang="ts">
/**
 * Filter button for the community list: the shared sort menu (newest / most
 * downloaded, each with its one direction) with the club/country filter in
 * its `lead` slot — so the list header is a single row, like every other
 * list page.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButtonGroup, AppSortFilterMenu } from "@/components/ui"
import type { MarketListing, MarketSort } from "../types"

const sort = defineModel<MarketSort>("sort", { required: true })
const type = defineModel<"all" | MarketListing["type"]>("type", { required: true })

const { t } = useI18n()

// The market sorts on the server, newest or most downloaded first; there is
// no other direction to pick, so this only satisfies the menu's model.
const sortAsc = ref(false)

const sortOptions = computed(() => [
  { value: "new" as MarketSort, label: t("market.sortNew") },
  { value: "popular" as MarketSort, label: t("market.sortPopular") },
])

const typeOptions = computed(() => [
  { value: "all", label: t("market.filterAll") },
  { value: "club", label: t("market.type.club") },
  { value: "country", label: t("market.type.country") },
])
</script>

<template>
  <AppSortFilterMenu
    v-model:sort-key="sort"
    v-model:sort-asc="sortAsc"
    :sort-options="sortOptions"
    default-value="new"
    :directional="false"
    :extra-active="type !== 'all'"
    :sort-label="t('players.filter.sortLabel')"
    width="260px"
  >
    <template #lead>
      <p class="sort-filter-label">{{ t("market.fieldType") }}</p>
      <AppButtonGroup v-model="type" :options="typeOptions" size="md" block />
    </template>
  </AppSortFilterMenu>
</template>
