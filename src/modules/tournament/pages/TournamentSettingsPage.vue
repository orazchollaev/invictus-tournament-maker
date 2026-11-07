<script setup lang="ts">
/**
 * Tournament settings, in the order people reach for them: what it is called,
 * who plays (and the draw), the format, per-team adjustments, then reset and
 * delete. Every edit lands in a draft; the Save bar appears only while there
 * is something to save, and leaving with unsaved changes asks first.
 */
import { ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Info, Save, SlidersHorizontal, Trophy } from "@lucide/vue"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { ManualDraw } from "@/modules/tournament/components/draw"
import { GroupDraw } from "@/modules/tournament/components/group"
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppField,
  AppIcon,
  AppModal,
  AppPageHeader,
} from "@/components/ui"
import {
  SettingsDangerZone,
  SettingsFormatCard,
  SettingsTeamAdjustments,
  SettingsTeamsCard,
} from "../components/settings"
import type { DrawType } from "../types"
import { useTournamentSettingsDraft } from "../composables/useTournamentSettingsDraft"
import { useUnsavedChangesGuard } from "@/composables/useUnsavedChangesGuard"
import { showConfirm } from "@/composables/useDialog"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() => store.getById(tournamentId.value))
const allTeams = computed(() => teamsStore.teams)
const hasAnyResults = computed(() => store.hasAnyResults(tournamentId.value))

const draft = useTournamentSettingsDraft(tournamentId, tournament)

const seasonCount = computed(
  () => store.tournaments.filter((tn) => tn.name === tournament.value?.name).length
)
const winnerTeam = computed(() => allTeams.value.find((tm) => tm.id === tournament.value?.winnerId))
const createdOn = computed(() =>
  tournament.value ? new Date(tournament.value.createdAt).toLocaleDateString() : ""
)
const localTeams = computed(() =>
  allTeams.value.filter((tm) => draft.teamIds.value.includes(tm.id))
)

// ── Draw ─────────────────────────────────────────────────────────
// A redraw works on the saved tournament, so pending edits (a team added or
// removed above all) are saved first — otherwise the new draw would ignore them.
const showManualDraw = ref(false)

async function onRedraw(mode: DrawType) {
  if (mode === "manual") {
    if (draft.hasChanges.value) draft.save()
    showManualDraw.value = true
    return
  }
  const ok = await showConfirm(t("tournament.settingsPage.drawMethod.redrawConfirm"), {
    confirmLabel: t("tournament.settingsPage.drawMethod.redrawConfirmLabel"),
  })
  if (!ok) return
  if (draft.hasChanges.value) draft.save()
  store.redrawTournament(tournamentId.value, mode === "seeded")
}

function onManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  store.redrawTournament(tournamentId.value, false, orderedIds)
}

// ── Save / leave ─────────────────────────────────────────────────
function save() {
  draft.save()
  router.push(`/tournaments/${tournamentId.value}`)
}

const leaveModal = ref<InstanceType<typeof AppModal> | null>(null)
let leaveChoice: "leave" | "save-leave" | "stay" = "stay"

// Every way out of the prompt plays the exit animation first; the choice is
// handed to the guard once the modal has gone (see @close).
function dismissLeave(choice: typeof leaveChoice) {
  leaveChoice = choice
  leaveModal.value?.close()
}

const { open: showLeaveModal, choose: chooseLeave } = useUnsavedChangesGuard({
  hasChanges: draft.hasChanges,
  onSave: draft.save,
})

function onLeaveClosed() {
  const choice = leaveChoice
  leaveChoice = "stay"
  chooseLeave(choice)
}
</script>

<template>
  <div class="page">
    <AppEmptyState v-if="!tournament" :description="t('tournament.settingsPage.notFound')">
      <template #action>
        <AppButton @click="router.push('/tournaments')">
          {{ t("tournament.settingsPage.backToTournaments") }}
        </AppButton>
      </template>
    </AppEmptyState>

    <template v-else>
      <AppPageHeader
        :title="t('tournament.settingsPage.title')"
        :subtitle="`${tournament.name} · ${t('tournament.header.season', { n: tournament.season })}`"
        @back="router.push(`/tournaments/${tournamentId}`)"
      />

      <!-- Manual draw takes over the page while it is open -->
      <AppCard v-if="showManualDraw" padding="md">
        <GroupDraw
          v-if="draft.isGroupFormat.value"
          :teams="localTeams"
          :group-count="draft.groupCount.value"
          @confirm="onManualConfirm"
          @cancel="showManualDraw = false"
        />
        <ManualDraw
          v-else
          :teams="localTeams"
          @confirm="onManualConfirm"
          @cancel="showManualDraw = false"
        />
      </AppCard>

      <div v-else class="stack">
        <AppCard padding="md">
          <template #title>
            <AppIcon :icon="Info" size="md" />
            {{ t("tournament.settingsPage.tournamentName.title") }}
          </template>

          <AppField
            layout="stack"
            :hint="
              seasonCount > 1
                ? t('tournament.settingsPage.tournamentName.hint', { n: seasonCount })
                : undefined
            "
          >
            <input
              v-model="draft.name.value"
              class="name-input"
              type="text"
              :placeholder="tournament.name"
              :aria-label="t('tournament.settingsPage.tournamentName.title')"
            />
          </AppField>

          <p class="meta">
            {{ t("tournament.header.teams", { n: tournament.teamIds.length }) }} ·
            {{ t("tournament.header.created", { date: createdOn }) }}
          </p>
          <p v-if="winnerTeam" class="meta meta--champion">
            <AppIcon :icon="Trophy" size="xs" />
            <span :style="{ color: winnerTeam.color }">{{ winnerTeam.name }}</span>
            {{ t("tournament.settingsPage.info.champion") }}
          </p>
        </AppCard>

        <SettingsTeamsCard
          v-model:team-ids="draft.teamIds.value"
          :tournament="tournament"
          :all-teams="allTeams"
          :has-any-results="hasAnyResults"
          @redraw="onRedraw"
        />

        <SettingsFormatCard
          :draft="draft"
          :tournament="tournament"
          :has-any-results="hasAnyResults"
          @open-manual-draw="showManualDraw = true"
        />

        <AppCard padding="md">
          <template #title>
            <AppIcon :icon="SlidersHorizontal" size="md" />
            {{ t("tournament.settingsPage.teamAdjustments.title") }}
          </template>
          <SettingsTeamAdjustments
            v-model:team-point-adjustments="draft.teamPointAdjustments.value"
            v-model:team-power-adjustments="draft.teamPowerAdjustments.value"
            :teams="localTeams"
            :has-any-results="hasAnyResults"
            :show-points="draft.isLeagueFormat.value || draft.isGroupFormat.value"
          />
        </AppCard>

        <SettingsDangerZone :tournament-id="tournamentId" />
      </div>

      <Transition name="save-bar">
        <div v-if="draft.hasChanges.value && !showManualDraw" class="save-bar">
          <AppButton @click="router.push(`/tournaments/${tournamentId}`)">
            {{ t("common.cancel") }}
          </AppButton>
          <AppButton variant="filled" class="save-bar-save" @click="save">
            <AppIcon :icon="Save" size="sm" />
            {{ t("tournament.settingsPage.saveChanges") }}
          </AppButton>
        </div>
      </Transition>
    </template>

    <AppModal
      v-if="showLeaveModal"
      ref="leaveModal"
      :title="t('tournament.settingsPage.unsavedChanges.title')"
      width="360px"
      @close="onLeaveClosed"
    >
      <p class="leave-msg">{{ t("tournament.settingsPage.unsavedChanges.message") }}</p>
      <div class="modal-actions">
        <AppButton @click="dismissLeave('leave')">
          {{ t("tournament.settingsPage.unsavedChanges.leave") }}
        </AppButton>
        <AppButton variant="filled" @click="dismissLeave('save-leave')">
          {{ t("tournament.settingsPage.unsavedChanges.saveAndLeave") }}
        </AppButton>
        <AppButton @click="dismissLeave('stay')">
          {{ t("tournament.settingsPage.unsavedChanges.close") }}
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.page {
  /* Room for the save bar, so it never covers the last card. */
  padding-bottom: calc(var(--sp-6) * 2 + var(--safe-bottom));
}

.name-input {
  width: 100%;
  box-sizing: border-box;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  font-size: var(--fs-base);
  font-weight: 600;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin: var(--sp-3) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.meta--champion {
  margin-top: var(--sp-1);
}
.meta--champion span {
  font-weight: 600;
}

/* Floats over the bottom of the page while there are unsaved changes. */
.save-bar {
  position: sticky;
  bottom: calc(var(--sp-3) + var(--safe-bottom));
  z-index: var(--z-sticky);
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-2);
  margin-top: var(--sp-4);
  padding: var(--sp-2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--elev-3);
}
.save-bar-save {
  flex: 1;
  justify-content: center;
}

.save-bar-enter-active,
.save-bar-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.save-bar-enter-from,
.save-bar-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.leave-msg {
  margin: 0 0 var(--sp-5);
  font-size: var(--fs-base);
  line-height: 1.5;
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .save-bar-enter-active,
  .save-bar-leave-active {
    transition: none;
  }
}
</style>
