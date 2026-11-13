<script setup lang="ts">
import { computed, ref } from "vue"
import { AppModal } from "@/components/ui"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { TeamBadge } from "@/modules/teams/components"
import { computeSeasonMoves } from "@/engine"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()

const { t } = useI18n()

const modal = ref<InstanceType<typeof AppModal> | null>(null)

/** The same moves the store will apply on confirm, so the preview cannot drift. */
const moves = computed(() => computeSeasonMoves(props.tournament))

function moveOf(teamId: string): "up" | "playoffUp" | "down" | null {
  if (moves.value.playoffWinners.has(teamId)) return "playoffUp"
  if (moves.value.promoted.has(teamId)) return "up"
  if (moves.value.relegated.has(teamId)) return "down"
  return null
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('promotion.seasonTitle', { name: tournament.name })"
    :width="'min(520px, calc(100vw - 32px))'"
    @close="emit('close')"
  >
    <div class="mt-modal-body">
      <div v-for="(tier, ti) in tournament.tiers" :key="ti" class="mt-tier-block">
        <div class="mt-tier-title">{{ tier.name }}</div>
        <div class="mt-tier-rows">
          <div
            v-for="(row, rank) in tier.league.standings"
            :key="row.teamId"
            class="mt-tier-row"
            :class="{
              'mt-row--promoted': moveOf(row.teamId) === 'up' || moveOf(row.teamId) === 'playoffUp',
              'mt-row--relegated': moveOf(row.teamId) === 'down',
            }"
          >
            <span class="mt-rank">{{ rank + 1 }}</span>
            <TeamBadge
              :team="allTeams.find((t) => t.id === row.teamId)"
              :size="14"
              :fallback="row.teamId"
              class="mt-name"
            />
            <span class="mt-pts">{{ row.pts }} pts</span>
            <span v-if="moveOf(row.teamId) === 'up'" class="mt-badge mt-badge--up">
              ↑ {{ t("promotion.up") }}
            </span>
            <span v-else-if="moveOf(row.teamId) === 'playoffUp'" class="mt-badge mt-badge--up">
              ↑ {{ t("promotion.playoffShort") }}
            </span>
            <span v-else-if="moveOf(row.teamId) === 'down'" class="mt-badge mt-badge--down">
              ↓ {{ t("promotion.down") }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="primary" @click="modal?.close(() => emit('confirm'))">
        {{ t("tournament.newSeason") }} →
      </button>
      <button @click="modal?.close()">{{ t("common.cancel") }}</button>
    </template>
  </AppModal>
</template>

<style src="./detail.css"></style>
