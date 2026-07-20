<script setup lang="ts">
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "./types"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { TabsRoot, TabsList, TabsTrigger } from "reka-ui"

const { t } = useI18n()

const props = defineProps<{
  tournament: Tournament
  activeTab: MainTab
  isLeagueFormat: boolean
  isGroupFormat: boolean
  isMultiTier: boolean
  activeTierIdx: number
  hasAnyResults: boolean
  hasLeaguePlayoff: boolean
}>()

const emit = defineEmits<{
  changeTab: [tab: MainTab, tierIdx?: number]
}>()

const modelValue = computed(() =>
  props.activeTab === "league" && props.isMultiTier
    ? `league:${props.activeTierIdx}`
    : props.activeTab
)

function onUpdate(value: string) {
  if (value.startsWith("league:")) {
    emit("changeTab", "league", Number(value.slice(7)))
  } else {
    emit("changeTab", value as MainTab)
  }
}
</script>

<template>
  <TabsRoot :model-value="modelValue" @update:model-value="onUpdate">
    <TabsList class="phase-tabs">
      <template v-if="isLeagueFormat">
        <template v-if="isMultiTier">
          <TabsTrigger
            v-for="(tier, ti) in tournament.tiers"
            :key="ti"
            class="phase-tab"
            :value="`league:${ti}`"
          >
            {{ tier.name }}
          </TabsTrigger>
        </template>
        <template v-else>
          <TabsTrigger class="phase-tab" value="league">
            {{ t("tournament.tabs.league") }}
          </TabsTrigger>
        </template>
        <TabsTrigger v-if="hasLeaguePlayoff" class="phase-tab" value="bracket">
          {{ t("tournament.tabs.playoff") }}
        </TabsTrigger>
      </template>

      <template v-else-if="isGroupFormat">
        <TabsTrigger class="phase-tab" value="groups">
          {{ t("tournament.tabs.groups") }}
        </TabsTrigger>
        <TabsTrigger v-if="tournament.groupsDone" class="phase-tab" value="bracket">
          {{ t("tournament.tabs.bracket") }}
        </TabsTrigger>
      </template>

      <template v-else>
        <TabsTrigger class="phase-tab" value="bracket">
          {{ t("tournament.tabs.bracket") }}
        </TabsTrigger>
      </template>

      <TabsTrigger v-if="hasAnyResults" class="phase-tab" value="stats">
        {{ t("tournament.tabs.stats") }}
      </TabsTrigger>

      <TabsTrigger class="phase-tab" value="participants">
        {{ t("tournament.tabs.participants") }}
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>
