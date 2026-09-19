<script setup lang="ts">
/**
 * Which finishing places an edge carries. This is where the format is actually
 * decided — "1 to 8 out of four groups" is the top two of each group, and
 * "9 to 10" is the two best third-placed sides.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppSheet, AppButton, AppStepper } from "@/components/ui"
import type { PhaseEdge } from "@/modules/tournament/types"

const props = defineProps<{
  edge: PhaseEdge
  sourceName: string
  targetName: string
  /** The source phase's field size — the highest place there is to take. */
  available: number
  /**
   * True when the source is a group phase: who advances is set there, by
   * qualifiers and wildcards, so there is no range to pick here. The sheet then
   * says where the number comes from instead of offering a control that would
   * be ignored.
   */
  derived?: boolean
  /** How many teams the connection carries, however that was decided. */
  carried: number
}>()

const emit = defineEmits<{ save: [fromRank: number, toRank: number]; remove: []; close: [] }>()

const { t } = useI18n()
const sheetRef = ref<InstanceType<typeof AppSheet>>()

const fromRank = ref(props.edge.fromRank)
const toRank = ref(props.edge.toRank)

const max = computed(() => Math.max(1, props.available))
const count = computed(() => Math.max(0, toRank.value - fromRank.value + 1))

function handleSave() {
  // The lower bound leads: raising it past the upper one means the user is
  // moving the window, not inverting it.
  const from = Math.min(fromRank.value, max.value)
  emit("save", from, Math.max(from, Math.min(toRank.value, max.value)))
  sheetRef.value?.close()
}

function handleRemove() {
  emit("remove")
  sheetRef.value?.close()
}
</script>

<template>
  <AppSheet
    ref="sheetRef"
    :title="t('tournament.phases.range.title')"
    :subtitle="t('tournament.phases.range.subtitle', { from: sourceName, to: targetName })"
    @close="emit('close')"
  >
    <div class="phase-sheet-body">
      <div class="form-card">
        <template v-if="derived">
          <p class="phase-config-note phase-config-note--lead">
            {{ t("tournament.phases.range.groupNote", { from: sourceName }) }}
          </p>
          <p class="phase-config-note">
            {{ t("tournament.phases.range.hint", { count: carried, to: targetName }) }}
          </p>
        </template>
        <template v-else>
          <AppStepper
            v-model="fromRank"
            :label="t('tournament.phases.range.from')"
            :min="1"
            :max="max"
          />
          <AppStepper
            v-model="toRank"
            :label="t('tournament.phases.range.to')"
            :min="1"
            :max="max"
          />
          <p class="phase-config-note">
            {{ t("tournament.phases.range.hint", { count, to: targetName }) }}
          </p>
        </template>
      </div>
    </div>

    <template #footer>
      <div class="phase-sheet-footer">
        <AppButton variant="danger" @click="handleRemove">
          {{ t("tournament.phases.range.disconnect") }}
        </AppButton>
        <AppButton v-if="!derived" variant="filled" @click="handleSave">
          {{ t("common.save") }}
        </AppButton>
        <AppButton v-else variant="filled" @click="sheetRef?.close()">
          {{ t("common.close") }}
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped src="./phases.css"></style>
