<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament, GroupMatch } from "@/modules/tournament/types"
import AppModal from "@/components/AppModal.vue"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { Lock } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useGradualSim } from "../composables/useGradualSim"
import GroupCard from "./group/GroupCard.vue"
import GroupSimToolbar from "./group/GroupSimToolbar.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [groupIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [groupIdx: number, matchIdx: number]
  simGroup: [groupIdx: number]
  simGroupWeek: [groupIdx: number]
  simAll: []
  simWeek: []
  advance: []
}>()

const { t } = useI18n()
const { runSequential } = useGradualSim()
const locked = computed(() => !!props.tournament.groupsDone)

const editingMatch = ref<{ gi: number; mi: number } | null>(null)
const editHome = ref(0)
const editAway = ref(0)

const { teamById } = useTeamLookup(() => props.teams)

const selectedRound = ref<number[]>([])

function roundOf(gi: number): number {
  return selectedRound.value[gi] ?? 0
}

async function handleSimGroupWeek(gi: number) {
  const group = props.tournament.groups![gi]
  const n = group.teamIds.length
  const mpr = Math.floor(n / 2)
  if (mpr < 1) return
  const first = group.matches.findIndex((m) => !m.result)
  if (first === -1) return
  const roundIdx = Math.floor(first / mpr)
  const start = roundIdx * mpr
  const end = Math.min(start + mpr, group.matches.length)
  const cbs: (() => void)[] = []
  for (let mi = start; mi < end; mi++) {
    if (!group.matches[mi].result) {
      const captured = mi
      cbs.push(() => {
        emit("simMatch", gi, captured)
        selectedRound.value[gi] = roundIdx
      })
    }
  }
  await runSequential(cbs)
  const nextFirst = group.matches.findIndex((m) => !m.result)
  if (nextFirst !== -1) selectedRound.value[gi] = Math.floor(nextFirst / mpr)
}

async function handleSimWeek() {
  const groups = props.tournament.groups
  if (!groups) return
  const cbs: (() => void)[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    if (mpr < 1) continue
    const first = group.matches.findIndex((m) => !m.result)
    if (first === -1) continue
    const roundIdx = Math.floor(first / mpr)
    const start = roundIdx * mpr
    const end = Math.min(start + mpr, group.matches.length)
    for (let mi = start; mi < end; mi++) {
      if (!group.matches[mi].result) {
        const cgi = gi,
          cmi = mi
        cbs.push(() => {
          emit("simMatch", cgi, cmi)
          selectedRound.value[cgi] = roundIdx
        })
      }
    }
  }
  await runSequential(cbs)
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    if (mpr < 1) continue
    const nextFirst = group.matches.findIndex((m) => !m.result)
    if (nextFirst !== -1) selectedRound.value[gi] = Math.floor(nextFirst / mpr)
  }
}

async function handleSimGroup(gi: number) {
  const group = props.tournament.groups![gi]
  const n = group.teamIds.length
  const mpr = Math.floor(n / 2)
  const cbs = group.matches
    .map((m, mi) => ({ m, mi }))
    .filter(({ m }) => !m.result)
    .map(({ mi }) => {
      const roundIdx = mpr > 0 ? Math.floor(mi / mpr) : 0
      return () => {
        emit("simMatch", gi, mi)
        selectedRound.value[gi] = roundIdx
      }
    })
  await runSequential(cbs)
}

async function handleSimAll() {
  const groups = props.tournament.groups
  if (!groups) return
  const cbs: (() => void)[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    for (let mi = 0; mi < group.matches.length; mi++) {
      if (!group.matches[mi].result) {
        const cgi = gi,
          cmi = mi
        const roundIdx = mpr > 0 ? Math.floor(mi / mpr) : 0
        cbs.push(() => {
          emit("simMatch", cgi, cmi)
          selectedRound.value[cgi] = roundIdx
        })
      }
    }
  }
  await runSequential(cbs)
}

function openEdit(gi: number, mi: number, match: GroupMatch) {
  if (locked.value) return
  editingMatch.value = { gi, mi }
  editHome.value = match.result?.home ?? 0
  editAway.value = match.result?.away ?? 0
}

function confirmEdit() {
  if (!editingMatch.value) return
  emit("setResult", editingMatch.value.gi, editingMatch.value.mi, editHome.value, editAway.value)
  editingMatch.value = null
}

function cancelEdit() {
  editingMatch.value = null
}

const allDone = computed(
  () => props.tournament.groups?.every((g) => g.matches.every((m) => m.result !== null)) ?? false
)
</script>

<template>
  <div class="gs-wrap">
    <!-- Locked notice -->
    <div v-if="locked" class="gs-locked-notice">
      <Lock :size="14" />
      Group stage complete — results are locked. Switch to the Knockout tab to continue.
    </div>

    <!-- Toolbar (only when not locked) -->
    <GroupSimToolbar
      v-else
      :groups="tournament.groups ?? []"
      :all-done="allDone"
      @sim-week="handleSimWeek"
      @sim-all="handleSimAll"
      @sim-group="handleSimGroup"
      @advance="emit('advance')"
    />

    <div class="gs-legend">
      <span class="legend-qualify">■</span>
      Qualifies
      <template v-if="(tournament.wildcardCount ?? 0) > 0">
        &nbsp;
        <span class="legend-wildcard">╌</span>
        Wildcard (best {{ tournament.wildcardCount }})
      </template>
      &nbsp;
      <span class="legend-out">■</span>
      Eliminated
    </div>

    <!-- Groups grid -->
    <div class="gs-groups">
      <GroupCard
        v-for="(group, gi) in tournament.groups"
        :key="gi"
        :group="group"
        :teams="teams"
        :locked="locked"
        :qualifiers-per-group="tournament.qualifiersPerGroup ?? 2"
        :wildcard-count="tournament.wildcardCount ?? 0"
        :round="roundOf(gi)"
        @update:round="(r) => (selectedRound[gi] = r)"
        @sim-match="(mi) => emit('simMatch', gi, mi)"
        @sim-group-week="handleSimGroupWeek(gi)"
        @open-edit="(mi, match) => openEdit(gi, mi, match)"
      />
    </div>
  </div>

  <!-- Score edit modal -->
  <Teleport to="body">
    <AppModal
      v-if="editingMatch && !locked"
      :title="t('tournament.setResult')"
      width="360px"
      @close="cancelEdit"
    >
      <div class="score-row">
        <span class="score-team">
          {{ teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].homeId)?.name }}
        </span>
        <input v-model.number="editHome" type="number" min="0" class="score-input" />
        <span class="score-sep">–</span>
        <input v-model.number="editAway" type="number" min="0" class="score-input" />
        <span class="score-team">
          {{ teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].awayId)?.name }}
        </span>
      </div>
      <div class="modal-actions mt">
        <button class="primary" @click="confirmEdit">{{ t("common.save") }}</button>
        <button @click="cancelEdit">{{ t("common.cancel") }}</button>
      </div>
    </AppModal>
  </Teleport>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gs-locked-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  padding: 6px 10px;
  margin: 0 8px;
}

.gs-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 12px;
  padding: 0 8px 8px;
}

.gs-legend {
  font-size: 11px;
  color: var(--text-muted);
  padding: 0 8px;
}
.legend-qualify {
  color: var(--accent);
}
.legend-wildcard {
  color: var(--accent);
  opacity: 0.6;
  letter-spacing: -1px;
}

.score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.score-team {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
.score-input {
  width: 52px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  padding: 4px;
}
.score-sep {
  font-size: 16px;
  color: var(--text-muted);
}
.mt {
  margin-top: 12px;
}

@media (max-width: 600px) {
  .gs-groups {
    grid-template-columns: 1fr;
    padding: 0 4px 8px;
  }
}
</style>
