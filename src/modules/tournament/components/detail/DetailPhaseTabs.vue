<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { MainTab } from "./types"
import { AppTabs, AppTab } from "@/components/ui"

const props = defineProps<{
  activeTab: MainTab
  isLeagueFormat: boolean
  isGroupFormat: boolean
  isSwissFormat: boolean
  bracketAllowed: boolean
}>()

const emit = defineEmits<{
  changeTab: [tab: MainTab]
}>()

const { t, locale } = useI18n()

// Swiss shares the league tab and table, so only its label changes.
const leagueTabLabel = computed(() =>
  props.isSwissFormat ? t("tournament.tabs.swissPhase") : t("tournament.tabs.league")
)

// Swiss's knockout phase reads as "Bracket"; a pure league's reads as "Play Off".
const bracketTabLabel = computed(() =>
  props.isSwissFormat ? t("tournament.tabs.bracket") : t("tournament.tabs.playoff")
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
      <AppTab v-if="bracketAllowed" value="bracket">
        {{ bracketTabLabel }}
      </AppTab>
    </template>

    <template v-else-if="isGroupFormat">
      <AppTab value="groups">{{ t("tournament.tabs.groups") }}</AppTab>
      <AppTab value="bracket">{{ t("tournament.tabs.bracket") }}</AppTab>
    </template>

    <template v-else>
      <AppTab value="bracket">{{ t("tournament.tabs.bracket") }}</AppTab>
    </template>

    <AppTab value="fixtures">{{ t("tournament.tabs.fixtures") }}</AppTab>

    <AppTab value="stats">{{ t("tournament.tabs.stats") }}</AppTab>

    <AppTab value="participants">{{ t("tournament.tabs.participants") }}</AppTab>
  </AppTabs>
</template>
