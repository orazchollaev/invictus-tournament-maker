<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{
  teams: Team[]
  groupCount: number
}>()

const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

// Some groups get one extra team when division is uneven
function slotsForGroup(g: number): number {
  const base = Math.floor(props.teams.length / props.groupCount)
  const extra = props.teams.length % props.groupCount
  return g < extra ? base + 1 : base
}

const groupNames = Array.from(
  { length: props.groupCount },
  (_, i) => `Group ${String.fromCharCode(65 + i)}`
)

// groupSlots[g][slot] = teamId or ""
const groupSlots = ref<string[][]>(
  Array.from({ length: props.groupCount }, (_, g) => Array(slotsForGroup(g)).fill(""))
)

const usedIds = computed(() => {
  const ids = new Set<string>()
  groupSlots.value.forEach((g) =>
    g.forEach((id) => {
      if (id) ids.add(id)
    })
  )
  return ids
})

function available(currentId: string) {
  return props.teams.filter((t) => t.id === currentId || !usedIds.value.has(t.id))
}

const complete = computed(() => groupSlots.value.every((g) => g.every((id) => !!id)))

function confirm() {
  // Interleave: slot 0 of each group, slot 1 of each group, ...
  // This matches createGroupBracketTournament's round-robin distribution
  const maxSlots = Math.max(...groupSlots.value.map((g) => g.length))
  const ids: string[] = []
  for (let slot = 0; slot < maxSlots; slot++) {
    for (let g = 0; g < props.groupCount; g++) {
      const id = groupSlots.value[g][slot]
      if (id) ids.push(id)
    }
  }
  emit("confirm", ids)
}

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}
</script>

<template>
  <div class="gd-wrap">
    <p class="gd-hint">Assign teams to each group — order determines the draw.</p>

    <div class="gd-groups">
      <div v-for="(_, g) in groupSlots" :key="g" class="gd-group">
        <div class="gd-group-header">{{ groupNames[g] }}</div>
        <div class="gd-slots">
          <div v-for="(_, slot) in groupSlots[g]" :key="slot" class="gd-slot">
            <span class="gd-slot-num">{{ slot + 1 }}</span>
            <span
              v-if="groupSlots[g][slot]"
              class="gd-dot"
              :style="{ background: teamById(groupSlots[g][slot])?.color ?? '#888' }"
            />
            <select v-model="groupSlots[g][slot]" class="gd-sel">
              <option value="">— Select team</option>
              <option v-for="t in available(groupSlots[g][slot])" :key="t.id" :value="t.id">
                {{ t.name }} ({{ t.power }})
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="gd-actions">
      <button class="primary" :disabled="!complete" @click="confirm">Confirm Draw</button>
      <button @click="emit('cancel')">Cancel</button>
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

.gd-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  max-height: 340px;
  overflow-y: auto;
}

.gd-group {
  border: 1px solid var(--border-light);
  background: var(--bg);
}

.gd-group-header {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font);
  padding: 5px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  letter-spacing: 0.03em;
}

.gd-slots {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 6px;
}

.gd-slot {
  display: flex;
  align-items: center;
  gap: 5px;
}

.gd-slot-num {
  font-size: 10px;
  color: var(--text-muted);
  width: 12px;
  flex-shrink: 0;
  text-align: right;
}

.gd-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gd-sel {
  flex: 1;
  font-size: 11px;
  padding: 2px 4px;
  min-width: 0;
}

.gd-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}

@media (max-width: 500px) {
  .gd-groups {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
