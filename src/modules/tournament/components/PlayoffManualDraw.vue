<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

interface Qualifier {
  teamId: string
  label: string
  teamName: string
}

function buildQualifiers(): Qualifier[] {
  if (!props.tournament.groups) return []
  const qpg = props.tournament.qualifiersPerGroup ?? 2
  const wcCount = props.tournament.wildcardCount ?? 0
  const result: Qualifier[] = []

  for (const group of props.tournament.groups) {
    for (let rank = 0; rank < qpg; rank++) {
      const standing = group.standings[rank]
      if (!standing) continue
      const team = props.teams.find((t) => t.id === standing.teamId)
      result.push({
        teamId: standing.teamId,
        label: `${group.name} · ${ordinal(rank + 1)}`,
        teamName: team?.name ?? standing.teamId,
      })
    }
  }

  if (wcCount > 0) {
    const candidates = props.tournament.groups.flatMap((group) => {
      const s = group.standings[qpg]
      return s ? [{ teamId: s.teamId, groupName: group.name, pts: s.pts, gd: s.gd, gf: s.gf }] : []
    })
    candidates.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    for (let i = 0; i < wcCount && i < candidates.length; i++) {
      const team = props.teams.find((t) => t.id === candidates[i].teamId)
      result.push({
        teamId: candidates[i].teamId,
        label: `${candidates[i].groupName} · Wildcard`,
        teamName: team?.name ?? candidates[i].teamId,
      })
    }
  }

  return result
}

const qualifiers = buildQualifiers()
const count = qualifiers.length
const size = Math.pow(2, Math.ceil(Math.log2(Math.max(count, 2))))
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

function available(currentId: string): Qualifier[] {
  return qualifiers.filter((q) => q.teamId === currentId || !usedIds.value.has(q.teamId))
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
      <div class="md-label">Byes (automatic win)</div>
      <div class="md-bye-grid">
        <div v-for="(_, i) in byeSlots" :key="'bye-' + i" class="md-bye-row">
          <span class="md-idx">{{ i + 1 }}</span>
          <select v-model="byeSlots[i]" class="md-sel">
            <option value="">— Pick team</option>
            <option v-for="q in available(byeSlots[i])" :key="q.teamId" :value="q.teamId">
              {{ q.teamName }} ({{ q.label }})
            </option>
          </select>
          <span class="md-bye-tag">BYE</span>
        </div>
      </div>
    </div>

    <!-- Matches -->
    <div class="md-section">
      <div v-if="byeCount > 0" class="md-label">Matches</div>
      <div class="md-matches-grid">
        <div v-for="(slot, i) in matchSlots" :key="'match-' + i" class="md-card">
          <span class="md-card-num">{{ byeCount + i + 1 }}</span>
          <select v-model="slot.homeId" class="md-sel-full">
            <option value="">— Home</option>
            <option v-for="q in available(slot.homeId)" :key="q.teamId" :value="q.teamId">
              {{ q.teamName }} ({{ q.label }})
            </option>
          </select>
          <span class="md-vs">vs</span>
          <select v-model="slot.awayId" class="md-sel-full">
            <option value="">— Away</option>
            <option v-for="q in available(slot.awayId)" :key="q.teamId" :value="q.teamId">
              {{ q.teamName }} ({{ q.label }})
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="md-actions">
      <button class="primary" :disabled="!complete" @click="confirm">Confirm draw</button>
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

.md-idx {
  font-size: 11px;
  color: var(--text-muted);
  width: 16px;
  text-align: right;
  flex-shrink: 0;
}
.md-sel {
  flex: 1;
  font-size: 12px;
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
}
</style>
