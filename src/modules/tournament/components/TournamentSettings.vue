<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, PlayoffSeedMode, LegMode } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import AppModal from "@/components/AppModal.vue"
import { Settings, X, Lock } from "lucide-vue-next"

type DrawType = "random" | "seeded" | "manual"

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
  hasAnyResults: boolean
  availableTeams: Team[]
}>()

const emit = defineEmits<{
  addTeam: [teamId: string]
  removeTeam: [teamId: string]
  redraw: [seeded: boolean, orderedIds?: string[]]
  setPlayoffSeedMode: [mode: PlayoffSeedMode]
  changeGroupCount: [count: number]
  changeQualifiersPerGroup: [qpg: number]
  toggleThirdPlace: []
  changeLegMode: [stage: "group" | "knockout" | "final", mode: LegMode]
  reset: []
  delete: []
  close: []
}>()

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

const selectedTeamToAdd = ref("")
const drawType = ref<DrawType>(props.tournament.drawType ?? "random")
const showManualDraw = ref(false)

const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]

const playoffOptions = [
  { value: "cross", label: "Cross" },
  { value: "no-same-group", label: "No rematch" },
  { value: "random", label: "Random" },
]

const tournamentTeams = computed(() =>
  props.allTeams.filter((t) => props.tournament.teamIds.includes(t.id))
)
const isGroupFormat = computed(() => props.tournament.format === "group+bracket")

const currentGroupCount = computed(() => props.tournament.groups?.length ?? 2)
const maxGroups = computed(() => Math.floor(props.tournament.teamIds.length / 2))
const minGroups = 2

const currentQpg = computed(() => props.tournament.qualifiersPerGroup ?? 2)
const maxQpg = computed(() => Math.floor(props.tournament.teamIds.length / currentGroupCount.value))
const minQpg = 1

function handleClose() {
  if (showManualDraw.value) {
    showManualDraw.value = false
  } else {
    emit("close")
  }
}

function handleAddTeam() {
  if (!selectedTeamToAdd.value) return
  emit("addTeam", selectedTeamToAdd.value)
  selectedTeamToAdd.value = ""
}

function handleRedraw() {
  if (drawType.value === "manual") {
    showManualDraw.value = true
    return
  }
  if (!confirm("Reset the draw and regenerate?")) return
  emit("redraw", drawType.value === "seeded")
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  emit("redraw", false, orderedIds)
}
</script>

<template>
  <AppModal :width="'min(520px, calc(100vw - 32px))'" :z-index="250" flush top @close="handleClose">
    <template #title>
      <span class="ts-header-title">
        <Settings :size="14" />
        Tournament Settings
      </span>
    </template>

    <div class="ts-body">
      <!-- ── Manage Teams ──────────────────────────────── -->
      <div class="ts-section">
        <div class="ts-section-title">
          Manage Teams
          <span v-if="hasAnyResults" class="ts-lock-tag">
            <Lock :size="10" />
            Locked
          </span>
        </div>
        <template v-if="!hasAnyResults">
          <div class="team-list">
            <div v-for="team in tournamentTeams" :key="team.id" class="team-row">
              <span class="team-dot" :style="{ background: team.color }"></span>
              <span class="team-name">{{ team.name }}</span>
              <button
                class="danger team-remove"
                :disabled="tournament.teamIds.length <= 2"
                @click="emit('removeTeam', team.id)"
              >
                <X :size="13" />
              </button>
            </div>
          </div>
          <div v-if="availableTeams.length > 0" class="add-team-row">
            <select v-model="selectedTeamToAdd">
              <option value="" disabled>Add team…</option>
              <option v-for="t in availableTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <button class="primary" :disabled="!selectedTeamToAdd" @click="handleAddTeam">
              Add
            </button>
          </div>
          <p v-else class="ts-hint">All available teams are already in this tournament.</p>
        </template>
        <div v-else class="ts-locked-banner">
          <Lock :size="12" />
          Team management is disabled once matches have been played.
        </div>
      </div>

      <div class="ts-divider"></div>

      <!-- ── Draw ─────────────────────────────────────── -->
      <div class="ts-section">
        <div class="ts-section-title">
          Draw Method
          <span v-if="hasAnyResults" class="ts-lock-tag">
            <Lock :size="10" />
            Locked
          </span>
        </div>
        <template v-if="!hasAnyResults">
          <template v-if="showManualDraw">
            <GroupDraw
              v-if="isGroupFormat"
              :teams="tournamentTeams"
              :group-count="tournament.groups?.length ?? 2"
              @confirm="handleManualConfirm"
              @cancel="showManualDraw = false"
            />
            <ManualDraw
              v-else
              :teams="tournamentTeams"
              @confirm="handleManualConfirm"
              @cancel="showManualDraw = false"
            />
          </template>
          <template v-else>
            <div class="ts-row">
              <BtnGroup v-model="drawType" :options="drawOptions" />
              <button @click="handleRedraw">↺ Regenerate</button>
            </div>
            <div class="ts-hint-box">
              <strong>Random</strong>
              — by chance &nbsp;·&nbsp;
              <strong>Seeded</strong>
              — top teams kept apart &nbsp;·&nbsp;
              <strong>Manual</strong>
              — you arrange
            </div>
          </template>
        </template>
        <div v-else class="ts-locked-banner">
          <Lock :size="12" />
          Draw cannot be changed once matches have been played.
        </div>
      </div>

      <!-- ── Group Count (group+bracket only) ─────── -->
      <template v-if="isGroupFormat">
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">
            Group Structure
            <span v-if="hasAnyResults" class="ts-lock-tag">
              <Lock :size="10" />
              Locked
            </span>
          </div>
          <template v-if="!hasAnyResults">
            <div class="ts-stepper-row">
              <span class="ts-stepper-label">Number of Groups</span>
              <div class="gc-stepper">
                <button
                  :disabled="currentGroupCount <= minGroups"
                  @click="emit('changeGroupCount', currentGroupCount - 1)"
                >
                  −
                </button>
                <span class="gc-val">{{ currentGroupCount }}</span>
                <button
                  :disabled="currentGroupCount >= maxGroups"
                  @click="emit('changeGroupCount', currentGroupCount + 1)"
                >
                  +
                </button>
              </div>
            </div>
            <div class="ts-stepper-row">
              <span class="ts-stepper-label">Teams that advance per group</span>
              <div class="gc-stepper">
                <button
                  :disabled="currentQpg <= minQpg"
                  @click="emit('changeQualifiersPerGroup', currentQpg - 1)"
                >
                  −
                </button>
                <span class="gc-val">{{ currentQpg }}</span>
                <button
                  :disabled="currentQpg >= maxQpg"
                  @click="emit('changeQualifiersPerGroup', currentQpg + 1)"
                >
                  +
                </button>
              </div>
              <span class="ts-hint">→ {{ currentQpg * currentGroupCount }} reach knockout</span>
            </div>
          </template>
          <div v-else class="ts-locked-banner">
            <Lock :size="12" />
            Group structure cannot be changed once matches have been played.
          </div>
        </div>
      </template>

      <!-- ── Playoff Seeding (group+bracket only) ──── -->
      <template v-if="isGroupFormat">
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">
            Playoff Seeding
            <span v-if="tournament.groupsDone" class="ts-lock-tag">
              <Lock :size="10" />
              Locked
            </span>
          </div>
          <template v-if="!tournament.groupsDone">
            <BtnGroup
              :model-value="tournament.playoffSeedMode ?? 'cross'"
              :options="playoffOptions"
              class="btn-group--wrap"
              @update:model-value="emit('setPlayoffSeedMode', $event as PlayoffSeedMode)"
            />
            <div class="ts-hint-box">
              <strong>Cross</strong>
              — A1 vs B2, B1 vs A2 &nbsp;·&nbsp;
              <strong>No rematch</strong>
              — avoids same-group opponents in Round 1 &nbsp;·&nbsp;
              <strong>Random</strong>
              — fully random
            </div>
          </template>
          <div v-else class="ts-locked-banner">
            <Lock :size="12" />
            Locked — group stage is complete and the bracket has been seeded.
          </div>
        </div>
      </template>

      <!-- ── Format Options ──────────────────────────── -->
      <template v-if="tournament.rounds.length >= 2">
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">
            Format Options
            <span v-if="hasAnyResults" class="ts-lock-tag">
              <Lock :size="10" />
              Locked
            </span>
          </div>
          <template v-if="!hasAnyResults">
            <label class="ts-toggle-row">
              <input
                type="checkbox"
                :checked="!!tournament.hasThirdPlace"
                @change="emit('toggleThirdPlace')"
              />
              <span class="ts-toggle-label">3rd Place Match</span>
              <span class="ts-hint">Semi-final losers play for bronze medal</span>
            </label>
          </template>
          <div v-else class="ts-locked-banner">
            <Lock :size="12" />
            Format cannot be changed once matches have been played.
          </div>
        </div>
      </template>

      <!-- ── Legs per Match ──────────────────────────── -->
      <div class="ts-divider"></div>
      <div class="ts-section">
        <div class="ts-section-title">
          Legs per Match
          <span v-if="hasAnyResults" class="ts-lock-tag">
            <Lock :size="10" />
            Locked
          </span>
        </div>
        <template v-if="!hasAnyResults">
          <div class="ts-hint-box ts-hint-box--top">
            <strong>Single</strong>
            — 1 match, winner advances &nbsp;·&nbsp;
            <strong>Double</strong>
            — home &amp; away, aggregate score decides
          </div>
          <div class="ts-leg-rows">
            <div v-if="isGroupFormat" class="ts-leg-row">
              <span class="ts-row-label">Group Stage</span>
              <BtnGroup
                :model-value="tournament.groupLegMode ?? 'single'"
                :options="legOptions"
                @update:model-value="emit('changeLegMode', 'group', $event as LegMode)"
              />
            </div>
            <div class="ts-leg-row">
              <span class="ts-row-label">Knockout Rounds</span>
              <BtnGroup
                :model-value="tournament.knockoutLegMode ?? 'single'"
                :options="legOptions"
                @update:model-value="emit('changeLegMode', 'knockout', $event as LegMode)"
              />
            </div>
            <div class="ts-leg-row">
              <span class="ts-row-label">Final</span>
              <BtnGroup
                :model-value="tournament.finalLegMode ?? 'single'"
                :options="legOptions"
                @update:model-value="emit('changeLegMode', 'final', $event as LegMode)"
              />
            </div>
          </div>
        </template>
        <div v-else class="ts-locked-banner">
          <Lock :size="12" />
          Leg settings cannot be changed after matches have started.
        </div>
      </div>

      <!-- ── Danger Zone ──────────────────────────────── -->
      <div class="ts-divider"></div>
      <div class="ts-section">
        <div class="ts-section-title ts-section-title--danger">Danger Zone</div>
        <div class="danger-list">
          <div class="danger-item">
            <div class="danger-info">
              <div class="danger-label">Reset Tournament</div>
              <div class="danger-desc">Clears all match results, keeping teams and draw.</div>
            </div>
            <button class="danger" @click="emit('reset')">Reset</button>
          </div>
          <div class="danger-item">
            <div class="danger-info">
              <div class="danger-label">Delete Tournament</div>
              <div class="danger-desc">Permanently removes this tournament and all its data.</div>
            </div>
            <button class="danger" @click="emit('delete')">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.ts-header-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.ts-body {
  display: flex;
  flex-direction: column;
}

.ts-section {
  padding: 10px 12px;
}

.ts-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ts-section-title--danger {
  color: var(--danger);
}

.ts-lock-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: auto;
}

.ts-locked-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.ts-divider {
  height: 1px;
  background: var(--border-light);
}

.ts-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.ts-hint-box {
  margin-top: 8px;
  padding: 6px 8px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}
.ts-hint-box--top {
  margin-top: 0;
  margin-bottom: 8px;
}

.ts-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.team-row {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 5px 2px 6px;
  border: 1px solid var(--border-light);
  background: var(--bg);
}
.team-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-name {
  font-size: 12px;
}
.add-team-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.add-team-row select {
  flex: 1;
  min-width: 0;
}
.team-remove {
  font-size: 10px;
  padding: 0px 4px;
  line-height: 16px;
  border-color: transparent;
  color: var(--text-muted);
}
.team-remove:not(:disabled):hover {
  color: var(--danger);
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.ts-stepper-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.ts-stepper-label {
  font-size: 12px;
  color: var(--text);
  width: 180px;
  flex-shrink: 0;
}

.gc-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
}
.gc-stepper button {
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: 14px;
  line-height: 1;
}
.gc-stepper button:first-child {
  border-right: 1px solid var(--border);
}
.gc-stepper button:last-child {
  border-left: 1px solid var(--border);
}
.gc-val {
  width: 32px;
  text-align: center;
  font-size: 13px;
  font-family: var(--font-ui);
  font-weight: 700;
}

.ts-toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}
.ts-toggle-label {
  font-size: 13px;
  font-weight: 600;
}

.ts-row-label {
  font-size: 12px;
  color: var(--text);
  width: 130px;
  flex-shrink: 0;
}

.ts-leg-rows {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ts-leg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.danger-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.danger-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent);
  background: color-mix(in srgb, var(--danger) 4%, var(--surface));
  border-radius: var(--radius);
}
.danger-info {
  flex: 1;
}
.danger-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--danger);
}
.danger-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 1px;
}

:deep(.btn-group--wrap) {
  flex-wrap: wrap;
}
:deep(.btn-group--wrap button) {
  border-radius: var(--radius);
  margin-left: 0;
  margin-right: -1px;
  margin-bottom: -1px;
}

@media (max-width: 560px) {
  .ts-stepper-label {
    width: auto;
    flex: 1 1 100%;
  }
  .ts-stepper-row {
    flex-wrap: wrap;
    row-gap: 4px;
  }
}
</style>
