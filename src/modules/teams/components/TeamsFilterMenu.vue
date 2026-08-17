<script setup lang="ts">
/** Sort filter for the teams list — thin wrapper around the shared SortFilterMenu. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { TeamsSortKey } from "@/modules/settings/store"
import { SortFilterMenu } from "@/components/ui"

const sortKey = defineModel<TeamsSortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: "default" as const, label: t("teams.sortDefault") },
  { value: "name" as const, label: t("teamSelector.sortName") },
  { value: "power" as const, label: t("teamSelector.sortPower") },
])
</script>

<template>
  <SortFilterMenu v-model:sort-key="sortKey" v-model:sort-asc="sortAsc" :sort-options="sortOptions" />
</template>
