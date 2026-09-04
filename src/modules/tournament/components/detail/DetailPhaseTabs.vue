<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "./types"
import { AppTabs, AppTab } from "@/components/ui"

const props = defineProps<{
  tournament: Tournament
  activeTab: MainTab
  isLeagueFormat: boolean
  isGroupFormat: boolean
  hasAnyResults: boolean
  hasLeaguePlayoff: boolean
}>()

const emit = defineEmits<{
  changeTab: [tab: MainTab]
}>()

const { t, locale } = useI18n()

// Swiss shares the league tab and table, so only its label changes.
const leagueTabLabel = computed(() =>
  props.tournament.format === "swiss"
    ? t("tournament.tabs.swissPhase")
    : t("tournament.tabs.league")
)

function onUpdate(value: string) {
  emit("changeTab", value as MainTab)
}
</script>

<template>
  <AppTabs
    :model-value="activeTab"
    sticky
    size="sm"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    @update:model-value="onUpdate"
  >
    <template v-if="isLeagueFormat">
      <AppTab value="league">{{ leagueTabLabel }}</AppTab>
      <AppTab value="fixtures">{{ t("tournament.tabs.fixtures") }}</AppTab>
      <AppTab v-if="hasLeaguePlayoff" value="bracket">
        {{ t("tournament.tabs.playoff") }}
      </AppTab>
    </template>

    <template v-else-if="isGroupFormat">
      <AppTab value="groups">{{ t("tournament.tabs.groups") }}</AppTab>
      <AppTab value="fixtures">{{ t("tournament.tabs.fixtures") }}</AppTab>
      <AppTab v-if="tournament.groupsDone" value="bracket">
        {{ t("tournament.tabs.bracket") }}
      </AppTab>
    </template>

    <template v-else>
      <AppTab value="bracket">{{ t("tournament.tabs.bracket") }}</AppTab>
    </template>

    <AppTab v-if="hasAnyResults" value="stats">{{ t("tournament.tabs.stats") }}</AppTab>

    <AppTab value="participants">{{ t("tournament.tabs.participants") }}</AppTab>
  </AppTabs>
</template>
