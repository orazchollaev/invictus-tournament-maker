<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{ teams: Team[] }>()
const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

const { t } = useI18n()

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
    <!-- Byes -->
    <div v-if="byeCount > 0" class="md-section">
      <div class="md-label">{{ t("manualDraw.byesTitle") }}</div>
      <div class="md-bye-grid">
        <div v-for="(_, i) in byeSlots" :key="'bye-' + i" class="md-bye-row">
          <span class="md-idx">{{ i + 1 }}</span>
          <select v-model="byeSlots[i]" class="md-sel">
            <option value="">{{ t("manualDraw.pickTeam") }}</option>
            <option v-for="tm in available(byeSlots[i])" :key="tm.id" :value="tm.id">
              {{ tm.name }}
            </option>
          </select>
          <span class="md-bye-tag">{{ t("manualDraw.bye") }}</span>
        </div>
      </div>
    </div>

    <!-- Matches -->
    <div class="md-section">
      <div v-if="byeCount > 0" class="md-label">{{ t("manualDraw.matches") }}</div>
      <div class="md-matches-grid">
        <div v-for="(slot, i) in matchSlots" :key="'match-' + i" class="md-card">
          <span class="md-card-num">{{ byeCount + i + 1 }}</span>
          <select v-model="slot.homeId" class="md-sel-full">
            <option value="">{{ t("manualDraw.home") }}</option>
            <option v-for="tm in available(slot.homeId)" :key="tm.id" :value="tm.id">
              {{ tm.name }}
            </option>
          </select>
          <span class="md-vs">{{ t("common.vs") }}</span>
          <select v-model="slot.awayId" class="md-sel-full">
            <option value="">{{ t("manualDraw.away") }}</option>
            <option v-for="tm in available(slot.awayId)" :key="tm.id" :value="tm.id">
              {{ tm.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="md-actions">
      <button class="primary" :disabled="!complete" @click="confirm">
        {{ t("manualDraw.confirmDraw") }}
      </button>
      <button @click="emit('cancel')">{{ t("common.cancel") }}</button>
    </div>
  </div>
</template>

<style scoped>
.md-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.md-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.md-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

/* Byes: single column */
.md-bye-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.md-bye-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Matches: 2-column card grid */
.md-matches-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 2px;
}
.md-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--border-light);
  background: var(--bg);
}
.md-card-num {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  line-height: 1;
}
.md-sel-full {
  width: 100%;
  font-size: 12px;
}
.md-vs {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}

/* Shared */
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
.md-bye-tag {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
}
.md-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}

@media (max-width: 560px) {
  .md-matches-grid {
    grid-template-columns: 1fr;
  }
  .md-sel {
    width: 100%;
    flex: 1;
  }
}
</style>
