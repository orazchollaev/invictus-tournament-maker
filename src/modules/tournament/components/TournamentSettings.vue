<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import type { Tournament, PlayoffSeedMode } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"

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
  reset: []
  delete: []
  close: []
}>()

const selectedTeamToAdd = ref("")
const drawType = ref<DrawType>("random")
const showManualDraw = ref(false)

const tournamentTeams = computed(() =>
  props.allTeams.filter((t) => props.tournament.teamIds.includes(t.id))
)
const isGroupFormat = computed(() => props.tournament.format === "group+bracket")

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

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (showManualDraw.value) {
      showManualDraw.value = false
    } else {
      emit("close")
    }
  }
}

onMounted(() => {
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onKey)
})

onUnmounted(() => {
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onKey)
})
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
                  class="danger btn-xs ml-auto"
                  :disabled="tournament.teamIds.length <= 2"
                  @click="emit('removeTeam', team.id)"
                >
                  ✕
                </button>
              </div>
            </div>
            <div v-if="availableTeams.length > 0" class="add-team-row">
              <select v-model="selectedTeamToAdd">
                <option value="" disabled>Select a team to add…</option>
                <option v-for="t in availableTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <button class="primary" :disabled="!selectedTeamToAdd" @click="handleAddTeam">
                + Add
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
              <div class="draw-type-grid">
                <button
                  class="draw-type-card"
                  :class="{ active: drawType === 'random' }"
                  @click="drawType = 'random'"
                >
                  <strong>Random</strong>
                  <span>Teams shuffled randomly</span>
                </button>
                <button
                  class="draw-type-card"
                  :class="{ active: drawType === 'seeded' }"
                  @click="drawType = 'seeded'"
                >
                  <strong>Seeded</strong>
                  <span>Stronger teams kept apart</span>
                </button>
                <button
                  class="draw-type-card"
                  :class="{ active: drawType === 'manual' }"
                  @click="drawType = 'manual'"
                >
                  <strong>Manual</strong>
                  <span>Place teams yourself</span>
                </button>
              </div>
              <div class="ts-row" style="margin-top: 10px">
                <button @click="handleRedraw">↺ Regenerate Draw</button>
              </div>
            </template>
          </template>
          <p v-else class="ts-hint ts-hint--warn">
            Draw cannot be changed once matches have been played.
          </p>
        </div>

        <!-- ── Playoff Seeding (group+bracket only) ──── -->
        <template v-if="isGroupFormat">
          <div class="ts-divider"></div>
          <div class="ts-section">
            <div class="ts-section-title">Playoff Seeding</div>
            <p class="ts-hint" style="margin-bottom: 12px">
              Choose how group-stage qualifiers are seeded into the knockout bracket. Takes effect
              when you click "Advance to Knockout".
            </p>
            <div class="seed-grid">
              <button
                class="seed-card"
                :class="{ active: (tournament.playoffSeedMode ?? 'cross') === 'cross' }"
                @click="emit('setPlayoffSeedMode', 'cross')"
              >
                <strong>Classic cross-bracket</strong>
                <span>Group leaders face runners-up from paired groups (1A–2B, 1B–2A…)</span>
              </button>
              <button
                class="seed-card"
                :class="{ active: tournament.playoffSeedMode === 'no-same-group' }"
                @click="emit('setPlayoffSeedMode', 'no-same-group')"
              >
                <strong>No same-group R1</strong>
                <span>
                  Rotation seeding — teams from the same group can't meet in the first knockout
                  round
                </span>
              </button>
              <button
                class="seed-card"
                :class="{ active: tournament.playoffSeedMode === 'random' }"
                @click="emit('setPlayoffSeedMode', 'random')"
              >
                <strong>Fully random</strong>
                <span>Complete random draw, no seeding restrictions</span>
              </button>
            </div>
          </div>
        </template>

        <!-- ── Danger Zone ──────────────────────────────── -->
        <div class="ts-divider"></div>
        <div class="ts-section">
          <div class="ts-section-title">Danger Zone</div>
          <div class="danger-row">
            <div class="danger-item">
              <div class="danger-label">Reset Tournament</div>
              <div class="danger-desc">Clears all match results, keeping teams and draw.</div>
              <button class="danger" @click="emit('reset')">Reset</button>
            </div>
            <div class="danger-item">
              <div class="danger-label">Delete Tournament</div>
              <div class="danger-desc">Permanently removes this tournament and all its data.</div>
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
  padding: 48px 16px 24px;
  overflow-y: auto;
}

.ts-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 100%;
  max-width: 560px;
  flex-shrink: 0;
}

.ts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-family: var(--font);
  font-size: 16px;
}

.ts-body {
  padding: 0;
}

.ts-section {
  padding: 14px 16px;
}

.ts-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
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
  padding: 7px 10px;
  font-size: 12px;
  color: var(--danger);
}

.ts-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Team list */
.team-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  max-height: 220px;
  overflow-y: auto;
}
.team-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid var(--border-light);
  background: var(--bg);
}
.team-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-name {
  font-size: 13px;
  flex: 1;
}
.add-team-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
}
.add-team-row select {
  flex: 1;
  min-width: 0;
}

/* Draw type cards */
.draw-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.draw-type-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.draw-type-card:hover {
  background: var(--bg);
}
.draw-type-card.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.draw-type-card strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.draw-type-card span {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  font-weight: normal;
}

/* Seed mode cards */
.seed-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.seed-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
  border-radius: var(--radius);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.seed-card:hover {
  background: var(--bg);
}
.seed-card.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.seed-card strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.seed-card span {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  font-weight: normal;
}

/* Danger zone */
.danger-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.danger-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
  background: color-mix(in srgb, var(--danger) 5%, var(--surface));
}
.danger-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--danger);
}
.danger-desc {
  font-size: 11px;
  color: var(--text-muted);
  flex: 1;
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
  .draw-type-grid,
  .seed-grid {
    grid-template-columns: 1fr;
  }
  .danger-row {
    grid-template-columns: 1fr;
  }
}
</style>
