<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { ArrowLeft } from "@lucide/vue"
import { AppButton, AppCard, AppEmptyState, AppIcon } from "@/components/ui"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { usePlayerCareer } from "../composables/usePlayerCareer"
import { PlayerCareerCard, PlayerDetailHeader, PlayerHonoursCard } from "../components/detail"
import { PlayerFormModal } from "@/modules/players/components"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const playersStore = usePlayersStore()
const teamsStore = useTeamsStore()

const playerId = computed(() => route.params.id as string)
const player = computed(() => playersStore.byId(playerId.value))
const team = computed(() =>
  player.value ? teamsStore.teams.find((tm) => tm.id === player.value!.teamId) : undefined
)

const { totals, honours, hasCareer } = usePlayerCareer(() => player.value?.id)

const editing = ref(false)
</script>

<template>
  <div class="page">
    <AppCard v-if="!player" padding="md">
      <AppEmptyState :description="t('playerDetail.notFound')">
        <template #action>
          <AppButton @click="router.back()">
            <AppIcon :icon="ArrowLeft" />
            {{ t("common.back") }}
          </AppButton>
        </template>
      </AppEmptyState>
    </AppCard>

    <div v-else :style="{ '--rail-color': team?.color ?? 'var(--accent)' }">
      <PlayerDetailHeader
        :player="player"
        :team="team"
        @back="router.back()"
        @edit="editing = true"
      />

      <div class="stack">
        <!-- Always rendered, zeros and all. Hiding it behind "has he played?"
           made the page look broken for anyone whose seasons predate match
           reports — the structure itself is the answer to "what is tracked". -->
        <PlayerCareerCard :totals="totals" :position="player.position" :empty="!hasCareer" />

        <PlayerHonoursCard v-if="honours.length" :honours="honours" />
      </div>
    </div>

    <PlayerFormModal v-if="editing && player" :player="player" @close="editing = false" />
  </div>
</template>

<style scoped>
/* Every card header on this page picks up the player's team colour. */
.stack :deep(.card-header) {
}
</style>
