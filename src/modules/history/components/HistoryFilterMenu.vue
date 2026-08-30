<script setup lang="ts">
/** Sort filter for the history series list — thin wrapper around the shared AppSortFilterMenu. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { HistorySortKey } from "@/modules/settings/store"
import { AppSortFilterMenu } from "@/components/ui"

const sortKey = defineModel<HistorySortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: "default" as const, label: t("teams.sortDefault") },
  { value: "name" as const, label: t("teamSelector.sortName") },
  { value: "seasons" as const, label: t("history.table.seasons") },
])
</script>

<template>
  <AppSortFilterMenu
    v-model:sort-key="sortKey"
    v-model:sort-asc="sortAsc"
    :sort-options="sortOptions"
  />
</template>
