<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, PlayoffSeedMode } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import { useModal } from "@/composables/useModal"

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
  reset: []
  delete: []
  close: []
}>()

useModal(() => {
  if (showManualDraw.value) {
    showManualDraw.value = false
  } else {
    emit("close")
  }
})

const selectedTeamToAdd = ref("")
const drawType = ref<DrawType>("random")
const showManualDraw = ref(false)

const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]

const playoffOptions = [
  { value: "cross", label: "Cross-bracket" },
  { value: "no-same-group", label: "No same-group R1" },
  { value: "random", label: "Fully random" },
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
  if (!confirm("Kura çekimini sıfırlayıp yeniden oluştur?")) return
  emit("redraw", drawType.value === "seeded")
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  emit("redraw", false, orderedIds)
}
</script>

<template>
  <div class="ts-backdrop" @click.self="emit('close')">
    <div class="ts-modal">
      <!-- Header -->
      <div class="ts-header">
        <span>⚙ Tournament Settings</span>
        <button class="btn-xs" @click="emit('close')">✕ Close</button>
      </div>

      <!-- Body -->
      <div class="ts-body">
        <!-- ── Manage Teams ──────────────────────────────── -->
        <div class="ts-section">
          <div class="ts-section-title">Manage Teams</div>
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
                  ✕
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
          <p v-else class="ts-hint ts-hint--warn">
            Team management is disabled once matches have been played.
          </p>
        </div>

        <div class="ts-divider"></div>

        <!-- ── Draw ─────────────────────────────────────── -->
        <div class="ts-section">
          <div class="ts-section-title">Draw</div>
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
            </template>
          </template>
          <p v-else class="ts-hint ts-hint--warn">
            Draw cannot be changed once matches have been played.
          </p>
        </div>

        <!-- ── Group Count (group+bracket only) ─────── -->
        <template v-if="isGroupFormat">
          <div class="ts-divider"></div>
          <div class="ts-section">
            <div class="ts-section-title">Groups</div>
            <template v-if="!hasAnyResults">
              <div class="ts-row gc-setting-row">
                <span class="ts-hint gc-setting-label">Groups</span>
                <div class="gc-stepper">
                  <button
                    class="btn-xs"
                    :disabled="currentGroupCount <= minGroups"
                    @click="emit('changeGroupCount', currentGroupCount - 1)"
                  >
                    −
                  </button>
                  <span class="gc-val">{{ currentGroupCount }}</span>
                  <button
                    class="btn-xs"
                    :disabled="currentGroupCount >= maxGroups"
                    @click="emit('changeGroupCount', currentGroupCount + 1)"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="ts-row gc-setting-row">
                <span class="ts-hint gc-setting-label">Qualifiers / group</span>
                <div class="gc-stepper">
                  <button
                    class="btn-xs"
                    :disabled="currentQpg <= minQpg"
                    @click="emit('changeQualifiersPerGroup', currentQpg - 1)"
                  >
                    −
                  </button>
                  <span class="gc-val">{{ currentQpg }}</span>
                  <button
                    class="btn-xs"
                    :disabled="currentQpg >= maxQpg"
                    @click="emit('changeQualifiersPerGroup', currentQpg + 1)"
                  >
                    +
                  </button>
                </div>
                <span class="ts-hint">→ {{ currentQpg * currentGroupCount }} advance</span>
              </div>
            </template>
            <p v-else class="ts-hint ts-hint--warn">
              Group structure cannot be changed once matches have been played.
            </p>
          </div>
        </template>

        <!-- ── Playoff Seeding (group+bracket only) ──── -->
        <template v-if="isGroupFormat">
          <div class="ts-divider"></div>
          <div class="ts-section">
            <div class="ts-section-title">Playoff Seeding</div>
            <template v-if="!tournament.groupsDone">
              <BtnGroup
                :model-value="tournament.playoffSeedMode ?? 'cross'"
                :options="playoffOptions"
                class="btn-group--wrap"
                @update:model-value="emit('setPlayoffSeedMode', $event as PlayoffSeedMode)"
              />
            </template>
            <p v-else class="ts-hint ts-hint--warn">
              Locked — group stage is complete and bracket has been seeded.
            </p>
          </div>
        </template>

        <!-- ── Danger Zone ──────────────────────────────── -->
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">Danger Zone</div>
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
    </div>
  </div>
</template>

<style scoped>
.ts-backdrop {
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

.ts-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 100%;
  max-width: 520px;
  flex-shrink: 0;
}

.ts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-family: var(--font);
  font-size: 15px;
}

.ts-body {
  padding: 0;
}

.ts-section {
  padding: 10px 12px;
}

.ts-section-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
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
.ts-hint--warn {
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent);
  padding: 6px 8px;
  font-size: 12px;
  color: var(--danger);
}

.ts-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Team list */
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

/* Danger zone */
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

.gc-setting-row {
  margin-bottom: 6px;
  align-items: center;
}
.gc-setting-label {
  width: 130px;
  flex-shrink: 0;
}

.gc-stepper {
  display: inline-flex;
  align-items: center;
  gap: 0;
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
}

/* Playoff seeding wrap variant */
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
  .ts-backdrop {
    padding: 0;
    align-items: flex-start;
  }
  .ts-modal {
    max-width: 100%;
    min-height: 100dvh;
  }
}
</style>
