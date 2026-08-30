<script setup lang="ts">
/**
 * Swiss shape editor, used by both the create page and the settings page.
 * They had a modal each; the copies were identical bar the lock, so the lock
 * is a prop now.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton } from "@/components/ui"
import { validateSwissConfig } from "@/engine"
import SwissConfigFields from "./SwissConfigFields.vue"
import type { SwissConfigPayload } from "./types"

const props = withDefaults(
  defineProps<
    SwissConfigPayload & {
      teamCount: number
      /** Once a result exists the fixture cannot be redrawn, so the shape locks. */
      hasAnyResults?: boolean
    }
  >(),
  { hasAnyResults: false }
)

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

/**
 * An unsatisfiable shape would silently fall back to a potless draw, so the
 * user has to fix it here rather than find out after the tournament exists.
 * A locked tournament is already drawn, so there is nothing left to validate.
 */
const errors = computed(() =>
  props.hasAnyResults
    ? []
    : validateSwissConfig(
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
      :locked="hasAnyResults"
    />

    <template #footer>
      <AppButton variant="filled" block :disabled="errors.length > 0" @click="handleSave">
        {{ t("common.save") }}
      </AppButton>
    </template>
  </AppModal>
</template>
