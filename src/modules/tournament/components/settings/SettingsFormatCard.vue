<script setup lang="ts">
/**
 * The format section of the tournament settings page: one config button per
 * stage the format has (each showing its current values), plus where the
 * games are played. A custom tournament shows its phase graph read-only
 * instead — it is settled at creation.
 */
import { computed, defineAsyncComponent, ref } from "vue"
import { useI18n } from "vue-i18n"
import { House, LayoutGrid, List, Shuffle, Trophy } from "@lucide/vue"
import { AppCard, AppChip, AppConfigButton, AppIcon } from "@/components/ui"
import { MAX_TIER_COUNT } from "@/constants"
import type { Tournament } from "@/modules/tournament/types"
import type { TournamentSettingsDraft } from "@/modules/tournament/composables/useTournamentSettingsDraft"
import { useSettingsFormatConfig } from "@/modules/tournament/composables/useSettingsFormatConfig"
import { GroupConfigModal, SwissConfigModal, VenueConfigModal } from "../config"
import SettingsKnockoutConfigModal from "./SettingsKnockoutConfigModal.vue"
import SettingsLeagueConfigModal from "./SettingsLeagueConfigModal.vue"

const props = defineProps<{
  draft: TournamentSettingsDraft
  tournament: Tournament
  hasAnyResults: boolean
}>()
defineEmits<{ openManualDraw: [] }>()
const PhaseGraphCanvas = defineAsyncComponent(() => import("../phases/PhaseGraphCanvas.vue"))
const PhaseConfigSheet = defineAsyncComponent(() => import("../phases/PhaseConfigSheet.vue"))

const { t } = useI18n()
const { summaries, applyGroup, applyKnockout, applySwiss, applyLeague, applyVenue } =
  useSettingsFormatConfig(props.draft)

type ConfigModal = "group" | "knockout" | "league" | "swiss" | "venue"
const openModal = ref<ConfigModal | null>(null)

const configuringPhaseId = ref<string | null>(null)
const configuringPhase = computed(() =>
  props.tournament.phases?.find((p) => p.id === configuringPhaseId.value)
)

const formatName = computed(() => {
  const tn = props.tournament
  const key =
    tn.format === "group+bracket"
      ? "groupsKo"
      : tn.format === "swiss"
        ? "swiss"
        : tn.format === "custom"
          ? "custom"
          : tn.format === "league"
            ? tn.leaguePlayoff?.enabled
              ? "leagueKo"
              : "league"
            : tn.doubleElim
              ? "doubleElim"
              : "bracket"
  return t(`tournament.create.formats.${key}`)
})

const totalTeams = computed(() => props.tournament.teamIds.length)
const maxTierCount = computed(() => Math.min(MAX_TIER_COUNT, Math.floor(totalTeams.value / 2)))
const maxPromotionCount = computed(() =>
  Math.max(1, Math.floor(totalTeams.value / props.draft.tierCount.value) - 1)
)

const teamCount = computed(() => props.draft.teamIds.value.length)
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Trophy" size="md" />
      {{ t("tournament.create.format") }}
    </template>
    <template #actions>
      <AppChip square>{{ formatName }}</AppChip>
    </template>

    <div v-if="draft.isCustomFormat.value" class="phase-preview">
      <PhaseGraphCanvas
        :phases="tournament.phases ?? []"
        :edges="tournament.phaseEdges ?? []"
        :errors="[]"
        :intake-of="(id) => tournament.phases?.find((p) => p.id === id)?.teamIds.length ?? 0"
        readonly
        @configure="configuringPhaseId = $event"
      />
    </div>

    <div class="config-button-stack">
      <AppConfigButton
        v-if="draft.isGroupFormat.value"
        :icon="LayoutGrid"
        :label="t('tournament.create.config.group')"
        :summary="summaries.group.value"
        @click="openModal = 'group'"
      />
      <AppConfigButton
        v-if="draft.isLeagueFormat.value && !draft.isSwissFormat.value"
        :icon="List"
        :label="t('tournament.create.config.league')"
        :summary="summaries.league.value"
        @click="openModal = 'league'"
      />
      <AppConfigButton
        v-if="draft.isSwissFormat.value"
        :icon="Shuffle"
        :label="t('tournament.create.config.swiss')"
        :summary="summaries.swiss.value"
        @click="openModal = 'swiss'"
      />
      <AppConfigButton
        v-if="!draft.isCustomFormat.value"
        :icon="Trophy"
        :label="t('tournament.create.config.knockout')"
        :summary="summaries.knockout.value"
        @click="openModal = 'knockout'"
      />
      <AppConfigButton
        :icon="House"
        :label="t('tournament.venue.title')"
        :summary="summaries.venue.value"
        @click="openModal = 'venue'"
      />
    </div>
  </AppCard>

  <PhaseConfigSheet
    v-if="configuringPhase"
    :phase="configuringPhase"
    :intake="configuringPhase.teamIds.length"
    readonly
    @close="configuringPhaseId = null"
  />

  <VenueConfigModal
    v-if="openModal === 'venue'"
    :home-advantage="draft.homeAdvantage.value"
    :neutral-final="draft.neutralFinal.value"
    :show-neutral-final="draft.hasFinal.value"
    @save="applyVenue"
    @close="openModal = null"
  />

  <GroupConfigModal
    v-if="openModal === 'group' && draft.isGroupFormat.value"
    :draw-type="draft.drawType.value"
    :group-count="draft.groupCount.value"
    :qualifiers-per-group="draft.qualifiersPerGroup.value"
    :wildcard-count="draft.wildcardCount.value"
    :group-leg-mode="draft.groupLegMode.value"
    :tiebreaker="draft.tiebreaker.value"
    :win-points="draft.winPoints.value"
    :draw-points="draft.drawPoints.value"
    :loss-points="draft.lossPoints.value"
    :tournament-id="tournament.id"
    :groups-done="!!tournament.groupsDone"
    :has-any-results="hasAnyResults"
    :team-count="teamCount"
    @save="applyGroup"
    @close="openModal = null"
    @open-manual-draw="$emit('openManualDraw')"
  />

  <SettingsKnockoutConfigModal
    v-if="openModal === 'knockout'"
    :variant="draft.isLeagueFormat.value ? 'leaguePlayoff' : 'bracket'"
    :is-group-format="draft.isGroupFormat.value"
    :draw-type="draft.drawType.value"
    :has-third-place="draft.hasThirdPlace.value"
    :round-leg-modes="draft.roundLegModes.value"
    :third-place-leg-mode="draft.thirdPlaceLegMode.value"
    :final-leg-mode="draft.finalLegMode.value"
    :playoff-enabled="draft.playoffEnabled.value"
    :playoff-qualifier-count="draft.playoffQualifierCount.value"
    :playoff-seed-mode="draft.leaguePlayoffSeedMode.value"
    :group-playoff-seed-mode="draft.playoffSeedMode.value"
    :tournament-id="tournament.id"
    :tournament="tournament"
    :has-any-results="hasAnyResults"
    :team-count="teamCount"
    :league-playoff-started="draft.originalPlayoff.value?.started ?? false"
    @save="applyKnockout"
    @close="openModal = null"
    @open-manual-draw="$emit('openManualDraw')"
  />

  <SwissConfigModal
    v-if="openModal === 'swiss' && draft.isSwissFormat.value"
    :opponent-count="draft.swissOpponentCount.value"
    :pot-count="draft.swissPotCount.value"
    :leg-mode="draft.leagueLegMode.value"
    :balance-home-away="draft.swissBalanceHomeAway.value"
    :draw-type="draft.drawType.value === 'random' ? 'random' : 'seeded'"
    :tiebreaker="draft.tiebreaker.value"
    :win-points="draft.winPoints.value"
    :draw-points="draft.drawPoints.value"
    :loss-points="draft.lossPoints.value"
    :team-count="teamCount"
    :has-any-results="hasAnyResults"
    @save="applySwiss"
    @close="openModal = null"
  />

  <SettingsLeagueConfigModal
    v-if="openModal === 'league' && draft.isLeagueFormat.value && !draft.isSwissFormat.value"
    :league-leg-mode="draft.leagueLegMode.value"
    :tier-count="draft.tierCount.value"
    :promotion-count="draft.promotionCount.value"
    :tiebreaker="draft.tiebreaker.value"
    :win-points="draft.winPoints.value"
    :draw-points="draft.drawPoints.value"
    :loss-points="draft.lossPoints.value"
    :has-any-results="hasAnyResults"
    :is-multi-tier="draft.isMultiTier.value"
    :max-tier-count="maxTierCount"
    :max-promotion-count="maxPromotionCount"
    @save="applyLeague"
    @close="openModal = null"
  />
</template>

<style scoped>
/* .phase-canvas sizes itself via flex:1 1 auto — outside a flex ancestor its
   min-height never becomes a definite height, so the canvas's own 100%-height
   internals (Vue Flow) collapse to nothing and no nodes are drawn. */
.phase-preview {
  display: flex;
  height: 320px;
  margin-bottom: var(--sp-3);
}
</style>
