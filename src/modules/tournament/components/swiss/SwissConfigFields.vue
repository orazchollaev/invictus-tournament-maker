<script setup lang="ts">
// The Swiss shape controls, shared by the create and settings modals so the
// two can never drift apart. Validation lives in the engine; this only renders
// it. `locked` follows the settings-page convention: once results exist the
// fixture cannot be redrawn, so those cards collapse to a lock banner.
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppStepper, BtnGroup, ToggleSwitch } from "@/components/ui"
import type { DrawType, LegMode, Tiebreaker } from "@/modules/tournament/types"
import { legModeToCount, validateSwissConfig } from "@/engine"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import TspLockedCard from "../settings/TspLockedCard.vue"

const props = withDefaults(defineProps<{ teamCount: number; locked?: boolean }>(), {
  locked: false,
})

const opponentCount = defineModel<number>("opponentCount", { required: true })
const potCount = defineModel<number>("potCount", { required: true })
const legMode = defineModel<LegMode>("legMode", { required: true })
const balanceHomeAway = defineModel<boolean>("balanceHomeAway", { required: true })
const drawType = defineModel<DrawType>("drawType", { required: true })
const tiebreaker = defineModel<Tiebreaker>("tiebreaker", { required: true })
const winPoints = defineModel<number>("winPoints", { required: true })
const drawPoints = defineModel<number>("drawPoints", { required: true })
const lossPoints = defineModel<number>("lossPoints", { required: true })

const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

const isSeededDraw = computed(() => drawType.value === "seeded")
// A random draw is one big pot, so the pot count simply does not apply.
const effectivePotCount = computed(() => (isSeededDraw.value ? potCount.value : 1))

const maxPotCount = computed(() => Math.max(1, Math.min(8, Math.floor(props.teamCount / 2))))
const maxOpponents = computed(() => Math.max(1, props.teamCount - 1))

const errors = computed(() =>
  validateSwissConfig(props.teamCount, opponentCount.value, effectivePotCount.value)
)

const legs = computed(() => legModeToCount(legMode.value))
const matchdayCount = computed(() => opponentCount.value * legs.value)
const matchCount = computed(() => (props.teamCount * opponentCount.value * legs.value) / 2)

defineExpose({ errors })
</script>

<template>
  <TspLockedCard
    :title="t('tournament.create.swissConfig.phase')"
    :locked="locked"
    :locked-message="t('tournament.create.swissConfig.lockedBanner')"
  >
    <AppStepper
      v-model="opponentCount"
      :label="t('tournament.create.swissConfig.opponents')"
      :min="1"
      :max="maxOpponents"
      :hint="t('tournament.create.swissConfig.opponentsHint')"
    />

    <div class="form-rows">
      <div class="form-row">
        <span class="form-label form-label--md">
          {{ t("tournament.create.swissConfig.legs") }}
        </span>
        <BtnGroup v-model="legMode" :options="multiLegOptions" />
      </div>

      <div class="form-row">
        <span class="form-label form-label--md">
          {{ t("tournament.create.swissConfig.homeAwayBalance") }}
        </span>
        <ToggleSwitch
          v-model="balanceHomeAway"
          :aria-label="t('tournament.create.swissConfig.homeAwayBalance')"
        />
      </div>
    </div>
  </TspLockedCard>

  <TspLockedCard
    :title="t('tournament.create.swissConfig.draw')"
    :locked="locked"
    :locked-message="t('tournament.create.swissConfig.lockedBanner')"
  >
    <div class="form-row">
      <span class="form-label form-label--md">
        {{ t("tournament.create.swissConfig.drawType") }}
      </span>
      <BtnGroup
        v-model="drawType"
        :options="[
          { value: 'seeded', label: t('tournament.create.swissConfig.drawSeeded') },
          { value: 'random', label: t('tournament.create.swissConfig.drawRandom') },
        ]"
      />
    </div>

    <AppStepper
      v-if="isSeededDraw"
      v-model="potCount"
      style="margin-top: var(--sp-3)"
      :label="t('tournament.create.swissConfig.pots')"
      :min="1"
      :max="maxPotCount"
      :hint="
        potCount > 1
          ? t('tournament.create.swissConfig.potsHint', {
              size: Math.floor(teamCount / potCount),
              perPot: Math.floor(opponentCount / potCount),
            })
          : t('tournament.create.swissConfig.potsNone')
      "
    />
  </TspLockedCard>

  <div class="form-card">
    <div class="form-section-title">{{ t("tournament.create.tiebreaker") }}</div>
    <div class="form-row">
      <span class="form-label form-label--md">
        {{ t("tournament.settingsPage.tiebreaker.method") }}
      </span>
      <BtnGroup
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

  <div v-if="!locked" class="form-card swiss-preview">
    <div v-if="errors.length" class="swiss-errors">
      <p v-for="key in errors" :key="key" class="swiss-error">
        {{ t(`tournament.create.swissConfig.errors.${key}`, { teams: teamCount }) }}
      </p>
    </div>

    <p v-else class="swiss-summary">
      {{
        t("tournament.create.swissConfig.summary", {
          matchdays: matchdayCount,
          matches: matchCount,
        })
      }}
    </p>
  </div>
</template>

<style scoped>
.swiss-preview {
  padding: var(--sp-2) var(--sp-3);
}

.swiss-summary {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  text-align: center;
}

.swiss-errors {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.swiss-error {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--danger);
}
</style>
