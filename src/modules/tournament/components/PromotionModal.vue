<script setup lang="ts">
import { computed, ref } from "vue"
import type { GroupStanding } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import AppModal from "@/components/AppModal.vue"
import { ArrowDown, ArrowUp } from "@lucide/vue"

const props = defineProps<{
  tournamentName: string
  season: number
  standings: GroupStanding[]
  allTeams: Team[]
  availableTeams: Team[]
  relegationCount: number
  linkedLeague?: {
    name: string
    standings: GroupStanding[]
  }
}>()

const emit = defineEmits<{
  confirm: [newTeamIds: string[]]
  cancel: []
}>()

function teamById(id: string) {
  return props.allTeams.find((t) => t.id === id)
}

const survivingIds = computed(() =>
  props.standings.slice(0, props.standings.length - props.relegationCount).map((s) => s.teamId)
)

// const relegatedTeams = computed(
//   () =>
//     props.standings
//       .slice(props.standings.length - props.relegationCount)
//       .map((s) => teamById(s.teamId))
//       .filter(Boolean) as Team[]
// )

// Linked league: top N are auto-promoted
const linkedPromotedIds = computed(() =>
  props.linkedLeague
    ? props.linkedLeague.standings.slice(0, props.relegationCount).map((s) => s.teamId)
    : []
)

// Manual selection (when no linked league)
const sortedAvailable = computed(() => [...props.availableTeams].sort((a, b) => b.power - a.power))

const incomingIds = ref<string[]>(
  Array.from({ length: props.relegationCount }, (_, i) => sortedAvailable.value[i]?.id ?? "")
)

function selectableFor(slotIdx: number): Team[] {
  const otherSelected = new Set(incomingIds.value.filter((id, i) => i !== slotIdx && id !== ""))
  return props.availableTeams.filter((t) => !otherSelected.has(t.id))
}

function handleConfirm() {
  if (props.linkedLeague) {
    emit("confirm", [...survivingIds.value, ...linkedPromotedIds.value])
  } else {
    const incoming = incomingIds.value.filter((id) => id !== "")
    emit("confirm", [...survivingIds.value, ...incoming])
  }
}
</script>

<template>
  <AppModal :width="'min(500px, calc(100vw - 32px))'" @close="emit('cancel')">
    <template #title>New Season — {{ tournamentName }}</template>

    <div class="pm-body">
      <!-- Final Standings -->
      <div class="pm-section-title">Final Standings — Season {{ season }}</div>
      <div class="pm-standings">
        <div
          v-for="(row, rank) in standings"
          :key="row.teamId"
          class="pm-row"
          :class="{ 'pm-row--relegated': rank >= standings.length - relegationCount }"
        >
          <span class="pm-rank">{{ rank + 1 }}</span>
          <span class="pm-dot" :style="{ background: teamById(row.teamId)?.color ?? '#888' }" />
          <span class="pm-name">{{ teamById(row.teamId)?.name ?? row.teamId }}</span>
          <span class="pm-pts">{{ row.pts }} pts</span>
          <span v-if="rank >= standings.length - relegationCount" class="pm-badge pm-badge--out">
            <ArrowDown :size="10" />
            Relegated
          </span>
        </div>
      </div>

      <!-- Linked league: auto-promoted teams -->
      <template v-if="linkedLeague && relegationCount > 0">
        <div class="pm-section-title pm-section-title--in">
          <ArrowUp :size="12" />
          Promoted from {{ linkedLeague.name }}
        </div>
        <div class="pm-standings">
          <div
            v-for="(row, rank) in linkedLeague.standings.slice(0, relegationCount)"
            :key="row.teamId"
            class="pm-row pm-row--promoted"
          >
            <span class="pm-rank">{{ rank + 1 }}</span>
            <span class="pm-dot" :style="{ background: teamById(row.teamId)?.color ?? '#888' }" />
            <span class="pm-name">{{ teamById(row.teamId)?.name ?? row.teamId }}</span>
            <span class="pm-pts">{{ row.pts }} pts</span>
            <span class="pm-badge pm-badge--in">
              <ArrowUp :size="10" />
              Promoted
            </span>
          </div>
        </div>
        <div class="pm-linked-note">
          Bottom {{ relegationCount }} of {{ linkedLeague.name }} will receive the relegated teams.
        </div>
      </template>

      <!-- No linked league: manual incoming slots -->
      <template v-else-if="relegationCount > 0">
        <div class="pm-section-title pm-section-title--in">
          <ArrowUp :size="12" />
          Incoming Teams ({{ relegationCount }} slot{{ relegationCount > 1 ? "s" : "" }})
        </div>

        <div v-if="availableTeams.length === 0" class="pm-empty">
          No available teams to promote. New season will start with {{ survivingIds.length }} teams.
        </div>

        <div v-else class="pm-slots">
          <div v-for="(_, i) in relegationCount" :key="i" class="pm-slot">
            <span class="pm-slot-label">Slot {{ i + 1 }}</span>
            <select v-model="incomingIds[i]" class="pm-select">
              <option value="">— Leave empty —</option>
              <option v-for="t in selectableFor(i)" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.power }})
              </option>
            </select>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <button class="primary" @click="handleConfirm">Start New Season →</button>
      <button @click="emit('cancel')">Cancel</button>
    </template>
  </AppModal>
</template>

<style scoped>
.pm-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.pm-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}
.pm-section-title--in {
  color: var(--accent);
}

.pm-standings {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.pm-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  background: var(--bg);
  border: 1px solid var(--border-light);
}
.pm-row--relegated {
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
  background: color-mix(in srgb, var(--danger) 4%, var(--surface));
}
.pm-row--relegated + .pm-row--relegated {
  border-top-color: transparent;
  border-radius: 0;
}
.pm-row--relegated:first-of-type {
  border-radius: var(--radius) var(--radius) 0 0;
}
.pm-row--relegated:last-of-type {
  border-radius: 0 0 var(--radius) var(--radius);
}
.pm-row--promoted {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}
.pm-row--promoted + .pm-row--promoted {
  border-top-color: transparent;
  border-radius: 0;
}
.pm-row--promoted:first-of-type {
  border-radius: var(--radius) var(--radius) 0 0;
}
.pm-row--promoted:last-of-type {
  border-radius: 0 0 var(--radius) var(--radius);
}

.pm-rank {
  width: 18px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.pm-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pm-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pm-pts {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.pm-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: var(--radius);
  flex-shrink: 0;
}
.pm-badge--out {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}
.pm-badge--in {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.pm-linked-note {
  font-size: 11px;
  color: var(--text-muted);
  padding: 6px 8px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.pm-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
}

.pm-slots {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pm-slot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pm-slot-label {
  font-size: 11px;
  color: var(--text-muted);
  width: 40px;
  flex-shrink: 0;
}
.pm-select {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}
.pm-select:focus {
  outline: none;
  border-color: var(--accent);
}
</style>
