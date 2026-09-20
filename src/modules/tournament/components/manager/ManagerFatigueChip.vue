<script setup lang="ts">
/**
 * A player's stamina, wherever a manager screen lists players — the
 * starting-XI slot picker, the substitution sheet, the live on-pitch list.
 * One place so the colour bands and the wording never drift between them.
 * Reads high (100%) when fresh and low (0%) when spent — the opposite
 * direction from the `fatigue` value it is fed, which is how
 * engine/fatigue.ts itself thinks about it.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppChip } from "@/components/ui"
import { fatigueLevel, staminaPercent } from "@/modules/tournament/utils/managerFatigue"

const props = defineProps<{
  /** 0-1, or absent when there is no fatigue data for this player. */
  fatigue?: number
}>()

const { t } = useI18n()

const level = computed(() => fatigueLevel(props.fatigue))
const variant = computed(() => {
  if (level.value === "exhausted") return "danger"
  if (level.value === "tired") return "warning"
  return "success"
})
</script>

<template>
  <AppChip
    v-if="level"
    square
    size="xs"
    :variant="variant"
    :title="t(`manager.lineup.fatigue.${level}`)"
  >
    {{ staminaPercent(fatigue) }}%
  </AppChip>
</template>
