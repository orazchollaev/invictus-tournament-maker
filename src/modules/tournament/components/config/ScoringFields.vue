<script setup lang="ts">
/**
 * Points per win, draw and loss. Every table-based format offers the same
 * three, so the card lives here rather than being retyped per modal.
 */
import { useI18n } from "vue-i18n"
import { AppStepper } from "@/components/ui"
import { TspLockedCard } from "@/modules/tournament/components/settings"

withDefaults(defineProps<{ locked?: boolean }>(), { locked: false })

const winPoints = defineModel<number>("winPoints", { required: true })
const drawPoints = defineModel<number>("drawPoints", { required: true })
const lossPoints = defineModel<number>("lossPoints", { required: true })

const { t } = useI18n()
</script>

<template>
  <TspLockedCard
    :title="t('tournament.settingsPage.scoring.title')"
    :locked="locked"
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
</template>
