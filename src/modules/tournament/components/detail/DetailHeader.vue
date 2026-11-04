<script setup lang="ts">
/**
 * Top of the tournament page, kept to one compact row: back, the name with
 * its season switcher, and the actions.
 *
 * Every action used to be an unlabelled icon in this row, with the same check
 * mark meaning both "saved" and "advance to the knockout". Now only a step the
 * tournament is waiting on (advance, start the playoff, a new season) gets a
 * labelled button; Save shows only while there is something to save; and the
 * rest — simulate all, manager mode, settings — sit behind the ⋯ menu.
 */
import { computed } from "vue"
import { ArrowLeft, ArrowRight, RefreshCw, Save, Settings, UserCog, Zap } from "@lucide/vue"
import { AppButton, AppIcon, AppMenu, AppSelect, type AppMenuItem } from "@/components/ui"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  name: string
  season: number
  isFinished: boolean
  /** Every group is done and the bracket hasn't been seeded yet. */
  showAdvance: boolean
  /**
   * Overrides the Advance button's label. The custom format names the phase it
   * is about to draw, since "Advance to Knockout" says nothing when the next
   * stage is a table the user called something else.
   */
  advanceLabel?: string
  /** The (top-tier) season is finished, playoff enabled, not yet started. */
  showStartPlayoff: boolean
  /** Every recorded season of this tournament, oldest first. One entry (or
   *  none) means there is nothing to switch to, so the picker hides. */
  seasons: { value: string; label: string }[]
  currentSeasonId: string
  /** Manager mode: the user owes the season a match of his own, so bulk
   *  simulation is off the table until he has played it. */
  managerBlocked?: boolean
  /** No manager yet, and the season hasn't played a match — the only window
   *  in which taking charge of a side is still on offer. */
  canBecomeManager?: boolean
  /** Changes since the last save; the Save button shows only while there are some. */
  unsaved?: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  back: []
  openNewSeason: []
  simulateAll: []
  openSettings: []
  advance: []
  startPlayoff: []
  openManagerPicker: []
  save: []
  switchSeason: [id: string]
}>()

const { t } = useI18n()

const seasonModel = computed({
  get: () => props.currentSeasonId,
  set: (id: string) => emit("switchSeason", id),
})

/** A step the tournament is waiting on, if any. */
const nextStep = computed(() => {
  if (props.showAdvance) {
    return {
      label: props.advanceLabel ?? t("tournament.advanceToKnockout"),
      icon: ArrowRight,
      run: () => emit("advance"),
    }
  }
  if (props.showStartPlayoff) {
    return {
      label: t("leaguePlayoff.startPlayoff"),
      icon: ArrowRight,
      run: () => emit("startPlayoff"),
    }
  }
  if (props.isFinished) {
    return { label: t("tournament.newSeason"), icon: RefreshCw, run: () => emit("openNewSeason") }
  }
  return null
})

type MenuKey = "simulateAll" | "manager" | "settings"

const menuItems = computed(() => {
  const items: AppMenuItem<MenuKey>[] = []
  if (!props.isFinished) {
    items.push({
      key: "simulateAll",
      label: props.managerBlocked ? t("manager.settings.blocked") : t("tournament.simulateAll"),
      icon: Zap,
      disabled: props.managerBlocked,
    })
  }
  if (props.canBecomeManager) {
    items.push({ key: "manager", label: t("manager.settings.title"), icon: UserCog })
  }
  items.push({ key: "settings", label: t("tournament.settings"), icon: Settings })
  return items
})

function onMenu(key: MenuKey) {
  if (key === "simulateAll") emit("simulateAll")
  else if (key === "manager") emit("openManagerPicker")
  else emit("openSettings")
}
</script>

<template>
  <header class="dh">
    <AppButton icon-only :aria-label="t('common.back')" @click="emit('back')">
      <AppIcon :icon="ArrowLeft" size="md" />
    </AppButton>

    <div class="dh-identity">
      <h1 class="dh-title">{{ name }}</h1>
      <!-- A plain text dropdown under the name; AppSelect's field look is
           stripped in detail.css. -->
      <span v-if="seasons.length > 1" class="dh-season-select">
        <AppSelect v-model="seasonModel" size="sm" :options="seasons" />
      </span>
      <span v-else class="dh-season">{{ t("tournament.header.season", { n: season }) }}</span>
    </div>

    <div class="dh-actions">
      <AppButton
        v-if="unsaved"
        icon-only
        variant="tonal"
        :disabled="saving"
        :title="t('tournament.save')"
        :aria-label="t('tournament.save')"
        @click="emit('save')"
      >
        <AppIcon :icon="Save" size="md" />
      </AppButton>
      <AppButton
        v-if="nextStep"
        size="sm"
        variant="filled"
        class="dh-next"
        :title="nextStep.label"
        @click="nextStep.run"
      >
        <AppIcon :icon="nextStep.icon" size="sm" />
        <span class="dh-next-label">{{ nextStep.label }}</span>
      </AppButton>
      <AppMenu :items="menuItems" :label="t('tournament.header.more')" @select="onMenu" />
    </div>
  </header>
</template>

<style src="./detail.css"></style>
