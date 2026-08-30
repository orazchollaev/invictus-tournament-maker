<script setup lang="ts">
/**
 * Filter button for PlayersPage: the shared sort menu with a team picker
 * added on top. The picker sits in the menu's `lead` slot rather than in a
 * second Popover of its own — everything below it, including the trigger's
 * active dot, is AppSortFilterMenu's.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { PlayersSortKey } from "@/modules/settings/store"
import type { Team } from "@/modules/teams/types"
import { AppSortFilterMenu } from "@/components/ui"
import TeamSelect from "./TeamSelect.vue"

defineProps<{ teams: Team[] }>()
const teamFilter = defineModel<string>("teamFilter", { required: true })
const sortKey = defineModel<PlayersSortKey>("sortKey", { required: true })
const sortAsc = defineModel<boolean>("sortAsc", { required: true })

const { t } = useI18n()

const sortOptions = computed(() => [
  { value: "default" as PlayersSortKey, label: t("players.sortDefault") },
  { value: "name" as PlayersSortKey, label: t("teamSelector.sortName") },
  { value: "power" as PlayersSortKey, label: t("teamSelector.sortPower") },
])
</script>

<template>
  <AppSortFilterMenu
    v-model:sort-key="sortKey"
    v-model:sort-asc="sortAsc"
    :sort-options="sortOptions"
    :extra-active="teamFilter !== 'all'"
    :sort-label="t('players.filter.sortLabel')"
    width="240px"
  >
    <template #lead>
      <p class="sort-filter-label">{{ t("players.filter.teamLabel") }}</p>
      <TeamSelect
        v-model="teamFilter"
        :teams="teams"
        allow-all
        :placeholder="t('players.filter.searchPlaceholder')"
      />
    </template>
  </AppSortFilterMenu>
</template>
