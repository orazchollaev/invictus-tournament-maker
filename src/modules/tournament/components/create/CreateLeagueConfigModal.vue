<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton, AppStepper, AppButtonGroup } from "@/components/ui"
import type { LegMode, Tiebreaker } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { ScoringFields, TiebreakerField } from "@/modules/tournament/components/config"
import { TeamBadge } from "@/modules/teams/components"

export interface LeagueConfigPayload {
  leagueLegMode: LegMode
  tierCount: number
  tierAssignments: Record<string, number>
  promotionCount: number
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}

const props = defineProps<
  LeagueConfigPayload & {
    selectedTeams: Team[]
    allTeams: Team[]
  }
>()
const emit = defineEmits<{ save: [LeagueConfigPayload]; close: [] }>()

const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const leagueLegMode = ref(props.leagueLegMode)
const tierCount = ref(props.tierCount)
const tierAssignments = ref<Record<string, number>>({ ...props.tierAssignments })
const promotionCount = ref(props.promotionCount)
const tiebreaker = ref(props.tiebreaker)
const winPoints = ref(props.winPoints)
const drawPoints = ref(props.drawPoints)
const lossPoints = ref(props.lossPoints)

const tierNames = computed(() => {
  const names: string[] = []
  for (let i = 0; i < tierCount.value; i++) {
    names.push(i === 0 ? "Division 1" : `Division ${i + 1}`)
  }
  return names
})

const teamsPerTier = computed(() => {
  const buckets: string[][] = Array.from({ length: tierCount.value }, () => [])
  for (const team of props.selectedTeams) {
    const tier = tierAssignments.value[team.id] ?? 0
    buckets[Math.min(tier, tierCount.value - 1)].push(team.id)
  }
  return buckets
})

const maxPromotionCount = computed(() => {
  if (tierCount.value <= 1) return 0
  return Math.max(0, Math.min(...teamsPerTier.value.map((b) => b.length)) - 1)
})

watch(tierCount, (count) => {
  const sorted = [...props.selectedTeams].sort((a, b) => b.power - a.power)
  const assignments: Record<string, number> = {}
  const perTier = Math.ceil(sorted.length / count)
  sorted.forEach((team, i) => {
    assignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
  })
  tierAssignments.value = assignments
})

watch(
  () => props.selectedTeams,
  (teams) => {
    if (tierCount.value <= 1) return
    const count = tierCount.value
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    const perTier = Math.ceil(sorted.length / count)
    const newAssignments = { ...tierAssignments.value }
    sorted.forEach((team, i) => {
      if (newAssignments[team.id] === undefined) {
        newAssignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
      }
    })
    for (const id of Object.keys(newAssignments)) {
      if (!teams.find((t) => t.id === id)) delete newAssignments[id]
    }
    tierAssignments.value = newAssignments
  }
)

function handleSave() {
  emit("save", {
    leagueLegMode: leagueLegMode.value,
    tierCount: tierCount.value,
    tierAssignments: tierAssignments.value,
    promotionCount: promotionCount.value,
    tiebreaker: tiebreaker.value,
    winPoints: winPoints.value,
    drawPoints: drawPoints.value,
    lossPoints: lossPoints.value,
  })
  modalRef.value?.close()
}
</script>

<template>
  <AppModal
    ref="modalRef"
    :title="t('tournament.create.config.league')"
    width="420px"
    @close="emit('close')"
  >
    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.create.roundFormat") }}</div>
      <div class="form-row">
        <span class="form-label">{{ t("tournament.create.schedule") }}</span>
        <AppButtonGroup v-model="leagueLegMode" :options="multiLegOptions" />
      </div>
    </div>

    <div class="form-card">
      <div class="form-section-title">{{ t("tournament.create.tiers") }}</div>
      <AppStepper
        v-model="tierCount"
        :label="t('tournament.create.numberOfTiers')"
        :min="1"
        :max="Math.min(4, Math.floor(selectedTeams.length / 2))"
        :hint="
          tierCount === 1
            ? t('tournament.create.singleDivision')
            : t('tournament.create.divisions', { n: tierCount })
        "
      />

      <template v-if="tierCount > 1">
        <AppStepper
          v-model="promotionCount"
          :label="t('tournament.create.promotionRelegation')"
          :min="1"
          :max="maxPromotionCount"
          :hint="t('tournament.create.teamsSwap')"
        />

        <div class="ctp-tier-blocks">
          <div v-for="(ids, ti) in teamsPerTier" :key="ti" class="ctp-tier-block">
            <div class="ctp-tier-label">{{ tierNames[ti] }} ({{ ids.length }})</div>

            <div class="ctp-tier-chips">
              <div v-for="teamId in ids" :key="teamId" class="ctp-tier-chip">
                <TeamBadge
                  :team="allTeams.find((t) => t.id === teamId)"
                  :size="12"
                  class="ctp-tier-chip-name"
                />

                <div class="ctp-tier-move">
                  <button
                    v-if="ti > 0"
                    class="ctp-tier-mv-btn"
                    :title="t('common.moveUp')"
                    @click="tierAssignments[teamId] = ti - 1"
                  >
                    ↑
                  </button>

                  <button
                    v-if="ti < tierCount - 1"
                    class="ctp-tier-mv-btn"
                    :title="t('common.moveDown')"
                    @click="tierAssignments[teamId] = ti + 1"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <TiebreakerField v-model="tiebreaker" />

    <ScoringFields
      v-model:win-points="winPoints"
      v-model:draw-points="drawPoints"
      v-model:loss-points="lossPoints"
    />

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./create-tournament.css"></style>
