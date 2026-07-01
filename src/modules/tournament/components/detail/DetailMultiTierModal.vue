<script setup lang="ts">
import { ref } from "vue"
import AppModal from "@/components/AppModal.vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const modal = ref<InstanceType<typeof AppModal> | null>(null)

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
}>()

const emit = defineEmits<{
  confirm: []
  close: []
}>()
</script>

<template>
  <AppModal
    ref="modal"
    :title="`New Season — ${tournament.name}`"
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
              'mt-row--promoted': ti > 0 && rank < (tournament.promotionCount ?? 0),
              'mt-row--relegated':
                ti < tournament.tiers!.length - 1 &&
                rank >= tier.league.standings.length - (tournament.promotionCount ?? 0),
            }"
          >
            <span class="mt-rank">{{ rank + 1 }}</span>
            <span
              class="mt-dot"
              :style="{ background: allTeams.find((t) => t.id === row.teamId)?.color ?? '#888' }"
            />
            <span class="mt-name">
              {{ allTeams.find((t) => t.id === row.teamId)?.name ?? row.teamId }}
            </span>
            <span class="mt-pts">{{ row.pts }} pts</span>
            <span
              v-if="ti > 0 && rank < (tournament.promotionCount ?? 0)"
              class="mt-badge mt-badge--up"
            >
              ↑ Up
            </span>
            <span
              v-else-if="
                ti < tournament.tiers!.length - 1 &&
                rank >= tier.league.standings.length - (tournament.promotionCount ?? 0)
              "
              class="mt-badge mt-badge--down"
            >
              ↓ Down
            </span>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="primary" @click="emit('confirm')">{{ t("tournament.newSeason") }} →</button>
      <button @click="modal?.close()">{{ t("common.cancel") }}</button>
    </template>
  </AppModal>
</template>

<style src="./tdp.css"></style>
