<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppField, AppModal, AppStepper, AppToggle } from "@/components/ui"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useModal } from "@/composables/useModal"
import TeamSelect from "./TeamSelect.vue"
import { planGeneration, drawGenerationSpecs, type PositionDeficit } from "../utils/generatePlayers"
import { SQUAD_TARGET_SIZE } from "../constants"
import type { PlayerPosition } from "../types"

// `teamId` is only known up front when opened from a team-scoped context
// (the squad card on a team's own page). Opened from the players list —
// which isn't scoped to one team — it's absent, and the field below lets
// the user pick one instead of the button just staying disabled.
const props = defineProps<{ teamId?: string }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = usePlayersStore()
const teamsStore = useTeamsStore()
useModal(() => modal.value?.close())

const modal = ref<InstanceType<typeof AppModal> | null>(null)

const selectedTeamId = ref(props.teamId ?? teamsStore.teams[0]?.id ?? "")

/** Instead of one chosen team, top up every team whose squad is thin. */
const fillAllTeams = ref(false)
const minSquadSize = ref(1)

function toLines(names: string[]): string {
  return names.join("\n")
}

function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

const firstNamesText = ref(toLines(store.effectiveFirstNames()))
const lastNamesText = ref(toLines(store.effectiveLastNames()))

const parsedFirstNames = computed(() => fromLines(firstNamesText.value))
const parsedLastNames = computed(() => fromLines(lastNamesText.value))

const selectedTeam = computed(() => teamsStore.teams.find((tm) => tm.id === selectedTeamId.value))
const squad = computed(() => store.byTeam(selectedTeamId.value))

interface TeamPlan {
  teamId: string
  power: number
  plan: PositionDeficit[]
}

/** Every team under the squad-size cutoff, each with its own position plan. */
const understaffedTeamPlans = computed<TeamPlan[]>(() =>
  teamsStore.teams
    .filter((tm) => store.byTeam(tm.id).length < minSquadSize.value)
    .map((tm) => ({ teamId: tm.id, power: tm.power, plan: planGeneration(store.byTeam(tm.id)) }))
    .filter((tp) => tp.plan.length > 0)
)

const activePlans = computed<TeamPlan[]>(() => {
  if (fillAllTeams.value) return understaffedTeamPlans.value
  if (!selectedTeamId.value) return []
  return [
    {
      teamId: selectedTeamId.value,
      power: selectedTeam.value?.power ?? 60,
      plan: planGeneration(squad.value),
    },
  ]
})

const totalToAdd = computed(() =>
  activePlans.value.reduce((sum, tp) => sum + tp.plan.reduce((s, d) => s + d.count, 0), 0)
)

/** Position counts summed across every team in play — how the plan renders as chips either way. */
const positionTotals = computed(() => {
  const totals = new Map<PlayerPosition, number>()
  for (const tp of activePlans.value) {
    for (const d of tp.plan) totals.set(d.position, (totals.get(d.position) ?? 0) + d.count)
  }
  return Array.from(totals, ([position, count]) => ({ position, count }))
})

const canGenerate = computed(
  () =>
    activePlans.value.length > 0 &&
    totalToAdd.value > 0 &&
    parsedFirstNames.value.length > 0 &&
    parsedLastNames.value.length > 0
)

function clearNames() {
  firstNamesText.value = ""
  lastNamesText.value = ""
}

function useDefaults() {
  store.resetCustomNames()
  firstNamesText.value = toLines(store.effectiveFirstNames())
  lastNamesText.value = toLines(store.effectiveLastNames())
}

function generate() {
  if (!canGenerate.value) return
  store.setCustomNames(parsedFirstNames.value, parsedLastNames.value)
  // Generated players cluster around their own team's rating, so a
  // generated squad reads as that team's players rather than everyone's —
  // done per team here since "fill every understaffed team" spans several.
  for (const tp of activePlans.value) {
    const takenNumbers = new Set(
      store
        .byTeam(tp.teamId)
        .filter((p) => p.number !== undefined)
        .map((p) => p.number as number)
    )
    const specs = drawGenerationSpecs(
      tp.plan,
      parsedFirstNames.value,
      parsedLastNames.value,
      tp.power,
      takenNumbers
    )
    store.addMany(tp.teamId, specs)
  }
  modal.value?.close()
}
</script>

<template>
  <AppModal ref="modal" :title="t('players.generate.title')" @close="emit('close')">
    <div class="form">
      <p class="hint">{{ t("players.generate.hint") }}</p>

      <div v-if="!teamId" class="form-row">
        <span class="form-label form-label--md">{{ t("players.generate.fillAllTeams") }}</span>
        <AppToggle v-model="fillAllTeams" :aria-label="t('players.generate.fillAllTeams')" />
      </div>

      <AppField v-if="!teamId && !fillAllTeams" layout="stack" :label="t('players.generate.team')">
        <TeamSelect
          v-model="selectedTeamId"
          :teams="teamsStore.teams"
          :placeholder="t('players.form.teamPlaceholder')"
        />
      </AppField>

      <AppStepper
        v-if="fillAllTeams"
        v-model="minSquadSize"
        :min="1"
        :max="SQUAD_TARGET_SIZE"
        :label="t('players.generate.minSquadSize')"
        :hint="t('players.generate.minSquadSizeHint')"
      />

      <div class="plan-summary">
        <template v-if="totalToAdd > 0">
          <span>
            {{
              fillAllTeams
                ? t("players.generate.willAddMulti", {
                    count: totalToAdd,
                    teams: activePlans.length,
                  })
                : t("players.generate.willAdd", { count: totalToAdd })
            }}
          </span>
          <AppChip
            v-for="d in positionTotals"
            :key="d.position"
            square
            size="xs"
            :title="t(`players.positions.${d.position}`)"
          >
            {{ d.position }} +{{ d.count }}
          </AppChip>
        </template>
        <span v-else class="plan-full">
          {{ fillAllTeams ? t("players.generate.noTeamsBelow") : t("players.generate.squadFull") }}
        </span>
      </div>

      <div class="section">
        <AppField layout="stack" :label="t('players.generate.firstNames')">
          <textarea
            v-model="firstNamesText"
            class="names-textarea"
            rows="6"
            :placeholder="t('players.generate.namesPlaceholder')"
          />
        </AppField>

        <AppField layout="stack" :label="t('players.generate.lastNames')">
          <textarea
            v-model="lastNamesText"
            class="names-textarea"
            rows="6"
            :placeholder="t('players.generate.namesPlaceholder')"
          />
        </AppField>

        <div class="name-actions">
          <AppButton variant="danger" size="xs" @click="clearNames">
            {{ t("players.generate.clear") }}
          </AppButton>
          <AppButton variant="text" size="xs" @click="useDefaults">
            {{ t("players.generate.useDefault") }}
          </AppButton>
        </div>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!canGenerate" @click="generate">
        {{ t("players.generate.generateBtn") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
  max-width: 100%;
}

.hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.plan-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: var(--surface-2);
  font-size: var(--fs-sm);
}

.plan-full {
  color: var(--text-muted);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border-light);
}

.names-textarea {
  width: 100%;
  resize: vertical;
  font-family: var(--font);
  font-size: var(--fs-sm);
  padding: var(--sp-2);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.name-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
</style>
