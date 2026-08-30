<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton } from "@/components/ui"
import type { DrawType, LegMode, Tiebreaker } from "@/modules/tournament/types"
import { SwissConfigFields } from "@/modules/tournament/components/swiss"
import { validateSwissConfig } from "@/engine"

export interface SwissConfigPayload {
  opponentCount: number
  potCount: number
  legMode: LegMode
  balanceHomeAway: boolean
  drawType: DrawType
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}

const props = defineProps<SwissConfigPayload & { teamCount: number }>()
const emit = defineEmits<{ save: [SwissConfigPayload]; close: [] }>()

const { t } = useI18n()

const modalRef = ref<InstanceType<typeof AppModal>>()
const opponentCount = ref(props.opponentCount)
const potCount = ref(props.potCount)
const legMode = ref(props.legMode)
const balanceHomeAway = ref(props.balanceHomeAway)
const drawType = ref(props.drawType)
const tiebreaker = ref(props.tiebreaker)
const winPoints = ref(props.winPoints)
const drawPoints = ref(props.drawPoints)
const lossPoints = ref(props.lossPoints)

// An unsatisfiable shape would silently fall back to a potless draw, so the
// user has to fix it here rather than find out after the tournament exists.
const errors = computed(() =>
  validateSwissConfig(
    props.teamCount,
    opponentCount.value,
    drawType.value === "seeded" ? potCount.value : 1
  )
)

function handleSave() {
  if (errors.value.length) return
  emit("save", {
    opponentCount: opponentCount.value,
    potCount: potCount.value,
    legMode: legMode.value,
    balanceHomeAway: balanceHomeAway.value,
    drawType: drawType.value,
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
    :title="t('tournament.create.config.swiss')"
    width="420px"
    @close="emit('close')"
  >
    <SwissConfigFields
      v-model:opponent-count="opponentCount"
      v-model:pot-count="potCount"
      v-model:leg-mode="legMode"
      v-model:balance-home-away="balanceHomeAway"
      v-model:draw-type="drawType"
      v-model:tiebreaker="tiebreaker"
      v-model:win-points="winPoints"
      v-model:draw-points="drawPoints"
      v-model:loss-points="lossPoints"
      :team-count="teamCount"
    />

    <template #footer>
      <AppButton variant="filled" block :disabled="errors.length > 0" @click="handleSave">
        {{ t("common.save") }}
      </AppButton>
    </template>
  </AppModal>
</template>

<style src="./create-tournament.css"></style>
