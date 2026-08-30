<script setup lang="ts">
/**
 * The group-stage shape controls, shared by the create page and the settings
 * page so the two can never drift apart again — they used to be a modal each,
 * and the copies had grown different qualification hints and different
 * clamping behaviour.
 *
 * `locked` follows the settings-page convention: once results exist the
 * fixture cannot be redrawn, so those cards collapse to a lock banner.
 * Qualification locks separately, on the group stage being finished.
 */
import { computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import { AppStepper, AppButtonGroup } from "@/components/ui"
import type { DrawType, LegMode, Tiebreaker } from "@/modules/tournament/types"
import { useGroupSizeHint } from "@/modules/tournament/composables/useGroupSizeHint"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { TspLockedCard } from "@/modules/tournament/components/settings"

const props = withDefaults(
  defineProps<{
    teamCount: number
    locked?: boolean
    qualificationLocked?: boolean
  }>(),
  { locked: false, qualificationLocked: false }
)

const drawType = defineModel<DrawType>("drawType", { required: true })
const groupCount = defineModel<number>("groupCount", { required: true })
const qualifiersPerGroup = defineModel<number>("qualifiersPerGroup", { required: true })
const wildcardCount = defineModel<number>("wildcardCount", { required: true })
const groupLegMode = defineModel<LegMode>("groupLegMode", { required: true })
const tiebreaker = defineModel<Tiebreaker>("tiebreaker", { required: true })
const winPoints = defineModel<number>("winPoints", { required: true })
const drawPoints = defineModel<number>("drawPoints", { required: true })
const lossPoints = defineModel<number>("lossPoints", { required: true })

const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

const minGroups = 2
const minQpg = 1
const maxGroups = computed(() => Math.floor(props.teamCount / 2))
const maxQpg = computed(() =>
  groupCount.value > 0 ? Math.floor(props.teamCount / groupCount.value) : 2
)

// Every group can offer a wildcard only while at least one team per group is
// still missing out — otherwise everyone already qualifies.
const showWildcards = computed(() => qualifiersPerGroup.value < maxQpg.value)

const groupSizeHint = useGroupSizeHint(
  () => props.teamCount,
  () => groupCount.value
)

const drawOptions = computed(() => [
  { value: "random" as const, label: t("common.random") },
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "manual" as const, label: t("common.manual") },
])

// The team count moves under the form — teams are picked on the create page
// and edited on the settings page — so a draft that was valid a moment ago has
// to be pulled back inside the new limits rather than saved as-is.
watch(maxGroups, (max) => {
  groupCount.value = Math.max(minGroups, Math.min(groupCount.value, max))
})
watch(maxQpg, (max) => {
  qualifiersPerGroup.value = Math.max(minQpg, Math.min(qualifiersPerGroup.value, max))
})
watch(showWildcards, (canHaveWildcards) => {
  if (!canHaveWildcards) wildcardCount.value = 0
})
watch(groupCount, (count) => {
  wildcardCount.value = Math.min(wildcardCount.value, count)
})
</script>

<template>
  <TspLockedCard
    :title="t('tournament.create.drawMethod')"
    :locked="locked"
    :locked-message="t('tournament.settingsPage.drawMethod.lockedBanner')"
  >
    <div class="form-row">
      <AppButtonGroup v-model="drawType" :options="drawOptions" />
      <slot name="draw-action" />
    </div>
    <slot name="draw-hint" />
  </TspLockedCard>

  <TspLockedCard
    :title="t('tournament.settingsPage.groupStructure.title')"
    :locked="locked"
    :locked-message="t('tournament.settingsPage.groupStructure.lockedBanner')"
  >
    <AppStepper
      v-model="groupCount"
      :label="t('tournament.create.groups')"
      :min="minGroups"
      :max="maxGroups"
      :hint="groupSizeHint"
    />
  </TspLockedCard>

  <TspLockedCard
    :title="t('tournament.settingsPage.qualification.title')"
    :locked="qualificationLocked"
    :locked-message="t('tournament.settingsPage.qualification.lockedBanner')"
  >
    <AppStepper
      v-model="qualifiersPerGroup"
      :label="t('tournament.settingsPage.qualification.teamsAdvance')"
      :min="minQpg"
      :max="maxQpg"
      :hint="
        t('tournament.settingsPage.qualification.reachKnockout', {
          n: qualifiersPerGroup * groupCount,
        })
      "
    />
    <AppStepper
      v-if="showWildcards"
      v-model="wildcardCount"
      :label="t('tournament.create.wildcards')"
      :min="0"
      :max="groupCount"
      :hint="
        t('tournament.settingsPage.qualification.total', {
          n: qualifiersPerGroup * groupCount + wildcardCount,
        })
      "
    />
  </TspLockedCard>

  <TspLockedCard
    :title="t('tournament.settingsPage.legsPerMatch.title')"
    :locked="locked"
    :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
  >
    <AppButtonGroup v-model="groupLegMode" :options="multiLegOptions" />
  </TspLockedCard>

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
