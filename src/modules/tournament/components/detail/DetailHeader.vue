<script setup lang="ts">
import { ArrowLeft, RefreshCw, Settings, Zap } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"

defineProps<{
  isFinished: boolean
}>()

const emit = defineEmits<{
  openNewSeason: []
  simulateAll: []
  openSettings: []
}>()

const { t } = useI18n()
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

<style src="./tournament-detail.css"></style>
