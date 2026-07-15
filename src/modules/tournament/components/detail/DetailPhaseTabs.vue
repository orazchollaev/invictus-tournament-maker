<script setup lang="ts">
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "./types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{
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
</script>

<template>
  <div class="phase-tabs">
    <template v-if="isLeagueFormat">
      <template v-if="isMultiTier">
        <button
          v-for="(tier, ti) in tournament.tiers"
          :key="ti"
          class="phase-tab"
          :class="{ active: activeTab === 'league' && activeTierIdx === ti }"
          @click="emit('changeTab', 'league', ti)"
        >
          {{ tier.name }}
        </button>
      </template>
      <template v-else>
        <button
          class="phase-tab"
          :class="{ active: activeTab === 'league' }"
          @click="emit('changeTab', 'league')"
        >
          {{ t("tournament.tabs.league") }}
        </button>
      </template>
      <button
        v-if="hasLeaguePlayoff"
        class="phase-tab"
        :class="{ active: activeTab === 'bracket' }"
        @click="emit('changeTab', 'bracket')"
      >
        {{ t("tournament.tabs.playoff") }}
      </button>
    </template>

    <template v-else-if="isGroupFormat">
      <button
        class="phase-tab"
        :class="{ active: activeTab === 'groups' }"
        @click="emit('changeTab', 'groups')"
      >
        {{ t("tournament.tabs.groups") }}
      </button>
      <button
        v-if="tournament.groupsDone"
        class="phase-tab"
        :class="{ active: activeTab === 'bracket' }"
        @click="emit('changeTab', 'bracket')"
      >
        {{ t("tournament.tabs.bracket") }}
      </button>
    </template>

    <template v-else>
      <button
        class="phase-tab"
        :class="{ active: activeTab === 'bracket' }"
        @click="emit('changeTab', 'bracket')"
      >
        {{ t("tournament.tabs.bracket") }}
      </button>
    </template>

    <button
      v-if="hasAnyResults"
      class="phase-tab"
      :class="{ active: activeTab === 'stats' }"
      @click="emit('changeTab', 'stats')"
    >
      {{ t("tournament.tabs.stats") }}
    </button>

    <button
      class="phase-tab"
      :class="{ active: activeTab === 'participants' }"
      @click="emit('changeTab', 'participants')"
    >
      {{ t("tournament.tabs.participants") }}
    </button>
  </div>
</template>
