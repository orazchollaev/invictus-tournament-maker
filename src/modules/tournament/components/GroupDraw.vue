<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import { useTeamLookup } from "@/composables/useTeamLookup"
import DrawList from "./draw/DrawList.vue"
import type { DrawItem } from "./draw/types"

const props = defineProps<{
  teams: Team[]
  groupCount: number
}>()

const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)

// Some groups get one extra team when division is uneven
function slotsForGroup(g: number): number {
  const base = Math.floor(props.teams.length / props.groupCount)
  const extra = props.teams.length % props.groupCount
  return g < extra ? base + 1 : base
}

function groupLetter(g: number): string {
  return String.fromCharCode(65 + g)
}

const pool = ref<string[]>(props.teams.map((tm) => tm.id))
const groupLists = ref<string[][]>(Array.from({ length: props.groupCount }, () => []))
const armed = ref<string | null>(null)

function resolve(id: string): DrawItem {
  return { id, team: teamById(id)! }
}

function removeFromAll(id: string) {
  const pi = pool.value.indexOf(id)
  if (pi !== -1) {
    pool.value.splice(pi, 1)
    return
  }
  for (const list of groupLists.value) {
    const i = list.indexOf(id)
    if (i !== -1) {
      list.splice(i, 1)
      return
    }
  }
}

function arm(id: string) {
  armed.value = armed.value === id ? null : id
}

function assignTo(target: "pool" | number) {
  const id = armed.value
  if (!id) return
  if (target === "pool") {
    removeFromAll(id)
    pool.value.push(id)
  } else {
    if (groupLists.value[target].length >= slotsForGroup(target)) return
    removeFromAll(id)
    groupLists.value[target].push(id)
  }
  armed.value = null
}

function unassignFromGroup(g: number, id: string) {
  const i = groupLists.value[g].indexOf(id)
  if (i !== -1) groupLists.value[g].splice(i, 1)
  pool.value.push(id)
  if (armed.value === id) armed.value = null
}

const assignedCount = computed(() => props.teams.length - pool.value.length)
const complete = computed(() =>
  groupLists.value.every((list, g) => list.length === slotsForGroup(g))
)

function confirm() {
  // Interleave: slot 0 of each group, slot 1 of each group, ...
  // This matches createGroupBracketTournament's round-robin distribution
  const maxSlots = Math.max(...groupLists.value.map((g) => g.length))
  const ids: string[] = []
  for (let slot = 0; slot < maxSlots; slot++) {
    for (let g = 0; g < props.groupCount; g++) {
      const id = groupLists.value[g][slot]
      if (id) ids.push(id)
    }
  }
  emit("confirm", ids)
}
</script>

<template>
  <div class="gd-wrap">
    <p class="gd-hint">{{ t("manualDraw.groupDrawHint") }}</p>

    <div class="gd-pool">
      <div class="gd-pool-head">
        <span>{{ t("manualDraw.poolTitle") }}</span>
        <span class="gd-count">{{ pool.length }}</span>
      </div>
      <DrawList
        v-model="pool"
        :capacity="Infinity"
        :resolve="resolve"
        :armed-id="armed"
        :placeholder="t('manualDraw.dropHere')"
        @arm="arm"
        @assign="assignTo('pool')"
      />
    </div>

    <div class="gd-groups">
      <div v-for="(_, g) in groupLists" :key="g" class="gd-group">
        <div class="gd-group-header">
          <span>{{ t("manualDraw.groupLabel", { name: groupLetter(g) }) }}</span>
          <span class="gd-count">{{ groupLists[g].length }}/{{ slotsForGroup(g) }}</span>
        </div>
        <DrawList
          v-model="groupLists[g]"
          :capacity="slotsForGroup(g)"
          :resolve="resolve"
          :armed-id="armed"
          :removable="true"
          :placeholder="t('manualDraw.dropHere')"
          @arm="arm"
          @remove="(id) => unassignFromGroup(g, id)"
          @assign="assignTo(g)"
        />
      </div>
    </div>

    <div class="gd-actions">
      <span class="gd-progress">
        {{ t("manualDraw.progress", { done: assignedCount, total: teams.length }) }}
      </span>
      <button class="primary" :disabled="!complete" @click="confirm">
        {{ t("manualDraw.confirmDraw") }}
      </button>
      <button @click="emit('cancel')">{{ t("common.cancel") }}</button>
    </div>
  </div>
</template>

<style scoped>
.gd-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gd-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

.gd-pool {
  border: 1px solid var(--border-light);
  background: var(--bg);
}

.gd-pool-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  padding: 5px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  letter-spacing: 0.03em;
}

.gd-count {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.gd-pool :deep(.dl-list) {
  flex-direction: row;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
  padding: 6px;
}

.gd-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.gd-group {
  border: 1px solid var(--border-light);
  background: var(--bg);
}

.gd-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  padding: 5px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  letter-spacing: 0.03em;
}

.gd-group :deep(.dl-list) {
  padding: 6px;
  min-height: 60px;
}

.gd-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}

.gd-progress {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: auto;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 500px) {
  .gd-groups {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
