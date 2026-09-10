<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppField, AppModal } from "@/components/ui"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useModal } from "@/composables/useModal"
import TeamSelect from "./TeamSelect.vue"
import { planGeneration, drawGenerationSpecs } from "../utils/generatePlayers"

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
const plan = computed(() => planGeneration(squad.value))
const totalToAdd = computed(() => plan.value.reduce((sum, d) => sum + d.count, 0))
const canGenerate = computed(
  () =>
    !!selectedTeamId.value &&
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
  // generated squad reads as that team's players rather than everyone's.
  const targetPower = selectedTeam.value?.power ?? 60
  const takenNumbers = new Set(
    squad.value.filter((p) => p.number !== undefined).map((p) => p.number as number)
  )
  const specs = drawGenerationSpecs(
    plan.value,
    parsedFirstNames.value,
    parsedLastNames.value,
    targetPower,
    takenNumbers
  )
  store.addMany(selectedTeamId.value, specs)
  modal.value?.close()
}
</script>

<template>
  <AppModal ref="modal" :title="t('players.generate.title')" @close="emit('close')">
    <div class="form">
      <p class="hint">{{ t("players.generate.hint") }}</p>

      <AppField v-if="!teamId" layout="stack" :label="t('players.generate.team')">
        <TeamSelect
          v-model="selectedTeamId"
          :teams="teamsStore.teams"
          :placeholder="t('players.form.teamPlaceholder')"
        />
      </AppField>

      <div class="plan-summary">
        <template v-if="totalToAdd > 0">
          <span>{{ t("players.generate.willAdd", { count: totalToAdd }) }}</span>
          <AppChip
            v-for="d in plan"
            :key="d.position"
            square
            size="xs"
            :title="t(`players.positions.${d.position}`)"
          >
            {{ d.position }} +{{ d.count }}
          </AppChip>
        </template>
        <span v-else class="plan-full">{{ t("players.generate.squadFull") }}</span>
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
