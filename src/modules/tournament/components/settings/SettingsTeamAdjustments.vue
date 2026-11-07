<script setup lang="ts">
import { computed, ref } from "vue"
import { ListOrdered, Lock, Zap } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"
import { AppConfigButton, AppModal, AppNumberInput } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"

const props = defineProps<{
  teams: Team[]
  hasAnyResults: boolean
  showPoints?: boolean
}>()

const { t } = useI18n()

const teamPointAdjustments = defineModel<Record<string, number>>("teamPointAdjustments", {
  required: true,
})
const teamPowerAdjustments = defineModel<Record<string, number>>("teamPowerAdjustments", {
  required: true,
})

type AdjKind = "points" | "power"

/** Which adjustment list is open in the drawer; null when closed. */
const openKind = ref<AdjKind | null>(null)

const kinds = computed<AdjKind[]>(() =>
  props.showPoints !== false ? ["points", "power"] : ["power"]
)

function titleFor(kind: AdjKind): string {
  return t(`tournament.settingsPage.teamAdjustments.${kind}Title`)
}

function modelFor(kind: AdjKind) {
  return kind === "points" ? teamPointAdjustments : teamPowerAdjustments
}

function getAdj(teamId: string): number {
  if (!openKind.value) return 0
  return modelFor(openKind.value).value[teamId] ?? 0
}

function setAdj(teamId: string, val: number) {
  if (!openKind.value) return
  const model = modelFor(openKind.value)
  const next = { ...model.value }
  if (val === 0) delete next[teamId]
  else next[teamId] = val
  model.value = next
}

const MIN = -30
const MAX = 30

// The config button shows who is adjusted, so the list need not be opened to
// check it: "Brazil +3, Iran −2 +4" — at most three names, then a count.
const SUMMARY_NAMES = 3

function summaryFor(kind: AdjKind): string | undefined {
  const adjusted = Object.entries(modelFor(kind).value).filter(([, v]) => v !== 0)
  if (!adjusted.length) return undefined
  const named = adjusted.slice(0, SUMMARY_NAMES).map(([id, v]) => {
    const name = props.teams.find((tm) => tm.id === id)?.name ?? "?"
    return `${name} ${v > 0 ? "+" : "−"}${Math.abs(v)}`
  })
  const rest = adjusted.length - SUMMARY_NAMES
  return rest > 0 ? `${named.join(", ")} +${rest}` : named.join(", ")
}
</script>

<template>
  <div class="config-button-stack">
    <AppConfigButton
      v-for="kind in kinds"
      :key="kind"
      :icon="kind === 'points' ? ListOrdered : Zap"
      :label="titleFor(kind)"
      :summary="summaryFor(kind)"
      :locked="hasAnyResults"
      @click="openKind = kind"
    />
  </div>

  <AppModal v-if="openKind" :title="titleFor(openKind)" width="420px" @close="openKind = null">
    <div v-if="hasAnyResults" class="tsp-locked-banner">
      <Lock :size="12" />
      {{ t("tournament.settingsPage.teamAdjustments.lockedBanner") }}
    </div>
    <template v-else>
      <div class="hint-box hint-box--top">
        {{ t(`tournament.settingsPage.teamAdjustments.${openKind}Hint`) }}
      </div>
      <div class="adj-list">
        <div v-for="team in teams" :key="team.id" class="adj-row">
          <TeamBadge :team="team" class="adj-name" />
          <AppNumberInput
            :model-value="getAdj(team.id)"
            :min="MIN"
            :max="MAX"
            size="sm"
            editable
            @update:model-value="setAdj(team.id, $event)"
          />
        </div>
      </div>
    </template>
  </AppModal>
</template>

<style src="./settings.css"></style>
<style scoped>
.adj-list {
  display: flex;
  flex-direction: column;
  margin-top: var(--sp-3);
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
}

.adj-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border-light);
}
.adj-row:last-child {
  border-bottom: none;
}

.adj-name {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-sm);
}
</style>
