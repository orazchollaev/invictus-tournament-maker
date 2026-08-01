<script setup lang="ts">
import { ref, computed } from "vue"
import { History, Shuffle, ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppIcon, AppModal } from "@/components/ui"
import { NewSeasonChoice, NewSeasonTeamList } from "./new-season"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"

/** A tournament needs at least two teams to draw. */
const MIN_TEAMS = 2
/** Matches AppModal's close animation so the emit lands after it unmounts. */
const CLOSE_MS = 220

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
}>()

const emit = defineEmits<{
  useOldDraw: []
  startDraw: [teamIds: string[]]
  cancel: []
}>()

const { t } = useI18n()

const appModal = ref<InstanceType<typeof AppModal>>()

type Step = "choice" | "manage"
const step = ref<Step>("choice")
const localTeamIds = ref<string[]>([...props.tournament.teamIds])

const currentTeams = computed(
  () =>
    localTeamIds.value
      .map((id) => props.allTeams.find((tm) => tm.id === id))
      .filter(Boolean) as Team[]
)

// Uses allTeams so teams removed from the tournament reappear in the pool.
const freeTeams = computed(() => {
  const chosen = new Set(localTeamIds.value)
  return props.allTeams.filter((tm) => !chosen.has(tm.id))
})

function addTeam(id: string) {
  if (!localTeamIds.value.includes(id)) localTeamIds.value.push(id)
}

function removeTeam(id: string) {
  localTeamIds.value = localTeamIds.value.filter((x) => x !== id)
}

/** Close first, emit after the animation — the parent unmounts us on emit. */
function closeThen(action: () => void) {
  appModal.value?.close()
  setTimeout(action, CLOSE_MS)
}
</script>

<template>
  <AppModal ref="appModal" @close="emit('cancel')">
    <template #title>
      {{ t("tournament.newSeason") }} — {{ tournament.name }}
      <span class="season-tag">S{{ tournament.season + 1 }}</span>
    </template>

    <div v-if="step === 'choice'" class="choices">
      <NewSeasonChoice
        :icon="History"
        :label="t('tournament.newSeasonModal.useOldDraw')"
        :description="t('tournament.newSeasonModal.useOldDrawDesc', { n: tournament.season })"
        @click="closeThen(() => emit('useOldDraw'))"
      />
      <NewSeasonChoice
        :icon="Shuffle"
        :label="t('tournament.newSeasonModal.newDraw')"
        :description="t('tournament.newSeasonModal.newDrawDesc')"
        @click="step = 'manage'"
      />
    </div>

    <div v-else class="manage">
      <button class="back" @click="step = 'choice'">
        <AppIcon :icon="ArrowLeft" size="sm" />
        {{ t("common.back") }}
      </button>

      <NewSeasonTeamList
        :title="t('tournament.newSeasonModal.currentTeams')"
        :teams="currentTeams"
        action="remove"
        :action-disabled="currentTeams.length <= MIN_TEAMS"
        :action-title="t('common.remove')"
        :empty-text="t('tournament.newSeasonModal.noTeams')"
        @act="removeTeam"
      />

      <NewSeasonTeamList
        :title="t('tournament.newSeasonModal.availableTeams')"
        :teams="freeTeams"
        action="add"
        :empty-text="t('tournament.newSeasonModal.noAvailable')"
        @act="addTeam"
      />
    </div>

    <template v-if="step === 'manage'" #footer>
      <AppButton
        variant="filled"
        size="md"
        :disabled="localTeamIds.length < MIN_TEAMS"
        @click="closeThen(() => emit('startDraw', [...localTeamIds]))"
      >
        <AppIcon :icon="Shuffle" />
        {{ t("drawCeremony.startDraw") }}
        <AppChip variant="solid">{{ t("common.teams", { n: localTeamIds.length }) }}</AppChip>
      </AppButton>
      <AppButton @click="closeThen(() => emit('cancel'))">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.season-tag {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-muted);
  margin-left: var(--sp-2);
}

.choices {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.manage {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--dur-fast) var(--ease);
}
.back:hover {
  color: var(--text);
}
</style>
