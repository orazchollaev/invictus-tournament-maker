<script setup lang="ts">
import { computed } from "vue"
import { ArrowLeft, Trophy, RefreshCw, Settings, Zap } from "@lucide/vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const props = defineProps<{
  tournament: Tournament
  winnerTeam: Team | undefined
  dateStr: string
  isFinished: boolean
}>()

const emit = defineEmits<{
  openNewSeason: []
  simulateAll: []
  openSettings: []
}>()

const formatLabel = computed(() => {
  if (props.tournament.format === "group+bracket") return t("tournaments.format.groupsKoLong")
  if (props.tournament.format === "league") return t("tournaments.format.league")
  return t("tournaments.format.bracket")
})
</script>

<template>
  <div class="t-header">
    <div class="t-header-top">
      <RouterLink to="/tournaments" class="back-link">
        <ArrowLeft :size="14" />
        {{ t("nav.tournaments") }}
      </RouterLink>
      <div class="t-header-actions">
        <button v-if="isFinished" class="primary new-season-btn" @click="emit('openNewSeason')">
          <RefreshCw :size="13" />
          <span class="btn-label">{{ t("tournament.newSeason") }}</span>
        </button>
        <button
          v-if="!isFinished"
          class="icon-btn sim-btn"
          :title="t('tournament.simulateAll')"
          @click="emit('simulateAll')"
        >
          <Zap :size="15" />
        </button>
        <button
          class="icon-btn settings-btn"
          :title="t('tournament.settings')"
          @click="emit('openSettings')"
        >
          <Settings :size="15" />
        </button>
      </div>
    </div>

    <h1>
      {{ tournament.name }}
      <span class="t-season">S{{ tournament.season }}</span>
    </h1>

    <div class="t-meta-row">
      <span class="t-meta">
        {{ t("common.teams", { n: tournament.teamIds.length }) }} · {{ formatLabel }} ·
        {{ t("tournament.header.created", { date: dateStr }) }}
      </span>
    </div>

    <Transition name="fade">
      <div v-if="tournament.winnerId && winnerTeam" class="t-winner">
        <Trophy :size="12" class="t-winner-icon" />
        <span class="t-winner-name" :style="{ color: winnerTeam.color }">
          {{ winnerTeam.name }}
        </span>
        <span class="t-winner-label">{{ t("history.table.champion") }}</span>
      </div>
    </Transition>
  </div>
</template>

<style src="./tournament-detail.css"></style>
