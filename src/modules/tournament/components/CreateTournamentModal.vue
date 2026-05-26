<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import ManualDraw from "./ManualDraw.vue"
import GroupDraw from "./GroupDraw.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import AppModal from "@/components/AppModal.vue"
import { Trophy, LayoutGrid } from "lucide-vue-next"
import type { LegMode, PlayoffSeedMode } from "@/modules/tournament/types"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket"

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settingsStore = useSettingsStore()

const name = ref("")
const selected = ref<string[]>([])
const format = ref<TournamentFormat>("bracket")
const drawType = ref<DrawType>(settingsStore.newSeasonDrawType)
const groupCount = ref(4)
const qualifiersPerGroup = ref(2)
const showManualDraw = ref(false)
const hasThirdPlace = ref(false)
const playoffSeedMode = ref<PlayoffSeedMode>(settingsStore.newSeasonPlayoffSeedMode)
const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)
const knockoutLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

function handleClose() {
  if (showManualDraw.value) {
    showManualDraw.value = false
  } else {
    emit("close")
  }
}

const allTeams = computed(() => teamsStore.teams)
const selectedTeams = computed(() => allTeams.value.filter((t) => selected.value.includes(t.id)))
const allSelected = computed(
  () => selected.value.length === allTeams.value.length && allTeams.value.length > 0
)
const minGroups = 2
const maxGroups = computed(() => Math.floor(selected.value.length / 2))
const minQpg = 1
const maxQpg = computed(() =>
  groupCount.value > 0 ? Math.floor(selected.value.length / groupCount.value) : 2
)
const canCreate = computed(() => !!name.value.trim() && selected.value.length >= 2)

const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]

watch(maxGroups, (max) => {
  groupCount.value = Math.max(minGroups, Math.min(groupCount.value, max))
})
watch(maxQpg, (max) => {
  qualifiersPerGroup.value = Math.max(minQpg, Math.min(qualifiersPerGroup.value, max))
})

function toggleAll() {
  selected.value = allSelected.value ? [] : allTeams.value.map((t) => t.id)
}

function setFormat(f: TournamentFormat) {
  format.value = f
  drawType.value =
    f === "group+bracket" ? settingsStore.newSeasonGroupDrawType : settingsStore.newSeasonDrawType
  if (f === "group+bracket") {
    playoffSeedMode.value = settingsStore.newSeasonPlayoffSeedMode
    groupCount.value = Math.min(4, maxGroups.value)
    qualifiersPerGroup.value = Math.min(2, maxQpg.value)
  }
}

function handleCreate() {
  if (!canCreate.value) return
  if (drawType.value === "manual") {
    showManualDraw.value = true
    return
  }
  doCreate()
}

function doCreate(orderedIds?: string[]) {
  const isGroup = format.value === "group+bracket"
  const gc = isGroup ? groupCount.value : undefined
  const qpg = isGroup ? qualifiersPerGroup.value : undefined
  const isSeeded = drawType.value === "seeded"
  const gLeg = isGroup ? groupLegMode.value : "single"
  settingsStore.groupLegMode = gLeg
  settingsStore.knockoutLegMode = knockoutLegMode.value
  settingsStore.finalLegMode = finalLegMode.value
  if (isGroup) {
    settingsStore.newSeasonGroupDrawType = drawType.value
    settingsStore.newSeasonPlayoffSeedMode = playoffSeedMode.value
  } else {
    settingsStore.newSeasonDrawType = drawType.value
  }
  const id = store.create(
    name.value.trim(),
    selected.value,
    isSeeded,
    orderedIds,
    gc,
    qpg,
    gLeg,
    knockoutLegMode.value,
    finalLegMode.value
  )
  if (isGroup) store.setPlayoffSeedMode(id, playoffSeedMode.value)
  if (hasThirdPlace.value) store.toggleThirdPlace(id)
  router.push(`/tournaments/${id}`)
  emit("close")
}

const teamsPerGroup = computed(() =>
  groupCount.value > 0 ? Math.ceil(selected.value.length / groupCount.value) : 0
)
</script>

<template>
  <AppModal
    title="New Tournament"
    :width="'min(540px, calc(100vw - 32px))'"
    :z-index="250"
    flush
    top
    @close="handleClose"
  >
    <!-- Manual draw view -->
    <div v-if="showManualDraw" class="ct-body">
      <GroupDraw
        v-if="format === 'group+bracket'"
        :teams="selectedTeams"
        :group-count="groupCount"
        @confirm="(ids) => doCreate(ids)"
        @cancel="showManualDraw = false"
      />
      <ManualDraw
        v-else
        :teams="selectedTeams"
        @confirm="(ids) => doCreate(ids)"
        @cancel="showManualDraw = false"
      />
    </div>

    <!-- Main form -->
    <div v-else class="ct-body">
      <!-- Name -->
      <div class="ct-section">
        <div class="ct-label">Tournament Name</div>
        <input
          v-model="name"
          class="ct-name-input"
          placeholder="e.g. Spring Championship 2025"
          @keyup.enter="handleCreate"
        />
      </div>

      <div class="ct-divider" />

      <!-- Teams -->
      <div class="ct-section">
        <div class="ct-label-row">
          <div class="ct-label">
            Participating Teams
            <span class="ct-count">({{ selected.length }} selected)</span>
          </div>
          <button class="btn-xs" @click="toggleAll">
            {{ allSelected ? "Deselect All" : "Select All" }}
          </button>
        </div>
        <div class="ct-team-grid">
          <label
            v-for="team in allTeams"
            :key="team.id"
            class="ct-chip"
            :class="{ 'ct-chip--on': selected.includes(team.id) }"
          >
            <input v-model="selected" type="checkbox" :value="team.id" class="ct-check" />
            <span class="ct-dot" :style="{ background: team.color }" />
            {{ team.name }}
            <span class="ct-power">{{ team.power }}</span>
          </label>
        </div>
        <p v-if="selected.length === 1" class="ct-warn">Select at least 2 teams.</p>
      </div>

      <div class="ct-divider" />

      <!-- Format -->
      <div class="ct-section">
        <div class="ct-label">Tournament Format</div>
        <div class="ct-format-row">
          <button
            class="ct-format-card"
            :class="{ 'ct-format-card--on': format === 'bracket' }"
            @click="setFormat('bracket')"
          >
            <Trophy :size="26" class="ct-format-icon" />
            <span class="ct-format-title">Knockout Bracket</span>
            <span class="ct-format-desc">Lose once and you're out</span>
          </button>
          <button
            class="ct-format-card"
            :class="{ 'ct-format-card--on': format === 'group+bracket' }"
            :disabled="selected.length < 4"
            @click="setFormat('group+bracket')"
          >
            <LayoutGrid :size="26" class="ct-format-icon" />
            <span class="ct-format-title">Groups + Knockout</span>
            <span class="ct-format-desc">Group stage, then top teams advance</span>
          </button>
        </div>

        <!-- Group count + qualifiers -->
        <div v-if="format === 'group+bracket'" class="ct-gc-block">
          <div class="ct-gc-row">
            <span class="ct-gc-label">Number of Groups</span>
            <div class="ct-gc-stepper">
              <button
                :disabled="groupCount <= minGroups"
                @click="groupCount = Math.max(minGroups, groupCount - 1)"
              >
                −
              </button>
              <span class="ct-gc-val">{{ groupCount }}</span>
              <button
                :disabled="groupCount >= maxGroups"
                @click="groupCount = Math.min(maxGroups, groupCount + 1)"
              >
                +
              </button>
            </div>
            <span class="ct-gc-hint">~{{ teamsPerGroup }} teams per group</span>
          </div>
          <div class="ct-gc-row">
            <span class="ct-gc-label">Teams that advance</span>
            <div class="ct-gc-stepper">
              <button
                :disabled="qualifiersPerGroup <= minQpg"
                @click="qualifiersPerGroup = Math.max(minQpg, qualifiersPerGroup - 1)"
              >
                −
              </button>
              <span class="ct-gc-val">{{ qualifiersPerGroup }}</span>
              <button
                :disabled="qualifiersPerGroup >= maxQpg"
                @click="qualifiersPerGroup = Math.min(maxQpg, qualifiersPerGroup + 1)"
              >
                +
              </button>
            </div>
            <span class="ct-gc-hint">
              per group →
              <strong>{{ qualifiersPerGroup * groupCount }}</strong>
              reach knockout
            </span>
          </div>
        </div>
      </div>

      <div class="ct-divider" />

      <!-- Draw -->
      <div class="ct-section">
        <div class="ct-label">Draw Method</div>
        <div class="ct-draw-rows">
          <div class="ct-draw-row">
            <span v-if="format === 'group+bracket'" class="ct-row-label">Group stage</span>
            <BtnGroup v-model="drawType" :options="drawOptions" />
          </div>
          <div v-if="format === 'group+bracket'" class="ct-draw-row">
            <span class="ct-row-label">Playoff bracket</span>
            <BtnGroup
              v-model="playoffSeedMode"
              :options="[
                { value: 'cross', label: 'Cross' },
                { value: 'no-same-group', label: 'No rematch' },
                { value: 'random', label: 'Random' },
              ]"
            />
          </div>
        </div>
        <div class="ct-hint-box">
          <div class="ct-hint-line">
            <strong>Random</strong>
            — teams placed by chance &nbsp;·&nbsp;
            <strong>Seeded</strong>
            — top teams kept apart &nbsp;·&nbsp;
            <strong>Manual</strong>
            — you arrange them
          </div>
          <div v-if="format === 'group+bracket'" class="ct-hint-line">
            <strong>Playoff bracket:</strong>
            Cross — A1 vs B2, B1 vs A2 &nbsp;·&nbsp; No rematch — avoids same-group matchups in
            Round 1 &nbsp;·&nbsp; Random — fully random
          </div>
        </div>
      </div>

      <!-- Options (3rd Place) -->
      <template v-if="selected.length >= 4">
        <div class="ct-divider" />
        <div class="ct-section">
          <div class="ct-label">Options</div>
          <label class="ct-toggle-row">
            <input v-model="hasThirdPlace" type="checkbox" />
            <span class="ct-toggle-label">3rd Place Match</span>
            <span class="ct-toggle-hint">Semi-final losers play for bronze medal</span>
          </label>
        </div>
      </template>

      <!-- Leg mode -->
      <div class="ct-divider" />
      <div class="ct-section">
        <div class="ct-label">Legs per Match</div>
        <div class="ct-hint-box ct-hint-box--top">
          <strong>Single</strong>
          — 1 match, winner advances &nbsp;·&nbsp;
          <strong>Double</strong>
          — home &amp; away, aggregate score decides
        </div>
        <div class="ct-leg-rows">
          <div v-if="format === 'group+bracket'" class="ct-leg-row">
            <span class="ct-row-label">Group Stage</span>
            <BtnGroup v-model="groupLegMode" :options="legOptions" />
          </div>
          <div class="ct-leg-row">
            <span class="ct-row-label">Knockout Rounds</span>
            <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
          </div>
          <div class="ct-leg-row">
            <span class="ct-row-label">Final</span>
            <BtnGroup v-model="finalLegMode" :options="legOptions" />
          </div>
        </div>
      </div>
    </div>

    <template v-if="!showManualDraw" #footer>
      <button class="primary" :disabled="!canCreate" @click="handleCreate">
        Create Tournament
        <span v-if="selected.length >= 2" class="ct-badge">{{ selected.length }} teams</span>
      </button>
      <button @click="handleClose">Cancel</button>
    </template>
  </AppModal>
</template>

<style scoped>
.ct-body {
  display: flex;
  flex-direction: column;
}

.ct-section {
  padding: 10px 12px;
}

.ct-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.ct-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.ct-label-row .ct-label {
  margin-bottom: 0;
}

.ct-count {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.ct-divider {
  height: 1px;
  background: var(--border-light);
}

.ct-name-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  padding: 6px 8px;
}

.ct-team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 150px;
  overflow-y: auto;
  padding: 2px 0;
}

.ct-check {
  display: none;
}

.ct-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
  padding: 3px 8px;
  border: 1px solid var(--border-light);
  background: var(--bg);
  user-select: none;
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s;
}
.ct-chip:hover {
  background: var(--surface);
}
.ct-chip--on {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: var(--accent);
  color: var(--accent);
}
.ct-chip--on .ct-power {
  color: var(--accent);
  opacity: 0.65;
}

.ct-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ct-power {
  color: var(--text-muted);
  font-size: 11px;
}

.ct-warn {
  font-size: 12px;
  color: var(--danger);
  margin: 6px 0 0;
}

.ct-format-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.ct-format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 2px solid var(--border-light);
  background: var(--bg);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.ct-format-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
}
.ct-format-card--on {
  border-color: var(--accent) !important;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg)) !important;
}
.ct-format-card:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ct-format-icon {
  color: var(--accent);
}
.ct-format-title {
  font-size: 12px;
  font-weight: 700;
}
.ct-format-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.ct-gc-block {
  padding: 8px 0 0;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ct-gc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.ct-gc-label {
  font-size: 12px;
  color: var(--text);
  width: 140px;
  flex-shrink: 0;
}
.ct-gc-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
}
.ct-gc-stepper button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  font-size: 16px;
  line-height: 1;
  border-radius: 0;
}
.ct-gc-stepper button:first-child {
  border-right: 1px solid var(--border);
}
.ct-gc-stepper button:last-child {
  border-left: 1px solid var(--border);
}
.ct-gc-val {
  width: 36px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-ui);
}
.ct-gc-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.ct-row-label {
  font-size: 12px;
  color: var(--text);
  width: 130px;
  flex-shrink: 0;
}

.ct-hint-box {
  margin-top: 8px;
  padding: 6px 8px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ct-hint-box--top {
  margin-top: 0;
  margin-bottom: 8px;
}
.ct-hint-line {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.ct-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.ct-toggle-label {
  font-size: 13px;
  font-weight: 600;
}
.ct-toggle-hint {
  font-size: 11px;
  color: var(--text-muted);
}

.ct-draw-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ct-draw-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ct-leg-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ct-leg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ct-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 0 7px;
  font-size: 11px;
  margin-left: 3px;
}

@media (max-width: 560px) {
  .ct-format-row {
    grid-template-columns: 1fr;
  }
}
</style>
