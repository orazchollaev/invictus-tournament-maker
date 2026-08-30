<script setup lang="ts">
/**
 * How teams level on points are separated. Never locks: it decides how an
 * existing table is read, so it stays editable after results exist.
 */
import { useI18n } from "vue-i18n"
import { AppButtonGroup } from "@/components/ui"
import type { Tiebreaker } from "@/modules/tournament/types"

const tiebreaker = defineModel<Tiebreaker>({ required: true })

const { t } = useI18n()
</script>

<template>
  <div class="form-card">
    <div class="form-section-title">{{ t("tournament.create.tiebreaker") }}</div>
    <div class="form-row">
      <span class="form-label form-label--md">
        {{ t("tournament.settingsPage.tiebreaker.method") }}
      </span>
      <AppButtonGroup
        v-model="tiebreaker"
        :options="[
          { value: 'head-to-head', label: t('tournament.settingsPage.tiebreaker.h2h') },
          { value: 'goal-diff', label: t('tournament.settingsPage.tiebreaker.goalDiff') },
        ]"
      />
    </div>
  </div>
</template>
