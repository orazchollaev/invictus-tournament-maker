<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament, LegMode, DrawType, Tiebreaker } from "@/modules/tournament/types"
import { AppModal, AppButton, AppStepper, BtnGroup } from "@/components/ui"
import TspLockedCard from "./TspLockedCard.vue"
import { useTournamentStore } from "@/modules/tournament/store"
import { showConfirm } from "@/composables/useDialog"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { useGroupSizeHint } from "@/modules/tournament/composables/useGroupSizeHint"

export interface GroupConfigPayload {
  drawType: DrawType
  groupCount: number
  qualifiersPerGroup: number
  wildcardCount: number
  groupLegMode: LegMode
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}

const props = defineProps<
  GroupConfigPayload & {
    tournamentId: string
    tournament: Tournament
    hasAnyResults: boolean
    teamCount: number
  }
>()
const emit = defineEmits<{ save: [GroupConfigPayload]; close: []; openManualDraw: [] }>()
const { t } = useI18n()
const store = useTournamentStore()
const { multiLegOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const drawType = ref(props.drawType)
const groupCount = ref(props.groupCount)
const qualifiersPerGroup = ref(props.qualifiersPerGroup)
const wildcardCount = ref(props.wildcardCount)
const groupLegMode = ref(props.groupLegMode)
const tiebreaker = ref(props.tiebreaker)
const winPoints = ref(props.winPoints)
const drawPoints = ref(props.drawPoints)
const lossPoints = ref(props.lossPoints)

const maxGroups = computed(() => Math.floor(props.teamCount / 2))
const minGroups = 2
const maxQpg = computed(() => Math.floor(props.teamCount / groupCount.value))
const minQpg = 1

const groupSizeHint = useGroupSizeHint(
  () => props.teamCount,
  () => groupCount.value
)

const drawOptions = computed(() => [
  { value: "random" as const, label: t("common.random") },
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "manual" as const, label: t("common.manual") },
])

async function handleRedraw() {
  if (drawType.value === "manual") {
    emit("openManualDraw")
    return
  }
  if (
    !(await showConfirm(t("tournament.settingsPage.drawMethod.redrawConfirm"), {
      confirmLabel: t("tournament.settingsPage.drawMethod.redrawConfirmLabel"),
    }))
  )
    return
  store.redrawTournament(props.tournamentId, drawType.value === "seeded")
}

function handleSave() {
  emit("save", {
    drawType: drawType.value,
    groupCount: groupCount.value,
    qualifiersPerGroup: qualifiersPerGroup.value,
    wildcardCount: wildcardCount.value,
    groupLegMode: groupLegMode.value,
    tiebreaker: tiebreaker.value,
    winPoints: winPoints.value,
    drawPoints: drawPoints.value,
    lossPoints: lossPoints.value,
  })
  modalRef.value?.close()
}
</script>

<template>
  <AppModal
    ref="modalRef"
    :title="t('tournament.create.config.group')"
    width="420px"
    @close="emit('close')"
  >
    <TspLockedCard
      :title="t('tournament.create.drawMethod')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.drawMethod.lockedBanner')"
    >
      <div class="form-row">
        <BtnGroup v-model="drawType" :options="drawOptions" />
        <button @click="handleRedraw">
          {{ t("tournament.settingsPage.drawMethod.regenerate") }}
        </button>
      </div>
    </TspLockedCard>

    <TspLockedCard
      :title="t('tournament.settingsPage.groupStructure.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.groupStructure.lockedBanner')"
    >
      <AppStepper
        v-model="groupCount"
        :label="t('tournament.create.groups')"
        :min="minGroups"
        :max="maxGroups"
        :hint="groupSizeHint"
      />
    </TspLockedCard>

    <TspLockedCard
      :title="t('tournament.settingsPage.qualification.title')"
      :locked="!!tournament.groupsDone"
      :locked-message="t('tournament.settingsPage.qualification.lockedBanner')"
    >
      <AppStepper
        v-model="qualifiersPerGroup"
        :label="t('tournament.settingsPage.qualification.teamsAdvance')"
        :min="minQpg"
        :max="maxQpg"
        :hint="
          t('tournament.settingsPage.qualification.reachKnockout', {
            n: qualifiersPerGroup * groupCount,
          })
        "
      />
      <AppStepper
        v-if="qualifiersPerGroup < maxQpg"
        v-model="wildcardCount"
        :label="t('tournament.create.wildcards')"
        :min="0"
        :max="groupCount"
        :hint="
          t('tournament.settingsPage.qualification.total', {
            n: qualifiersPerGroup * groupCount + wildcardCount,
          })
        "
      />
    </TspLockedCard>

    <TspLockedCard
      :title="t('tournament.create.groupStage')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
    >
      <BtnGroup v-model="groupLegMode" :options="multiLegOptions" />
    </TspLockedCard>

    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.create.tiebreaker") }}</div>
      <div class="form-row">
        <span class="form-label">{{ t("tournament.settingsPage.tiebreaker.method") }}</span>
        <BtnGroup
          v-model="tiebreaker"
          :options="[
            { value: 'head-to-head', label: t('tournament.settingsPage.tiebreaker.h2h') },
            { value: 'goal-diff', label: t('tournament.settingsPage.tiebreaker.goalDiff') },
          ]"
        />
      </div>
    </div>

    <TspLockedCard
      :title="t('tournament.settingsPage.scoring.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.scoring.lockedBanner')"
    >
      <AppStepper
        v-model="winPoints"
        :label="t('tournament.settingsPage.scoring.winPoints')"
        :min="0"
        :max="10"
      />
      <AppStepper
        v-model="drawPoints"
        :label="t('tournament.settingsPage.scoring.drawPoints')"
        :min="0"
        :max="10"
      />
      <AppStepper
        v-model="lossPoints"
        :label="t('tournament.settingsPage.scoring.lossPoints')"
        :min="0"
        :max="10"
      />
    </TspLockedCard>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./tournament-settings.css"></style>
