<script setup lang="ts">
import { Lock } from "@lucide/vue"
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
}>()

const emit = defineEmits<{
  changeTab: [tab: MainTab, tierIdx?: number]
}>()
</script>

<template>
  <div class="phase-tabs">
    <!-- League format -->
    <template v-if="isLeagueFormat">
      <!-- Multi-tier: one tab per tier -->
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
      <!-- Single-tier -->
      <template v-else>
        <button
          class="phase-tab"
          :class="{ active: activeTab === 'league' }"
          @click="emit('changeTab', 'league')"
        >
          {{ t("tournament.tabs.league") }}
        </button>
      </template>
    </template>
    <!-- Groups + Bracket format -->
    <template v-else-if="isGroupFormat">
      <button
        class="phase-tab"
        :class="{ active: activeTab === 'groups' }"
        @click="emit('changeTab', 'groups')"
      >
        {{ t("tournament.tabs.groups") }}
      </button>
      <button
        class="phase-tab"
        :class="{ active: activeTab === 'bracket', disabled: !tournament.groupsDone }"
        :disabled="!tournament.groupsDone"
        @click="tournament.groupsDone && emit('changeTab', 'bracket')"
      >
        {{ t("tournament.tabs.bracket") }}
        <Lock v-if="!tournament.groupsDone" :size="13" class="tab-lock" />
      </button>
    </template>
    <!-- Pure bracket format -->
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
      class="phase-tab"
      :class="{ active: activeTab === 'stats', disabled: !hasAnyResults }"
      :disabled="!hasAnyResults"
      @click="hasAnyResults && emit('changeTab', 'stats')"
    >
      {{ t("tournament.tabs.stats") }}
      <Lock v-if="!hasAnyResults" :size="13" class="tab-lock" />
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
