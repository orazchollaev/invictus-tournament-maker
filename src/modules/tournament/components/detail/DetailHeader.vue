<script setup lang="ts">
import { computed } from "vue"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Settings,
  Sheet,
  Zap,
} from "@lucide/vue"
import { AppButton, AppIcon, AppSelect } from "@/components/ui"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  isFinished: boolean
  /** Every group is done and the bracket hasn't been seeded yet. */
  showAdvance: boolean
  /** The (top-tier) season is finished, playoff enabled, not yet started. */
  showStartPlayoff: boolean
  /** A spreadsheet is being built — the button waits rather than stacking exports. */
  isExporting?: boolean
  /** Every recorded season of this tournament, oldest first. One entry (or
   *  none) means there is nothing to switch to, so the picker hides. */
  seasons: { value: string; label: string }[]
  currentSeasonId: string
  /** Manager mode: the user owes the season a match of his own, so bulk
   *  simulation is off the table until he has played it. */
  managerBlocked?: boolean
}>()

const emit = defineEmits<{
  back: []
  openNewSeason: []
  simulateAll: []
  openSettings: []
  advance: []
  startPlayoff: []
  exportExcel: []
  switchSeason: [id: string]
}>()

const { t } = useI18n()

const seasonModel = computed({
  get: () => props.currentSeasonId,
  set: (id: string) => emit("switchSeason", id),
})

// `seasons` is oldest-first, so the index also doubles as the step direction.
const seasonIndex = computed(() =>
  props.seasons.findIndex((s) => s.value === props.currentSeasonId)
)
const prevSeasonId = computed(() => props.seasons[seasonIndex.value - 1]?.value)
const nextSeasonId = computed(() => props.seasons[seasonIndex.value + 1]?.value)

function goToSeason(id: string | undefined) {
  if (id) emit("switchSeason", id)
}

function onLevelUp() {
  if (props.showAdvance) emit("advance")
  else emit("startPlayoff")
}
</script>

<template>
  <div class="t-header">
    <div class="t-header-top">
      <AppButton
        icon-only
        class="header-icon-btn back-btn"
        :aria-label="t('common.back')"
        @click="emit('back')"
      >
        <AppIcon :icon="ArrowLeft" size="md" />
      </AppButton>
      <div v-if="seasons.length > 1" class="t-season-switcher">
        <button
          class="t-season-nav"
          :disabled="!prevSeasonId"
          :aria-label="t('tournament.previousSeason')"
          @click="goToSeason(prevSeasonId)"
        >
          <ChevronLeft :size="14" />
        </button>
        <AppSelect v-model="seasonModel" size="sm" :options="seasons" class="t-season-select" />
        <button
          class="t-season-nav"
          :disabled="!nextSeasonId"
          :aria-label="t('tournament.nextSeason')"
          @click="goToSeason(nextSeasonId)"
        >
          <ChevronRight :size="14" />
        </button>
      </div>
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
          :disabled="managerBlocked"
          :title="managerBlocked ? t('manager.settings.blocked') : t('tournament.simulateAll')"
          @click="emit('simulateAll')"
        >
          <AppIcon :icon="Zap" size="md" />
        </AppButton>
        <AppButton
          icon-only
          class="header-icon-btn"
          :disabled="isExporting"
          :title="t('tournament.exportExcel')"
          @click="emit('exportExcel')"
        >
          <AppIcon :icon="Sheet" size="md" />
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
