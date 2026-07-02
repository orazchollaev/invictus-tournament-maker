<script setup lang="ts">
import { computed, watch } from "vue"
import AppStepper from "@/components/AppStepper.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import type { LegMode } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  selectedTeams: Team[]
  allTeams: Team[]
}>()

const leagueLegMode = defineModel<LegMode>("leagueLegMode", { required: true })
const tierCount = defineModel<number>("tierCount", { required: true })
const tierAssignments = defineModel<Record<string, number>>("tierAssignments", { required: true })
const promotionCount = defineModel<number>("promotionCount", { required: true })

const { multiLegOptions } = useLegOptions()

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
</script>

<template>
  <!-- Round Format -->
  <div class="ctp-card">
    <div class="ctp-section-title">
      {{ $t("tournament.create.roundFormat") }}
    </div>

    <div class="ctp-leg-row">
      <span class="ctp-row-label">
        {{ $t("tournament.create.schedule") }}
      </span>

      <BtnGroup v-model="leagueLegMode" :options="multiLegOptions" />
    </div>

    <div class="ctp-hint-box">
      <strong>{{ $t("common.single") }}</strong>
      —
      {{
        $t("tournament.create.leagueHint", {
          single: $t("common.single"),
          double: $t("common.double"),
          triple: $t("common.triple"),
          quad: $t("common.quadruple"),
        }).split("·")[0]
      }}
      &nbsp;·&nbsp;

      <strong>{{ $t("common.double") }}</strong>
      —
      {{
        $t("tournament.create.leagueHint", {
          single: $t("common.single"),
          double: $t("common.double"),
          triple: $t("common.triple"),
          quad: $t("common.quadruple"),
        }).split("·")[1]
      }}
      &nbsp;·&nbsp;

      <strong>{{ $t("common.triple") }}</strong>
      —
      {{
        $t("tournament.create.leagueHint", {
          single: $t("common.single"),
          double: $t("common.double"),
          triple: $t("common.triple"),
          quad: $t("common.quadruple"),
        }).split("·")[2]
      }}
      &nbsp;·&nbsp;

      <strong>{{ $t("common.quadruple") }}</strong>
      —
      {{
        $t("tournament.create.leagueHint", {
          single: $t("common.single"),
          double: $t("common.double"),
          triple: $t("common.triple"),
          quad: $t("common.quadruple"),
        }).split("·")[3]
      }}
    </div>
  </div>

  <!-- League Tiers -->
  <div class="ctp-card">
    <div class="ctp-section-title">
      {{ $t("tournament.create.tiers") }}
    </div>

    <AppStepper
      v-model="tierCount"
      :label="$t('tournament.create.numberOfTiers')"
      :min="1"
      :max="Math.min(4, Math.floor(selectedTeams.length / 2))"
      :hint="
        tierCount === 1
          ? $t('tournament.create.singleDivision')
          : $t('tournament.create.divisions', { n: tierCount })
      "
    />

    <template v-if="tierCount > 1">
      <AppStepper
        v-model="promotionCount"
        :label="$t('tournament.create.promotionRelegation')"
        :min="1"
        :max="maxPromotionCount"
        :hint="$t('tournament.create.teamsSwap')"
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
                  :title="$t('common.moveUp')"
                  @click="tierAssignments[teamId] = ti - 1"
                >
                  ↑
                </button>

                <button
                  v-if="ti < tierCount - 1"
                  class="ctp-tier-mv-btn"
                  :title="$t('common.moveDown')"
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
</template>

<style src="./ctp.css"></style>
