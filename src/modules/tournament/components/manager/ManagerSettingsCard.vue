<script setup lang="ts">
/** Taking a job, and the instructions that come with it. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { ClipboardList } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppCard, AppField, AppIcon, AppSelect } from "@/components/ui"
import { FORMATION_LIST, PLAY_STYLES } from "@/engine"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import type { Formation, PlayStyle } from "@/modules/teams/types"

const props = defineProps<{ tournamentId: string }>()

const { t } = useI18n()
const store = useTournamentStore()
const teamsStore = useTeamsStore()

const tournament = computed(() => store.tournaments.find((x) => x.id === props.tournamentId))
const manager = computed(() => tournament.value?.manager)

const teamOptions = computed(() =>
  (tournament.value?.teamIds ?? [])
    .map((id) => teamsStore.teams.find((tm) => tm.id === id))
    .filter((tm): tm is NonNullable<typeof tm> => !!tm)
    .map((tm) => ({ value: tm.id, label: tm.name }))
)

const formationOptions = computed(() => FORMATION_LIST.map((value) => ({ value, label: value })))
const styleOptions = computed(() =>
  PLAY_STYLES.map((value) => ({ value, label: t(`coach.styles.${value}`) }))
)

const teamId = computed({
  get: () => manager.value?.teamId ?? "",
  set: (value: string) => store.setManagerTeam(props.tournamentId, value || null),
})

const formation = computed({
  get: () => manager.value?.formation ?? "4-4-2",
  set: (value: Formation) => store.setManagerTactics(props.tournamentId, { formation: value }),
})

const style = computed({
  get: () => manager.value?.style ?? "balanced",
  set: (value: PlayStyle) => store.setManagerTactics(props.tournamentId, { style: value }),
})
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="ClipboardList" size="md" />
      {{ t("manager.settings.title") }}
    </template>

    <AppField layout="stack" :label="t('manager.settings.team')" :hint="t('manager.settings.hint')">
      <AppSelect
        v-model="teamId"
        :options="teamOptions"
        searchable
        :placeholder="t('manager.settings.placeholder')"
      />
    </AppField>

    <template v-if="manager">
      <AppField layout="stack" :label="t('coach.form.formation')">
        <AppSelect v-model="formation" :options="formationOptions" />
      </AppField>

      <AppField
        layout="stack"
        :label="t('coach.form.style')"
        :hint="t(`coach.styleHints.${style}`)"
      >
        <AppButtonGroup v-model="style" :options="styleOptions" block />
      </AppField>

      <div class="mgr-actions">
        <AppButton variant="danger" size="xs" @click="store.setManagerTeam(tournamentId, null)">
          {{ t("manager.settings.standDown") }}
        </AppButton>
      </div>
    </template>
  </AppCard>
</template>

<style scoped>
.mgr-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--sp-2);
}
</style>
