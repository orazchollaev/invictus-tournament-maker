<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{ teams: Team[] }>()
const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

const count = props.teams.length
const size = Math.pow(2, Math.ceil(Math.log2(count)))
const byeCount = size - count
const matchCount = size / 2 - byeCount

const byeSlots = ref<string[]>(Array(byeCount).fill(""))
const matchSlots = ref(Array.from({ length: matchCount }, () => ({ homeId: "", awayId: "" })))

const usedIds = computed(() => {
  const ids = new Set<string>()
  byeSlots.value.forEach((id) => {
    if (id) ids.add(id)
  })
  matchSlots.value.forEach((s) => {
    if (s.homeId) ids.add(s.homeId)
    if (s.awayId) ids.add(s.awayId)
  })
  return ids
})

function available(currentId: string) {
  return props.teams.filter((t) => t.id === currentId || !usedIds.value.has(t.id))
}

const complete = computed(
  () =>
    byeSlots.value.every((id) => !!id) && matchSlots.value.every((s) => !!s.homeId && !!s.awayId)
)

function confirm() {
  const ids = [...byeSlots.value, ...matchSlots.value.flatMap((s) => [s.homeId, s.awayId])]
  emit("confirm", ids)
}
</script>

<template>
  <div class="md-wrap">
    <div v-if="byeCount > 0" class="md-group">
      <div class="md-group-label">Byes (automatic win)</div>
      <div v-for="(_, i) in byeSlots" :key="'bye-' + i" class="md-row">
        <span class="md-idx">{{ i + 1 }}</span>
        <select v-model="byeSlots[i]" class="md-sel">
          <option value="">— Pick team</option>
          <option v-for="t in available(byeSlots[i])" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
        <span class="md-bye">BYE</span>
      </div>
    </div>

    <div class="md-group">
      <div v-if="byeCount > 0" class="md-group-label">Matches</div>
      <div v-for="(slot, i) in matchSlots" :key="'match-' + i" class="md-row">
        <span class="md-idx">{{ byeCount + i + 1 }}</span>
        <select v-model="slot.homeId" class="md-sel">
          <option value="">— Pick team</option>
          <option v-for="t in available(slot.homeId)" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
        <span class="md-vs">vs</span>
        <select v-model="slot.awayId" class="md-sel">
          <option value="">— Pick team</option>
          <option v-for="t in available(slot.awayId)" :key="t.id" :value="t.id">
            {{ t.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="md-actions">
      <button class="primary" :disabled="!complete" @click="confirm">Confirm</button>
      <button @click="emit('cancel')">Cancel</button>
    </div>
  </div>
</template>

<style scoped>
.md-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.md-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.md-group-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.md-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.md-idx {
  font-size: 11px;
  color: var(--text-muted);
  width: 16px;
  text-align: right;
  flex-shrink: 0;
}
.md-sel {
  width: 140px;
}
.md-vs {
  font-size: 11px;
  color: var(--text-muted);
}
.md-bye {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
.md-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
