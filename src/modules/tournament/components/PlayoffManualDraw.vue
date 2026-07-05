<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import DrawList from "./draw/DrawList.vue"
import type { DrawItem } from "./draw/types"

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  confirm: [orderedIds: string[]]
  cancel: []
}>()

const { t } = useI18n()

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
      const team = props.teams.find((tm) => tm.id === standing.teamId)
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
      const team = props.teams.find((tm) => tm.id === candidates[i].teamId)
      result.push({
        teamId: candidates[i].teamId,
        label: `${candidates[i].groupName} · ${t("manualDraw.wildcard")}`,
        teamName: team?.name ?? candidates[i].teamId,
      })
    }
  }

  return result
}

const qualifiers = buildQualifiers()
const qualifierById = new Map(qualifiers.map((q) => [q.teamId, q]))
const count = qualifiers.length
const size = Math.pow(2, Math.ceil(Math.log2(Math.max(count, 2))))
const byeCount = size - count
const matchCount = size / 2 - byeCount

const pool = ref<string[]>(qualifiers.map((q) => q.teamId))
const byeList = ref<string[]>([])
const homeLists = ref<string[][]>(Array.from({ length: matchCount }, () => []))
const awayLists = ref<string[][]>(Array.from({ length: matchCount }, () => []))
const armed = ref<string | null>(null)

function resolve(teamId: string): DrawItem {
  const q = qualifierById.get(teamId)!
  const team = props.teams.find((tm) => tm.id === teamId)
  return {
    id: teamId,
    team: team ?? { id: teamId, name: q.teamName, color: "#888" },
    subLabel: q.label,
  }
}

function removeFromAll(id: string) {
  const pi = pool.value.indexOf(id)
  if (pi !== -1) {
    pool.value.splice(pi, 1)
    return
  }
  const bi = byeList.value.indexOf(id)
  if (bi !== -1) {
    byeList.value.splice(bi, 1)
    return
  }
  for (const list of [...homeLists.value, ...awayLists.value]) {
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

type Target = "pool" | "bye" | { side: "home" | "away"; i: number }

function assignTo(target: Target) {
  const id = armed.value
  if (!id) return
  if (target === "pool") {
    removeFromAll(id)
    pool.value.push(id)
  } else if (target === "bye") {
    if (byeList.value.length >= byeCount) return
    removeFromAll(id)
    byeList.value.push(id)
  } else {
    const list = target.side === "home" ? homeLists.value[target.i] : awayLists.value[target.i]
    if (list.length >= 1) return
    removeFromAll(id)
    list.push(id)
  }
  armed.value = null
}

function unassign(list: string[], id: string) {
  const i = list.indexOf(id)
  if (i !== -1) list.splice(i, 1)
  pool.value.push(id)
  if (armed.value === id) armed.value = null
}

const assignedCount = computed(() => qualifiers.length - pool.value.length)
const complete = computed(
  () =>
    byeList.value.length === byeCount &&
    homeLists.value.every((l) => l.length === 1) &&
    awayLists.value.every((l) => l.length === 1)
)

function confirm() {
  const byeSlots = byeList.value.slice()
  const matchSlots = homeLists.value.map((h, i) => ({
    homeId: h[0] ?? "",
    awayId: awayLists.value[i][0] ?? "",
  }))
  const ids = [...byeSlots, ...matchSlots.flatMap((s) => [s.homeId, s.awayId])]
  emit("confirm", ids)
}
</script>

<template>
  <div class="md-wrap">
    <div class="md-pool">
      <div class="md-pool-head">
        <span>{{ t("manualDraw.poolTitle") }}</span>
        <span class="md-count">{{ pool.length }}</span>
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

    <!-- Byes -->
    <div v-if="byeCount > 0" class="md-section">
      <div class="md-label">
        <span>{{ t("manualDraw.byesTitle") }}</span>
        <span class="md-count">{{ byeList.length }}/{{ byeCount }}</span>
      </div>
      <DrawList
        v-model="byeList"
        :capacity="byeCount"
        :resolve="resolve"
        :armed-id="armed"
        :removable="true"
        :placeholder="t('manualDraw.dropHere')"
        class="md-bye-list"
        @arm="arm"
        @remove="(id) => unassign(byeList, id)"
        @assign="assignTo('bye')"
      />
    </div>

    <!-- Matches -->
    <div class="md-section">
      <div v-if="byeCount > 0" class="md-label">{{ t("manualDraw.matches") }}</div>
      <div class="md-matches-grid">
        <div v-for="(_, i) in homeLists" :key="'match-' + i" class="md-card">
          <span class="md-card-num">{{ byeCount + i + 1 }}</span>
          <div class="md-field">
            <span class="md-field-label">{{ t("manualDraw.home") }}</span>
            <DrawList
              v-model="homeLists[i]"
              :capacity="1"
              :resolve="resolve"
              :armed-id="armed"
              :removable="true"
              :placeholder="t('manualDraw.dropHere')"
              @arm="arm"
              @remove="(id) => unassign(homeLists[i], id)"
              @assign="assignTo({ side: 'home', i })"
            />
          </div>
          <span class="md-vs">{{ t("common.vs") }}</span>
          <div class="md-field">
            <span class="md-field-label">{{ t("manualDraw.away") }}</span>
            <DrawList
              v-model="awayLists[i]"
              :capacity="1"
              :resolve="resolve"
              :armed-id="armed"
              :removable="true"
              :placeholder="t('manualDraw.dropHere')"
              @arm="arm"
              @remove="(id) => unassign(awayLists[i], id)"
              @assign="assignTo({ side: 'away', i })"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="md-actions">
      <span class="md-progress">
        {{ t("manualDraw.progress", { done: assignedCount, total: qualifiers.length }) }}
      </span>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.md-pool {
  border: 1px solid var(--border-light);
  background: var(--bg);
}
.md-pool-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  letter-spacing: 0.03em;
}
.md-pool :deep(.dl-list) {
  flex-direction: row;
  flex-wrap: wrap;
  max-height: 120px;
  overflow-y: auto;
  padding: 6px;
}
.md-count {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.md-bye-list :deep(.dl-list) {
  flex-direction: row;
  flex-wrap: wrap;
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
.md-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.md-field-label {
  font-size: 10px;
  color: var(--text-muted);
}
.md-vs {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}

.md-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  border-top: 1px solid var(--border-light);
}
.md-progress {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: auto;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .md-matches-grid {
    grid-template-columns: 1fr;
  }
}
</style>
