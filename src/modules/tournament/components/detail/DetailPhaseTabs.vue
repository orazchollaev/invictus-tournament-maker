<script setup lang="ts">
import { computed } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "./types"
import { useI18n } from "vue-i18n"
import { TabsRoot, TabsList, TabsTrigger } from "reka-ui"

const { t, locale } = useI18n()

const props = defineProps<{
  tournament: Tournament
  activeTab: MainTab
  isLeagueFormat: boolean
  isGroupFormat: boolean
  hasAnyResults: boolean
  hasLeaguePlayoff: boolean
}>()

// Swiss shares the league tab and table, so only its label changes.
const leagueTabLabel = computed(() =>
  props.tournament.format === "swiss"
    ? t("tournament.tabs.swissPhase")
    : t("tournament.tabs.league")
)

const emit = defineEmits<{
  changeTab: [tab: MainTab]
}>()

function onUpdate(value: string) {
  emit("changeTab", value as MainTab)
}
</script>

<template>
  <TabsRoot
    :model-value="activeTab"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    @update:model-value="onUpdate"
  >
    <TabsList class="phase-tabs">
      <template v-if="isLeagueFormat">
        <TabsTrigger as="div" class="phase-tab" value="league">
          {{ leagueTabLabel }}
        </TabsTrigger>
        <TabsTrigger v-if="hasLeaguePlayoff" as="div" class="phase-tab" value="bracket">
          {{ t("tournament.tabs.playoff") }}
        </TabsTrigger>
      </template>

      <template v-else-if="isGroupFormat">
        <TabsTrigger as="div" class="phase-tab" value="groups">
          {{ t("tournament.tabs.groups") }}
        </TabsTrigger>
        <TabsTrigger v-if="tournament.groupsDone" as="div" class="phase-tab" value="bracket">
          {{ t("tournament.tabs.bracket") }}
        </TabsTrigger>
      </template>

      <template v-else>
        <TabsTrigger as="div" class="phase-tab" value="bracket">
          {{ t("tournament.tabs.bracket") }}
        </TabsTrigger>
      </template>

      <TabsTrigger v-if="hasAnyResults" as="div" class="phase-tab" value="stats">
        {{ t("tournament.tabs.stats") }}
      </TabsTrigger>

      <TabsTrigger as="div" class="phase-tab" value="participants">
        {{ t("tournament.tabs.participants") }}
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>
