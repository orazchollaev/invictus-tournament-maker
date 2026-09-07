<script setup lang="ts">
import { ArrowLeft, Check, RefreshCw, Settings, Zap } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  isFinished: boolean
  /** Every group is done and the bracket hasn't been seeded yet. */
  showAdvance: boolean
  /** The (top-tier) season is finished, playoff enabled, not yet started. */
  showStartPlayoff: boolean
}>()

const emit = defineEmits<{
  openNewSeason: []
  simulateAll: []
  openSettings: []
  advance: []
  startPlayoff: []
}>()

const { t } = useI18n()

function onLevelUp() {
  if (props.showAdvance) emit("advance")
  else emit("startPlayoff")
}
</script>

<template>
  <div class="t-header">
    <div class="t-header-top">
      <RouterLink to="/tournaments" class="back-link">
        <ArrowLeft :size="14" />
        {{ t("nav.tournaments") }}
      </RouterLink>
      <div class="t-header-actions">
        <AppButton v-if="isFinished" variant="filled" icon-only @click="emit('openNewSeason')">
          <AppIcon :icon="RefreshCw" size="sm" />
        </AppButton>
        <AppButton
          v-if="showAdvance || showStartPlayoff"
          icon-only
          class="header-icon-btn"
          variant="filled"
          :title="showAdvance ? t('tournament.advanceToKnockout') : t('leaguePlayoff.startPlayoff')"
          @click="onLevelUp"
        >
          <AppIcon :icon="Check" size="md" />
        </AppButton>
        <AppButton
          v-if="!isFinished"
          icon-only
          class="header-icon-btn"
          :title="t('tournament.simulateAll')"
          @click="emit('simulateAll')"
        >
          <AppIcon :icon="Zap" size="md" />
        </AppButton>
        <AppButton
          icon-only
          class="header-icon-btn"
          :title="t('tournament.settings')"
          @click="emit('openSettings')"
        >
          <AppIcon :icon="Settings" size="md" />
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style src="./detail.css"></style>
