<script setup lang="ts">
import { Lock } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{
  title: string
  locked: boolean
  lockedMessage: string
}>()
</script>

<template>
  <div class="form-card">
    <div class="form-section-header">
      <div class="form-section-title">{{ title }}</div>
      <span v-if="locked" class="tsp-lock-tag">
        <Lock :size="10" />
        {{ t("tournament.settingsPage.locked") }}
      </span>
    </div>
    <template v-if="!locked">
      <slot />
    </template>
    <div v-else class="tsp-locked-banner">
      <Lock :size="12" />
      {{ lockedMessage }}
    </div>
  </div>
</template>

<style src="./tournament-settings.css"></style>
