<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, PlayoffSeedMode, LegMode, Tiebreaker } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import AppModal from "@/components/AppModal.vue"
import { Settings, X, Lock, Save } from "lucide-vue-next"

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
  changeWildcardCount: [count: number]
  toggleThirdPlace: []
  changeLegMode: [stage: "group" | "knockout" | "final", mode: LegMode]
  setLeagueLegMode: [mode: LegMode]
  changeTiebreaker: [tiebreaker: Tiebreaker]
  reset: []
  delete: []
  close: []
}>()

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

// ── Draft (local) state ──────────────────────────────────────────────────────
const localTeamIds = ref<string[]>([...props.tournament.teamIds])
const selectedTeamToAdd = ref("")
const drawType = ref<DrawType>(props.tournament.drawType ?? "random")
const showManualDraw = ref(false)

const localPlayoffSeedMode = ref<PlayoffSeedMode>(props.tournament.playoffSeedMode ?? "cross")
const localGroupCount = ref(props.tournament.groups?.length ?? 2)
const localQpg = ref(props.tournament.qualifiersPerGroup ?? 2)
const localWildcardCount = ref(props.tournament.wildcardCount ?? 0)
const localHasThirdPlace = ref(!!props.tournament.hasThirdPlace)
const localGroupLegMode = ref<LegMode>(props.tournament.groupLegMode ?? "single")
const localKnockoutLegMode = ref<LegMode>(props.tournament.knockoutLegMode ?? "single")
const localFinalLegMode = ref<LegMode>(props.tournament.finalLegMode ?? "single")
const localLeagueLegMode = ref<LegMode>(props.tournament.league?.legMode ?? "single")
const localTiebreaker = ref<Tiebreaker>(props.tournament.tiebreaker ?? "goal-diff")
const isLeagueFormat = computed(() => props.tournament.format === "league")

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

// ── Derived from local state ─────────────────────────────────────────────────
const localTeams = computed(() => props.allTeams.filter((t) => localTeamIds.value.includes(t.id)))
const localAvailableTeams = computed(() =>
  props.allTeams.filter((t) => !localTeamIds.value.includes(t.id))
)
const isGroupFormat = computed(() => props.tournament.format === "group+bracket")

const currentGroupCount = computed(() => localGroupCount.value)
const maxGroups = computed(() => Math.floor(localTeamIds.value.length / 2))
const minGroups = 2

const currentQpg = computed(() => localQpg.value)
const maxQpg = computed(() => Math.floor(localTeamIds.value.length / currentGroupCount.value))
const minQpg = 1

const hasChanges = computed(() => {
  const orig = props.tournament
  const origSet = new Set(orig.teamIds)
  const localSet = new Set(localTeamIds.value)
  if (origSet.size !== localSet.size || [...origSet].some((id) => !localSet.has(id))) return true
  if (drawType.value !== (orig.drawType ?? "random")) return true
  if (localPlayoffSeedMode.value !== (orig.playoffSeedMode ?? "cross")) return true
  if (localGroupCount.value !== (orig.groups?.length ?? 2)) return true
  if (localQpg.value !== (orig.qualifiersPerGroup ?? 2)) return true
  if (localWildcardCount.value !== (orig.wildcardCount ?? 0)) return true
  if (localHasThirdPlace.value !== !!orig.hasThirdPlace) return true
  if (localGroupLegMode.value !== (orig.groupLegMode ?? "single")) return true
  if (localKnockoutLegMode.value !== (orig.knockoutLegMode ?? "single")) return true
  if (localFinalLegMode.value !== (orig.finalLegMode ?? "single")) return true
  if (isLeagueFormat.value && localLeagueLegMode.value !== (orig.league?.legMode ?? "single"))
    return true
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff")) return true
  return false
})

// ── Handlers ─────────────────────────────────────────────────────────────────
function handleClose() {
  if (showManualDraw.value) {
    showManualDraw.value = false
  } else {
    emit("close")
  }
}

function handleAddTeam() {
  if (!selectedTeamToAdd.value) return
  localTeamIds.value.push(selectedTeamToAdd.value)
  selectedTeamToAdd.value = ""
}

function handleRemoveTeam(teamId: string) {
  localTeamIds.value = localTeamIds.value.filter((id) => id !== teamId)
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

function handleSave() {
  const orig = props.tournament

  // Team changes
  const origSet = new Set(orig.teamIds)
  const localSet = new Set(localTeamIds.value)
  for (const id of localSet) {
    if (!origSet.has(id)) emit("addTeam", id)
  }
  for (const id of origSet) {
    if (!localSet.has(id)) emit("removeTeam", id)
  }

  // Playoff seed mode
  if (localPlayoffSeedMode.value !== (orig.playoffSeedMode ?? "cross")) {
    emit("setPlayoffSeedMode", localPlayoffSeedMode.value)
  }

  // Group count
  if (localGroupCount.value !== (orig.groups?.length ?? 2)) {
    emit("changeGroupCount", localGroupCount.value)
  }

  // Qualifiers per group
  if (localQpg.value !== (orig.qualifiersPerGroup ?? 2)) {
    emit("changeQualifiersPerGroup", localQpg.value)
  }

  // Wildcard count
  if (localWildcardCount.value !== (orig.wildcardCount ?? 0)) {
    emit("changeWildcardCount", localWildcardCount.value)
  }

  // Third place toggle
  if (localHasThirdPlace.value !== !!orig.hasThirdPlace) {
    emit("toggleThirdPlace")
  }

  // Leg modes
  if (localGroupLegMode.value !== (orig.groupLegMode ?? "single")) {
    emit("changeLegMode", "group", localGroupLegMode.value)
  }
  if (localKnockoutLegMode.value !== (orig.knockoutLegMode ?? "single")) {
    emit("changeLegMode", "knockout", localKnockoutLegMode.value)
  }
  if (localFinalLegMode.value !== (orig.finalLegMode ?? "single")) {
    emit("changeLegMode", "final", localFinalLegMode.value)
  }

  // League leg mode
  if (isLeagueFormat.value && localLeagueLegMode.value !== (orig.league?.legMode ?? "single")) {
    emit("setLeagueLegMode", localLeagueLegMode.value)
  }

  // Tiebreaker
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff")) {
    emit("changeTiebreaker", localTiebreaker.value)
  }

  emit("close")
}
</script>

<template>
  <AppModal :width="'min(520px, calc(100vw - 32px))'" :z-index="250" flush @close="handleClose">
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
            <div v-for="team in localTeams" :key="team.id" class="team-row">
              <span class="team-dot" :style="{ background: team.color }"></span>
              <span class="team-name">{{ team.name }}</span>
              <button
                class="danger team-remove"
                :disabled="localTeamIds.length <= 2"
                @click="handleRemoveTeam(team.id)"
              >
                <X :size="13" />
              </button>
            </div>
          </div>
          <div v-if="localAvailableTeams.length > 0" class="add-team-row">
            <select v-model="selectedTeamToAdd">
              <option value="" disabled>Add team…</option>
              <option v-for="t in localAvailableTeams" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
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

      <!-- ── Draw (bracket / group+bracket only) ────── -->
      <template v-if="!isLeagueFormat">
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
                :teams="localTeams"
                :group-count="localGroupCount"
                @confirm="handleManualConfirm"
                @cancel="showManualDraw = false"
              />
              <ManualDraw
                v-else
                :teams="localTeams"
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
      </template>
      <!-- end !isLeagueFormat (Draw) -->

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
                  @click="localGroupCount = currentGroupCount - 1"
                >
                  −
                </button>
                <span class="gc-val">{{ currentGroupCount }}</span>
                <button
                  :disabled="currentGroupCount >= maxGroups"
                  @click="localGroupCount = currentGroupCount + 1"
                >
                  +
                </button>
              </div>
            </div>
            <div class="ts-stepper-row">
              <span class="ts-stepper-label">Teams that advance per group</span>
              <div class="gc-stepper">
                <button :disabled="currentQpg <= minQpg" @click="localQpg = currentQpg - 1">
                  −
                </button>
                <span class="gc-val">{{ currentQpg }}</span>
                <button :disabled="currentQpg >= maxQpg" @click="localQpg = currentQpg + 1">
                  +
                </button>
              </div>
              <span class="ts-hint">→ {{ currentQpg * currentGroupCount }} reach knockout</span>
            </div>
            <div v-if="currentQpg < maxQpg" class="ts-stepper-row">
              <span class="ts-stepper-label">Best runner-up wildcards</span>
              <div class="gc-stepper">
                <button
                  :disabled="localWildcardCount <= 0"
                  @click="localWildcardCount = Math.max(0, localWildcardCount - 1)"
                >
                  −
                </button>
                <span class="gc-val">{{ localWildcardCount }}</span>
                <button
                  :disabled="localWildcardCount >= currentGroupCount"
                  @click="localWildcardCount = Math.min(currentGroupCount, localWildcardCount + 1)"
                >
                  +
                </button>
              </div>
              <span class="ts-hint">
                → {{ currentQpg * currentGroupCount + localWildcardCount }} total
              </span>
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
              v-model="localPlayoffSeedMode"
              :options="playoffOptions"
              class="btn-group--wrap"
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

      <!-- ── Format Options (bracket only) ────────────── -->
      <template v-if="!isLeagueFormat && tournament.rounds.length >= 2">
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
              <input v-model="localHasThirdPlace" type="checkbox" />
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

      <!-- ── Legs per Match (bracket / group+bracket) ─── -->
      <template v-if="!isLeagueFormat">
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
                <BtnGroup v-model="localGroupLegMode" :options="legOptions" />
              </div>
              <div class="ts-leg-row">
                <span class="ts-row-label">Knockout Rounds</span>
                <BtnGroup v-model="localKnockoutLegMode" :options="legOptions" />
              </div>
              <div class="ts-leg-row">
                <span class="ts-row-label">Final</span>
                <BtnGroup v-model="localFinalLegMode" :options="legOptions" />
              </div>
            </div>
          </template>
          <div v-else class="ts-locked-banner">
            <Lock :size="12" />
            Leg settings cannot be changed after matches have started.
          </div>
        </div>
      </template>

      <!-- ── League Format (league only) ──────────────── -->
      <template v-if="isLeagueFormat">
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">
            League Format
            <span v-if="hasAnyResults" class="ts-lock-tag">
              <Lock :size="10" />
              Locked
            </span>
          </div>
          <template v-if="!hasAnyResults">
            <div class="ts-leg-row">
              <span class="ts-row-label">Round Format</span>
              <BtnGroup v-model="localLeagueLegMode" :options="legOptions" />
            </div>
            <div class="ts-hint-box" style="margin-top: 8px">
              <strong>Single</strong>
              — each pair plays once &nbsp;·&nbsp;
              <strong>Double</strong>
              — home &amp; away for each pair
            </div>
          </template>
          <div v-else class="ts-locked-banner">
            <Lock :size="12" />
            Format cannot be changed after matches have started.
          </div>
        </div>
      </template>

      <!-- ── Tiebreaker (group+bracket and league only) ── -->
      <template v-if="isLeagueFormat || tournament.format === 'group+bracket'">
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">Tiebreaker</div>
          <div class="ts-leg-row">
            <span class="ts-row-label">Tiebreaker</span>
            <BtnGroup
              v-model="localTiebreaker"
              :options="[
                { value: 'head-to-head', label: 'H2H' },
                { value: 'goal-diff', label: 'Goal diff' },
              ]"
            />
          </div>
        </div>
      </template>

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

    <template #footer>
      <button class="primary ts-save-btn" :disabled="!hasChanges" @click="handleSave">
        <Save :size="14" />
        Save Changes
      </button>
      <button @click="emit('close')">Cancel</button>
    </template>
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

.ts-pending-badge {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 4px 8px;
}

.ts-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
  max-height: 150px;
  overflow-y: auto;
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
  display: flex;
  justify-content: center;
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

.ts-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
