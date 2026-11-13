<script setup lang="ts">
/**
 * Custom format, new season: the sides a league phase relegated leave, and the
 * user picks who comes up in their place. A custom tournament has no division
 * below it, so "who comes up" is any team not already in it — the strongest
 * of them by default.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppModal } from "@/components/ui"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { TeamBadge } from "@/modules/teams/components"
import { TeamSelect } from "@/modules/players/components"
import { customRelegatedIds, shuffle, suggestReplacements } from "@/engine"

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
}>()

const emit = defineEmits<{
  /** Next season's full team list. */
  confirm: [teamIds: string[]]
  close: []
}>()

const { t } = useI18n()
const modal = ref<InstanceType<typeof AppModal> | null>(null)

const relegated = computed(() => customRelegatedIds(props.tournament))
const teamById = computed(() => new Map(props.allTeams.map((tm) => [tm.id, tm])))

/** Everyone who could come up: not in the tournament this season. */
const pool = computed(() => {
  const inside = new Set(props.tournament.teamIds)
  return props.allTeams.filter((tm) => !inside.has(tm.id))
})

const picks = ref<string[]>(
  suggestReplacements(props.tournament, props.allTeams, relegated.value.length)
)

/** A slot's choices: the pool minus whatever the other slots already took. */
function optionsFor(slot: number): Team[] {
  const taken = new Set(picks.value.filter((_, i) => i !== slot))
  return pool.value.filter((tm) => !taken.has(tm.id))
}

function fillStrongest() {
  picks.value = suggestReplacements(props.tournament, props.allTeams, relegated.value.length)
}

function fillRandom() {
  picks.value = shuffle(pool.value.map((tm) => tm.id)).slice(0, relegated.value.length)
}

const complete = computed(
  () =>
    picks.value.length === relegated.value.length &&
    picks.value.every((id) => !!id) &&
    new Set(picks.value).size === picks.value.length
)

function confirm() {
  if (!complete.value) return
  const leaving = new Set(relegated.value)
  const next = [...props.tournament.teamIds.filter((id) => !leaving.has(id)), ...picks.value]
  modal.value?.close(() => emit("confirm", next))
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('promotion.seasonTitle', { name: tournament.name })"
    :width="'min(480px, calc(100vw - 32px))'"
    @close="emit('close')"
  >
    <div class="mt-modal-body">
      <div class="mt-tier-block">
        <div class="mt-tier-title">{{ t("promotion.relegated") }}</div>
        <div class="mt-tier-rows">
          <div v-for="id in relegated" :key="id" class="mt-tier-row mt-row--relegated">
            <TeamBadge :team="teamById.get(id)" :size="14" :fallback="id" class="mt-name" />
            <span class="mt-badge mt-badge--down">↓ {{ t("promotion.down") }}</span>
          </div>
        </div>
      </div>

      <div class="mt-tier-block">
        <div class="nsr-head">
          <div class="mt-tier-title">{{ t("promotion.comingUp") }}</div>
          <div class="nsr-fill">
            <AppButton size="xs" variant="text" @click="fillStrongest">
              {{ t("promotion.strongest") }}
            </AppButton>
            <AppButton size="xs" variant="text" @click="fillRandom">
              {{ t("promotion.random") }}
            </AppButton>
          </div>
        </div>
        <div class="nsr-picks">
          <TeamSelect
            v-for="(_, slot) in relegated"
            :key="slot"
            v-model="picks[slot]"
            :teams="optionsFor(slot)"
            :placeholder="t('promotion.pickTeam')"
          />
        </div>
        <p v-if="pool.length < relegated.length" class="form-hint">
          {{ t("promotion.notEnoughTeams") }}
        </p>
      </div>
    </div>
    <template #footer>
      <button class="primary" :disabled="!complete" @click="confirm">
        {{ t("tournament.newSeason") }} →
      </button>
      <button @click="modal?.close()">{{ t("common.cancel") }}</button>
    </template>
  </AppModal>
</template>

<style src="../detail/detail.css"></style>
<style scoped>
.nsr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nsr-fill {
  display: flex;
  gap: var(--sp-1);
}

.nsr-picks {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
</style>
