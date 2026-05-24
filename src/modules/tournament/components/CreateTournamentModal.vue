<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import ManualDraw from "./ManualDraw.vue"
import GroupDraw from "./GroupDraw.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import { useModal } from "@/composables/useModal"
import { X, Trophy, LayoutGrid } from "lucide-vue-next"
import type { LegMode } from "@/modules/tournament/types"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket"

const emit = defineEmits<{ close: [] }>()

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settingsStore = useSettingsStore()

const name = ref("")
const selected = ref<string[]>([])
const drawType = ref<DrawType>("random")
const format = ref<TournamentFormat>("bracket")
const groupCount = ref(4)
const qualifiersPerGroup = ref(2)
const showManualDraw = ref(false)
const hasThirdPlace = ref(false)
const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)
const knockoutLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

useModal(() => {
  if (showManualDraw.value) {
    showManualDraw.value = false
  } else {
    emit("close")
  }
})

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
  if (f === "group+bracket") {
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
  const gc = format.value === "group+bracket" ? groupCount.value : undefined
  const qpg = format.value === "group+bracket" ? qualifiersPerGroup.value : undefined
  const isSeeded = drawType.value === "seeded"
  const gLeg = format.value === "group+bracket" ? groupLegMode.value : "single"
  // Persist leg mode defaults to settings
  settingsStore.groupLegMode = gLeg
  settingsStore.knockoutLegMode = knockoutLegMode.value
  settingsStore.finalLegMode = finalLegMode.value
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
  if (hasThirdPlace.value) store.toggleThirdPlace(id)
  router.push(`/tournaments/${id}`)
  emit("close")
}

const teamsPerGroup = computed(() =>
  groupCount.value > 0 ? Math.ceil(selected.value.length / groupCount.value) : 0
)
</script>

<template>
  <div class="ct-backdrop" @click.self="emit('close')">
    <div class="ct-modal">
      <!-- Header -->
      <div class="ct-header">
        <span>New Tournament</span>
        <button class="btn-xs" @click="emit('close')">
          <X :size="13" />
          Close
        </button>
      </div>

      <!-- Manual draw view -->
      <template v-if="showManualDraw">
        <div class="ct-body">
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
      </template>

      <!-- Main form -->
      <template v-else>
        <div class="ct-body">
          <!-- Name -->
          <div class="ct-section">
            <div class="ct-label">Name</div>
            <input
              v-model="name"
              class="ct-name-input"
              placeholder="Tournament name…"
              @keyup.enter="handleCreate"
            />
          </div>

          <div class="ct-divider" />

          <!-- Teams -->
          <div class="ct-section">
            <div class="ct-label-row">
              <div class="ct-label">
                Teams
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
            <div class="ct-label">Format</div>
            <div class="ct-format-row">
              <button
                class="ct-format-card"
                :class="{ 'ct-format-card--on': format === 'bracket' }"
                @click="setFormat('bracket')"
              >
                <Trophy :size="28" class="ct-format-icon" />
                <span class="ct-format-title">Knockout Bracket</span>
                <span class="ct-format-desc">Single-elimination only</span>
              </button>
              <button
                class="ct-format-card"
                :class="{ 'ct-format-card--on': format === 'group+bracket' }"
                :disabled="selected.length < 4"
                @click="setFormat('group+bracket')"
              >
                <LayoutGrid :size="28" class="ct-format-icon" />
                <span class="ct-format-title">Groups + Knockout</span>
                <span class="ct-format-desc">Group stage → top 2 advance</span>
              </button>
            </div>

            <!-- Group count + qualifiers per group -->
            <div v-if="format === 'group+bracket'" class="ct-gc-block">
              <div class="ct-gc-row">
                <span class="ct-gc-label">Groups</span>
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
                <span class="ct-gc-hint">~{{ teamsPerGroup }} teams/group</span>
              </div>
              <div class="ct-gc-row">
                <span class="ct-gc-label">Qualifiers / group</span>
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
                  → {{ qualifiersPerGroup * groupCount }} advance to KO
                </span>
              </div>
            </div>
          </div>

          <div class="ct-divider" />

          <!-- Draw type -->
          <div class="ct-section">
            <div class="ct-label">Draw</div>
            <BtnGroup v-model="drawType" :options="drawOptions" />
          </div>

          <!-- Format options -->
          <template v-if="selected.length >= 4">
            <div class="ct-divider" />
            <div class="ct-section">
              <div class="ct-label">Options</div>
              <label class="ct-toggle-row">
                <input v-model="hasThirdPlace" type="checkbox" />
                <span class="ct-toggle-label">3rd Place Match</span>
                <span class="ct-toggle-hint">Semi-final losers play for bronze</span>
              </label>
            </div>
          </template>

          <!-- Leg mode -->
          <div class="ct-divider" />
          <div class="ct-section">
            <div class="ct-label">Legs per Match</div>
            <div class="ct-leg-rows">
              <div v-if="format === 'group+bracket'" class="ct-leg-row">
                <span class="ct-leg-label">Group Stage</span>
                <BtnGroup v-model="groupLegMode" :options="legOptions" />
              </div>
              <div class="ct-leg-row">
                <span class="ct-leg-label">Knockout</span>
                <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
              </div>
              <div class="ct-leg-row">
                <span class="ct-leg-label">Final</span>
                <BtnGroup v-model="finalLegMode" :options="legOptions" />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="ct-footer">
          <button class="primary" :disabled="!canCreate" @click="handleCreate">
            Create
            <span v-if="selected.length >= 2" class="ct-badge">{{ selected.length }}</span>
          </button>
          <button @click="emit('close')">Cancel</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ct-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 250;
  padding: 40px 16px 24px;
  overflow-y: auto;
}

.ct-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 100%;
  max-width: 540px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.ct-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-family: var(--font);
  font-size: 15px;
  flex-shrink: 0;
}

.ct-body {
  flex: 1;
  overflow-y: auto;
}

.ct-section {
  padding: 10px 12px;
}

.ct-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
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

/* Name input */
.ct-name-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  padding: 6px 8px;
}

/* Teams */
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

/* Format */
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
  font-size: 22px;
}
.ct-format-title {
  font-size: 12px;
  font-weight: 600;
}
.ct-format-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* Group count */
.ct-gc-block {
  padding: 8px 0 0;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ct-gc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ct-gc-label {
  font-size: 12px;
  color: var(--text-muted);
  width: 130px;
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

/* Format options toggle */
.ct-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.ct-toggle-label {
  font-size: 13px;
  font-weight: 500;
}
.ct-toggle-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* Leg mode */
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
.ct-leg-label {
  font-size: 12px;
  color: var(--text-muted);
  width: 130px;
  flex-shrink: 0;
}

/* Footer */
.ct-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
}

.ct-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  margin-left: 3px;
}

@media (max-width: 560px) {
  .ct-backdrop {
    padding: 0;
    align-items: flex-start;
  }
  .ct-modal {
    max-width: 100%;
    min-height: 100dvh;
  }
  .ct-format-row {
    grid-template-columns: 1fr;
  }
}
</style>
