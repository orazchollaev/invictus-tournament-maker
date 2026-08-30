<script setup lang="ts">
/**
 * Group-stage config, used by both the create page and the settings page.
 * The difference between them is what a draw method means at that moment: on
 * the create page there is nothing to draw yet, so it explains the options; on
 * the settings page there is a fixture, so it offers to redraw it.
 */
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton } from "@/components/ui"
import { showConfirm } from "@/composables/useDialog"
import { useTournamentStore } from "@/modules/tournament/store"
import GroupConfigFields from "./GroupConfigFields.vue"
import type { GroupConfigPayload } from "./types"

const props = withDefaults(
  defineProps<
    GroupConfigPayload & {
      teamCount: number
      /** Set only once the tournament exists — it turns the draw card into a redraw. */
      tournamentId?: string
      /** Results exist, so the shape and the draw are settled. */
      hasAnyResults?: boolean
      /** The group stage is over, so who qualifies is settled too. */
      groupsDone?: boolean
    }
  >(),
  { hasAnyResults: false, groupsDone: false }
)

const emit = defineEmits<{ save: [GroupConfigPayload]; close: []; openManualDraw: [] }>()

const { t } = useI18n()
const store = useTournamentStore()

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

async function handleRedraw() {
  if (!props.tournamentId) return
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
    :title="t('tournament.create.config.groups')"
    width="420px"
    @close="emit('close')"
  >
    <GroupConfigFields
      v-model:draw-type="drawType"
      v-model:group-count="groupCount"
      v-model:qualifiers-per-group="qualifiersPerGroup"
      v-model:wildcard-count="wildcardCount"
      v-model:group-leg-mode="groupLegMode"
      v-model:tiebreaker="tiebreaker"
      v-model:win-points="winPoints"
      v-model:draw-points="drawPoints"
      v-model:loss-points="lossPoints"
      :team-count="teamCount"
      :locked="hasAnyResults"
      :qualification-locked="groupsDone"
    >
      <template v-if="tournamentId" #draw-action>
        <button @click="handleRedraw">
          {{ t("tournament.settingsPage.drawMethod.regenerate") }}
        </button>
      </template>

      <template v-else #draw-hint>
        <div class="hint-box hint-box--bottom">
          {{
            t("tournament.create.drawHint", {
              random: t("common.random"),
              seeded: t("common.seeded"),
              manual: t("common.manual"),
            })
          }}
        </div>
      </template>
    </GroupConfigFields>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>
