<script setup lang="ts">
/**
 * One phase's own settings, opened from its node on the blueprint.
 *
 * Built from the same field components the fixed-format modals are built from
 * (ScoringFields, TiebreakerField, AppStepper, AppButtonGroup) rather than
 * wrapping those modals whole: a phase has no qualifier count and no draw
 * ceremony — the edge decides who advances — so the modals' own payloads carry
 * fields that would have no meaning here.
 *
 * Nothing is written back until Save; closing any other way discards the
 * draft, the same rule the create page's config modals follow.
 */
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { AppSheet, AppButton, AppStepper, AppButtonGroup, AppToggle } from "@/components/ui"
import type {
  KnockoutStage,
  LegMode,
  PhaseConfig,
  PhaseSeedMode,
  Tiebreaker,
  TournamentPhase,
} from "@/modules/tournament/types"
import { clampSwissOpponentCount, legModeToCount, PHASE_MIN_TEAMS } from "@/engine"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { useGroupSizeHint } from "@/modules/tournament/composables/useGroupSizeHint"
import {
  knockoutStagesForRoundCount,
  totalRoundsForSize,
} from "@/modules/tournament/composables/useKnockoutRoundStages"
import { ScoringFields, TiebreakerField } from "@/modules/tournament/components/config"

const props = defineProps<{
  phase: TournamentPhase
  /** How many teams reach this phase — every limit below is measured against it. */
  intake: number
  /** View-only: opened from a locked (already-drawn) tournament's settings. No Save. */
  readonly?: boolean
}>()

const emit = defineEmits<{ save: [PhaseConfig]; close: [] }>()

const STAGE_LABEL_KEYS: Record<KnockoutStage, string> = {
  r64: "tournament.settingsPage.legsPerMatch.r64",
  r32: "tournament.settingsPage.legsPerMatch.r32",
  r16: "tournament.settingsPage.legsPerMatch.r16",
  quarterfinal: "tournament.settingsPage.legsPerMatch.quarterFinal",
  semifinal: "tournament.settingsPage.legsPerMatch.semiFinal",
}

const { t } = useI18n()
const { multiLegOptions, leagueLegOptions } = useLegOptions()
const sheetRef = ref<InstanceType<typeof AppSheet>>()

// Local draft, one flat set of refs across all four kinds — only the fields of
// the phase's own kind are rendered, and only they are read back on save.
const cfg = props.phase.config
const legMode = ref<LegMode>(
  cfg.kind === "group"
    ? cfg.group.legMode
    : cfg.kind === "league"
      ? cfg.league.legMode
      : cfg.kind === "swiss"
        ? cfg.swiss.legMode
        : "single"
)
const tiebreaker = ref<Tiebreaker>(
  cfg.kind === "group"
    ? cfg.group.tiebreaker
    : cfg.kind === "league"
      ? cfg.league.tiebreaker
      : cfg.kind === "swiss"
        ? cfg.swiss.tiebreaker
        : "goal-diff"
)
const winPoints = ref(
  cfg.kind === "group"
    ? cfg.group.winPoints
    : cfg.kind === "league"
      ? cfg.league.winPoints
      : cfg.kind === "swiss"
        ? cfg.swiss.winPoints
        : 3
)
const drawPoints = ref(
  cfg.kind === "group"
    ? cfg.group.drawPoints
    : cfg.kind === "league"
      ? cfg.league.drawPoints
      : cfg.kind === "swiss"
        ? cfg.swiss.drawPoints
        : 1
)
const lossPoints = ref(
  cfg.kind === "group"
    ? cfg.group.lossPoints
    : cfg.kind === "league"
      ? cfg.league.lossPoints
      : cfg.kind === "swiss"
        ? cfg.swiss.lossPoints
        : 0
)

const groupCount = ref(cfg.kind === "group" ? cfg.group.groupCount : 2)
const groupSeedMode = ref<PhaseSeedMode>(cfg.kind === "group" ? cfg.group.seedMode : "seeded")
const qualifiersPerGroup = ref(cfg.kind === "group" ? cfg.group.qualifiersPerGroup : 2)
const wildcardCount = ref(cfg.kind === "group" ? cfg.group.wildcardCount : 0)

const opponentCount = ref(cfg.kind === "swiss" ? cfg.swiss.opponentCount : 4)
const potCount = ref(cfg.kind === "swiss" ? cfg.swiss.potCount : 1)
const balanceHomeAway = ref(cfg.kind === "swiss" ? cfg.swiss.balanceHomeAway : true)

const knockoutSeedMode = ref<PhaseSeedMode>(
  cfg.kind === "knockout" ? cfg.knockout.seedMode : "seeded"
)
const hasThirdPlace = ref(cfg.kind === "knockout" ? cfg.knockout.hasThirdPlace : false)
const knockoutLegMode = ref<LegMode>(
  cfg.kind === "knockout" ? cfg.knockout.knockoutLegMode : "single"
)
const finalLegMode = ref<LegMode>(cfg.kind === "knockout" ? cfg.knockout.finalLegMode : "single")
const thirdPlaceLegMode = ref<LegMode>(
  cfg.kind === "knockout" ? cfg.knockout.thirdPlaceLegMode : "single"
)
const ALL_KNOCKOUT_STAGES: KnockoutStage[] = ["r64", "r32", "r16", "quarterfinal", "semifinal"]
const roundLegModes = ref<Record<KnockoutStage, LegMode>>(
  Object.fromEntries(
    ALL_KNOCKOUT_STAGES.map((stage) => [
      stage,
      (cfg.kind === "knockout" ? cfg.knockout.roundLegModes[stage] : undefined) ??
        (cfg.kind === "knockout" ? cfg.knockout.knockoutLegMode : "single"),
    ])
  ) as Record<KnockoutStage, LegMode>
)

const teamCount = computed(() => Math.max(props.intake, PHASE_MIN_TEAMS[props.phase.kind]))

/** Round rows shown for a knockout phase, same rule the create-time modal
 *  uses: derived from how many teams actually reach the bracket. */
const visibleKnockoutStages = computed(() =>
  knockoutStagesForRoundCount(totalRoundsForSize(teamCount.value))
)
const maxGroups = computed(() => Math.max(2, Math.floor(teamCount.value / 2)))
const maxOpponents = computed(() => Math.max(1, teamCount.value - 1))
const maxPots = computed(() => Math.max(1, Math.min(8, Math.floor(teamCount.value / 2))))

const groupSizeHint = useGroupSizeHint(
  () => teamCount.value,
  () => groupCount.value
)

const maxQualifiers = computed(() =>
  groupCount.value > 0 ? Math.max(1, Math.floor(teamCount.value / groupCount.value)) : 1
)

// A wildcard is the best of the teams that just missed out, so it only exists
// while at least one place per group is still missing out.
const showWildcards = computed(() => qualifiersPerGroup.value < maxQualifiers.value)

/** How many teams leave this phase — the number the next one is sized from. */
const groupAdvancing = computed(
  () => groupCount.value * qualifiersPerGroup.value + (showWildcards.value ? wildcardCount.value : 0)
)

// The intake moves as the graph is edited, so a draft that was valid a moment
// ago has to be pulled back inside the new limits rather than saved as-is.
watch(maxGroups, (max) => {
  groupCount.value = Math.max(2, Math.min(groupCount.value, max))
})
watch([maxQualifiers, groupCount], () => {
  qualifiersPerGroup.value = Math.max(1, Math.min(qualifiersPerGroup.value, maxQualifiers.value))
  wildcardCount.value = Math.min(wildcardCount.value, groupCount.value)
})
watch(showWildcards, (canHave) => {
  if (!canHave) wildcardCount.value = 0
})

const seedModeOptions = computed(() => [
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "random" as const, label: t("common.random") },
])

const legOptionsForKind = computed(() =>
  props.phase.kind === "league" ? leagueLegOptions.value : multiLegOptions.value
)

/** How many matchdays the Swiss draw will produce, so the size is visible up front. */
const swissMatchdays = computed(() => opponentCount.value * legModeToCount(legMode.value))

function build(): PhaseConfig {
  if (props.phase.kind === "group") {
    return {
      kind: "group",
      group: {
        groupCount: Math.max(2, Math.min(groupCount.value, maxGroups.value)),
        qualifiersPerGroup: Math.max(1, Math.min(qualifiersPerGroup.value, maxQualifiers.value)),
        wildcardCount: showWildcards.value
          ? Math.min(wildcardCount.value, groupCount.value)
          : 0,
        legMode: legMode.value,
        seedMode: groupSeedMode.value,
        tiebreaker: tiebreaker.value,
        winPoints: winPoints.value,
        drawPoints: drawPoints.value,
        lossPoints: lossPoints.value,
      },
    }
  }
  if (props.phase.kind === "league") {
    return {
      kind: "league",
      league: {
        legMode: legMode.value,
        tiebreaker: tiebreaker.value,
        winPoints: winPoints.value,
        drawPoints: drawPoints.value,
        lossPoints: lossPoints.value,
      },
    }
  }
  if (props.phase.kind === "swiss") {
    return {
      kind: "swiss",
      swiss: {
        // Clamped through the engine's own rule: an odd number of total match
        // slots has no valid draw, and a silently empty fixture is worse than
        // one that shrinks by a team.
        opponentCount: clampSwissOpponentCount(teamCount.value, opponentCount.value),
        potCount: Math.max(1, Math.min(potCount.value, maxPots.value)),
        legMode: legMode.value,
        balanceHomeAway: balanceHomeAway.value,
        seed: cfg.kind === "swiss" ? cfg.swiss.seed : Date.now(),
        tiebreaker: tiebreaker.value,
        winPoints: winPoints.value,
        drawPoints: drawPoints.value,
        lossPoints: lossPoints.value,
      },
    }
  }
  return {
    kind: "knockout",
    knockout: {
      seedMode: knockoutSeedMode.value,
      hasThirdPlace: hasThirdPlace.value,
      knockoutLegMode: knockoutLegMode.value,
      roundLegModes: { ...roundLegModes.value },
      finalLegMode: finalLegMode.value,
      thirdPlaceLegMode: thirdPlaceLegMode.value,
    },
  }
}

function handleSave() {
  emit("save", build())
  sheetRef.value?.close()
}
</script>

<template>
  <!-- Capped so the body scrolls inside the sheet instead of the sheet growing
       past the screen: a group phase's settings run to four cards. -->
  <AppSheet
    ref="sheetRef"
    :title="phase.name"
    :subtitle="t('tournament.phases.config.intake', { count: intake })"
    max-height="min(86vh, 720px)"
    max-height-mobile="86vh"
    @close="emit('close')"
  >
    <div class="phase-config" :class="{ 'phase-config--readonly': readonly }">
      <template v-if="phase.kind === 'group'">
        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.phases.config.shape") }}</div>
          <div class="form-rows">
            <AppStepper
              v-model="groupCount"
              :label="t('tournament.phases.config.groupCount')"
              :min="2"
              :max="maxGroups"
              :hint="groupSizeHint"
            />
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.seedMode") }}
              </span>
              <AppButtonGroup v-model="groupSeedMode" :options="seedModeOptions" />
            </div>
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.legs") }}
              </span>
              <AppButtonGroup v-model="legMode" :options="legOptionsForKind" />
            </div>
          </div>
        </div>

        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.phases.config.qualification") }}</div>
          <div class="form-rows">
            <AppStepper
              v-model="qualifiersPerGroup"
              :label="t('tournament.phases.config.qualifiersPerGroup')"
              :min="1"
              :max="maxQualifiers"
            />
            <AppStepper
              v-if="showWildcards"
              v-model="wildcardCount"
              :label="t('tournament.phases.config.wildcards')"
              :hint="t('tournament.phases.config.wildcardsHint')"
              :min="0"
              :max="groupCount"
            />
          </div>
          <p class="phase-config-note">
            {{ t("tournament.phases.config.advancing", { count: groupAdvancing }) }}
          </p>
        </div>
      </template>

      <template v-else-if="phase.kind === 'league'">
        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.phases.config.shape") }}</div>
          <div class="form-row">
            <span class="form-label form-label--md">{{ t("tournament.phases.config.legs") }}</span>
            <AppButtonGroup v-model="legMode" :options="legOptionsForKind" />
          </div>
        </div>
      </template>

      <template v-else-if="phase.kind === 'swiss'">
        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.phases.config.shape") }}</div>
          <div class="form-rows">
            <AppStepper
              v-model="opponentCount"
              :label="t('tournament.phases.config.opponents')"
              :min="1"
              :max="maxOpponents"
            />
            <AppStepper
              v-model="potCount"
              :label="t('tournament.phases.config.pots')"
              :min="1"
              :max="maxPots"
            />
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.legs") }}
              </span>
              <AppButtonGroup v-model="legMode" :options="legOptionsForKind" />
            </div>
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.balance") }}
              </span>
              <AppToggle v-model="balanceHomeAway" />
            </div>
          </div>
          <p class="phase-config-note">
            {{ t("tournament.phases.config.swissSize", { matchdays: swissMatchdays }) }}
          </p>
        </div>
      </template>

      <template v-else>
        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.phases.config.shape") }}</div>
          <div class="form-rows">
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.seedMode") }}
              </span>
              <AppButtonGroup v-model="knockoutSeedMode" :options="seedModeOptions" />
            </div>
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.legs") }}
              </span>
              <AppButtonGroup v-model="knockoutLegMode" :options="multiLegOptions" />
            </div>
            <div class="form-row">
              <span class="form-label form-label--md">
                {{ t("tournament.phases.config.thirdPlace") }}
              </span>
              <AppToggle v-model="hasThirdPlace" />
            </div>
          </div>
        </div>

        <div class="form-card">
          <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
          <div class="form-rows">
            <div v-for="stage in visibleKnockoutStages" :key="stage" class="form-row">
              <span class="form-label">{{ t(STAGE_LABEL_KEYS[stage]) }}</span>
              <AppButtonGroup v-model="roundLegModes[stage]" :options="multiLegOptions" />
            </div>
            <div class="form-row">
              <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
              <AppButtonGroup v-model="finalLegMode" :options="multiLegOptions" />
            </div>
            <div v-if="hasThirdPlace" class="form-row">
              <span class="form-label">
                {{ t("tournament.settingsPage.legsPerMatch.thirdPlace") }}
              </span>
              <AppButtonGroup v-model="thirdPlaceLegMode" :options="multiLegOptions" />
            </div>
          </div>
        </div>
      </template>

      <template v-if="phase.kind !== 'knockout'">
        <TiebreakerField v-model="tiebreaker" />
        <ScoringFields
          v-model:win-points="winPoints"
          v-model:draw-points="drawPoints"
          v-model:loss-points="lossPoints"
        />
      </template>
    </div>

    <template v-if="!readonly" #footer>
      <div class="phase-sheet-footer">
        <AppButton variant="filled" block @click="handleSave">
          {{ t("common.save") }}
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped src="./phases.css"></style>
