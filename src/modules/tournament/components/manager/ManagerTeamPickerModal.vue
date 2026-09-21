<script setup lang="ts">
/** Taking a job. Offered from the detail header, only before a ball is kicked. */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppField, AppSelect, AppSheet } from "@/components/ui"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import { logEvent } from "@/composables/useAnalytics"

const props = defineProps<{ tournamentId: string }>()
const emit = defineEmits<{ close: []; confirmed: [] }>()

const { t } = useI18n()
const store = useTournamentStore()
const teamsStore = useTeamsStore()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

const tournament = computed(() => store.tournaments.find((x) => x.id === props.tournamentId))

const teamOptions = computed(() =>
  (tournament.value?.teamIds ?? [])
    .map((id) => teamsStore.teams.find((tm) => tm.id === id))
    .filter((tm): tm is NonNullable<typeof tm> => !!tm)
    .map((tm) => ({ value: tm.id, label: tm.name }))
)

const teamId = ref("")

function confirm() {
  if (!teamId.value) return
  const teamName = teamsStore.teams.find((tm) => tm.id === teamId.value)?.name
  store.setManagerTeam(props.tournamentId, teamId.value)
  void logEvent("manager_mode_started", { format: tournament.value?.format, team: teamName })
  emit("confirmed")
  sheet.value?.close()
}
</script>

<template>
  <AppSheet ref="sheet" :title="t('manager.settings.title')" @close="emit('close')">
    <div class="tp-body">
      <p class="tp-hint">{{ t("manager.settings.hint") }}</p>
      <AppField layout="stack" :label="t('manager.settings.team')">
        <AppSelect
          v-model="teamId"
          :options="teamOptions"
          searchable
          :placeholder="t('manager.settings.placeholder')"
        />
      </AppField>
    </div>

    <template #footer>
      <div class="tp-footer">
        <AppButton variant="filled" :disabled="!teamId" @click="confirm">
          {{ t("common.save") }}
        </AppButton>
        <AppButton @click="sheet?.close()">{{ t("common.cancel") }}</AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped>
.tp-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-3);
}
.tp-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.tp-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
</style>
