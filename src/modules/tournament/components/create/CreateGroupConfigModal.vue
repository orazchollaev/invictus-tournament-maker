<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton, AppStepper, BtnGroup } from "@/components/ui"
import type { LegMode, Tiebreaker } from "@/modules/tournament/types"
import { useGroupSizeHint } from "../../composables/useGroupSizeHint"
import { useLegOptions } from "../../composables/useLegOptions"

type DrawType = "random" | "seeded" | "manual"

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
    selectedCount: number
  }
>()
const emit = defineEmits<{ save: [GroupConfigPayload]; close: [] }>()

const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

// Local draft — nothing is written back to the caller until "Save" is
// clicked. Closing any other way (X, backdrop, Escape) discards it.
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

const minGroups = 2
const minQpg = 1
const maxGroups = computed(() => Math.floor(props.selectedCount / 2))
const maxQpg = computed(() =>
  groupCount.value > 0 ? Math.floor(props.selectedCount / groupCount.value) : 2
)
const maxWildcards = computed(() => {
  const minGroupSize = Math.floor(props.selectedCount / groupCount.value)
  return qualifiersPerGroup.value < minGroupSize ? groupCount.value : 0
})
const groupSizeHint = useGroupSizeHint(
  () => props.selectedCount,
  () => groupCount.value
)

const drawOptions = computed(() => [
  { value: "random" as const, label: t("common.random") },
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "manual" as const, label: t("common.manual") },
])

watch(maxGroups, (max) => {
  groupCount.value = Math.max(minGroups, Math.min(groupCount.value, max))
})
watch(maxQpg, (max) => {
  qualifiersPerGroup.value = Math.max(minQpg, Math.min(qualifiersPerGroup.value, max))
})
watch(maxWildcards, (max) => {
  wildcardCount.value = Math.min(wildcardCount.value, max)
})

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
    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.create.drawMethod") }}</div>
      <BtnGroup v-model="drawType" :options="drawOptions" />
      <div class="hint-box hint-box--bottom">
        {{
          t("tournament.create.drawHint", {
            random: t("common.random"),
            seeded: t("common.seeded"),
            manual: t("common.manual"),
          })
        }}
      </div>
    </div>

    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.create.groups") }}</div>
      <AppStepper
        v-model="groupCount"
        :label="t('tournament.create.groups')"
        :min="minGroups"
        :max="maxGroups"
        :hint="groupSizeHint"
      />
      <AppStepper
        v-model="qualifiersPerGroup"
        :label="t('tournament.create.advance')"
        :min="minQpg"
        :max="maxQpg"
        :hint="`${t('tournament.create.perGroup')} → ${
          qualifiersPerGroup * groupCount
        } ${t('tournament.create.reachKnockout')}`"
      />
      <AppStepper
        v-if="maxWildcards > 0"
        v-model="wildcardCount"
        :label="t('tournament.create.wildcards')"
        :min="0"
        :max="maxWildcards"
        :hint="`→ ${qualifiersPerGroup * groupCount + wildcardCount} ${t('tournament.create.total')}`"
      />
    </div>

    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
      <div class="form-row">
        <BtnGroup v-model="groupLegMode" :options="multiLegOptions" />
      </div>
    </div>

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

    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.settingsPage.scoring.title") }}</div>
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
    </div>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./create-tournament.css"></style>
