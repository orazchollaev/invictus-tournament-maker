<script setup lang="ts">
/**
 * Who plays, and how they were drawn. Both are open only until the first
 * result: after that the card says so instead of offering controls.
 *
 * Redraw is offered per format: a bracket or group stage can be drawn at
 * random, by seeding or by hand; a league or Swiss fixture only regenerates.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Hand, Lock, RefreshCw, Shuffle, TrendingUp, Users } from "@lucide/vue"
import { AppButton, AppCard, AppChip, AppIcon, AppMenu, type AppMenuItem } from "@/components/ui"
import type { Team } from "@/modules/teams/types"
import type { DrawType, Tournament } from "@/modules/tournament/types"
import { TeamSelectorButton, TeamSelectorFullscreenModal } from "../shared"

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
  hasAnyResults: boolean
}>()

const emit = defineEmits<{ redraw: [mode: DrawType] }>()

const teamIds = defineModel<string[]>("teamIds", { required: true })

const { t } = useI18n()

const showTeams = ref(false)

const canRedraw = computed(() => !props.hasAnyResults && props.tournament.format !== "custom")

const redrawItems = computed<AppMenuItem<DrawType>[]>(() => {
  const f = props.tournament.format
  if (f !== "bracket" && f !== "group+bracket") return []
  return [
    { key: "random", label: t("common.random"), icon: Shuffle },
    { key: "seeded", label: t("common.seeded"), icon: TrendingUp },
    { key: "manual", label: t("common.manual"), icon: Hand },
  ]
})

const redrawLabel = computed(() => t("tournament.settingsPage.drawMethod.redrawConfirmLabel"))
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Users" size="md" />
      {{ t("tournament.settingsPage.manageTeams.title") }}
    </template>
    <template #actions>
      <AppChip v-if="hasAnyResults" square>
        <AppIcon :icon="Lock" size="xs" />
        {{ t("tournament.settingsPage.locked") }}
      </AppChip>
    </template>

    <p v-if="hasAnyResults" class="locked-note">
      <AppIcon :icon="Lock" size="sm" />
      {{ t("tournament.settingsPage.manageTeams.lockedBanner") }}
    </p>

    <template v-else>
      <TeamSelectorButton
        :teams="allTeams"
        :selected="teamIds"
        :label="t('teamSelector.title')"
        @click="showTeams = true"
      />

      <div v-if="canRedraw" class="redraw-row">
        <AppMenu
          v-if="redrawItems.length"
          :items="redrawItems"
          :label="redrawLabel"
          @select="emit('redraw', $event)"
        >
          <template #trigger>
            <AppButton size="sm">
              <AppIcon :icon="RefreshCw" size="sm" />
              {{ redrawLabel }}
            </AppButton>
          </template>
        </AppMenu>
        <AppButton v-else size="sm" @click="emit('redraw', 'random')">
          <AppIcon :icon="RefreshCw" size="sm" />
          {{ redrawLabel }}
        </AppButton>
      </div>
    </template>
  </AppCard>

  <TeamSelectorFullscreenModal
    v-if="!hasAnyResults"
    v-model:open="showTeams"
    :teams="allTeams"
    :selected="teamIds"
    @update:selected="teamIds = $event"
  />
</template>

<style scoped>
.locked-note {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.redraw-row {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sp-3);
}
</style>
