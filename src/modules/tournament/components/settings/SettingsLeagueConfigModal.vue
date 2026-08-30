<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import type { LegMode, Tiebreaker } from "@/modules/tournament/types"
import { AppModal, AppButton, AppStepper, AppButtonGroup } from "@/components/ui"
import TspLockedCard from "./TspLockedCard.vue"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { ScoringFields, TiebreakerField } from "@/modules/tournament/components/config"

export interface LeagueConfigPayload {
  leagueLegMode: LegMode
  tierCount: number
  promotionCount: number
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}

const props = defineProps<
  LeagueConfigPayload & {
    hasAnyResults: boolean
    isMultiTier: boolean
    maxTierCount: number
    maxPromotionCount: number
  }
>()
const emit = defineEmits<{ save: [LeagueConfigPayload]; close: [] }>()
const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const leagueLegMode = ref(props.leagueLegMode)
const tierCount = ref(props.tierCount)
const promotionCount = ref(props.promotionCount)
const tiebreaker = ref(props.tiebreaker)
const winPoints = ref(props.winPoints)
const drawPoints = ref(props.drawPoints)
const lossPoints = ref(props.lossPoints)

function handleSave() {
  emit("save", {
    leagueLegMode: leagueLegMode.value,
    tierCount: tierCount.value,
    promotionCount: promotionCount.value,
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
    :title="t('tournament.create.config.league')"
    width="420px"
    @close="emit('close')"
  >
    <TspLockedCard
      :title="t('tournament.settingsPage.leagueFormat.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.leagueFormat.lockedBanner')"
    >
      <div class="form-row">
        <span class="form-label">{{ t("tournament.create.roundFormat") }}</span>
        <AppButtonGroup v-model="leagueLegMode" :options="multiLegOptions" />
      </div>
    </TspLockedCard>

    <template v-if="isMultiTier">
      <TspLockedCard
        :title="t('tournament.settingsPage.leagueFormat.divisions.title')"
        :locked="hasAnyResults"
        :locked-message="t('tournament.settingsPage.leagueFormat.divisions.lockedBanner')"
      >
        <AppStepper
          v-model="tierCount"
          :label="t('tournament.settingsPage.leagueFormat.numberOfDivisions')"
          :min="2"
          :max="maxTierCount"
          :hint="t('tournament.settingsPage.leagueFormat.minTeams')"
        />
        <AppStepper
          v-model="promotionCount"
          :label="t('tournament.create.promotionRelegation')"
          :min="1"
          :max="maxPromotionCount"
          :hint="t('tournament.settingsPage.leagueFormat.slotsSwapped')"
        />
      </TspLockedCard>
    </template>

    <TiebreakerField v-model="tiebreaker" />

    <ScoringFields
      v-model:win-points="winPoints"
      v-model:draw-points="drawPoints"
      v-model:loss-points="lossPoints"
      :locked="hasAnyResults"
    />

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./settings.css"></style>
