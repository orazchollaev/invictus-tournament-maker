<script setup lang="ts">
import { ArrowLeft, Trophy, RefreshCw, Zap, Settings } from "@lucide/vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{
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
</script>

<template>
  <div class="t-header">
    <div class="t-header-top">
      <RouterLink to="/tournaments" class="back-link">
        <ArrowLeft :size="14" />
        {{ t("nav.tournaments") }}
      </RouterLink>
      <div class="t-header-actions">
        <Transition name="fade">
          <div
            v-if="tournament.winnerId"
            class="winner-chip"
            :style="{ borderColor: winnerTeam?.color, color: winnerTeam?.color }"
          >
            <Trophy :size="12" />
            {{ winnerTeam?.name }}
          </div>
        </Transition>
        <button v-if="isFinished" class="primary new-season-btn" @click="emit('openNewSeason')">
          <RefreshCw :size="13" />
          <span class="btn-label">{{ t("tournament.newSeason") }}</span>
        </button>
        <button v-if="!isFinished" class="simulate-all-btn" @click="emit('simulateAll')">
          <Zap :size="13" />
          <span class="btn-label">{{ t("tournament.simulateAll") }}</span>
        </button>
        <button class="settings-btn" @click="emit('openSettings')">
          <Settings :size="14" />
          <span class="btn-label">{{ t("tournament.settings") }}</span>
        </button>
      </div>
    </div>
    <h1>
      {{ tournament.name }}
      <span class="t-season">S{{ tournament.season }}</span>
      <span class="t-format-tag">
        {{
          tournament.format === "group+bracket"
            ? t("tournaments.format.groupsKoLong")
            : tournament.format === "league"
              ? t("tournaments.format.league")
              : t("tournaments.format.bracket")
        }}
      </span>
    </h1>
    <span class="t-meta">
      {{ t("common.teams", { n: tournament.teamIds.length }) }} ·
      {{ t("tournament.header.created", { date: dateStr }) }}
    </span>
  </div>
</template>

<style src="./tdp.css"></style>
