<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import ManualDraw from "../components/ManualDraw.vue"
import GroupDraw from "../components/GroupDraw.vue"
import TeamSelector from "../components/TeamSelector.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import { Trophy, LayoutGrid, List, Shuffle, ArrowLeft } from "@lucide/vue"
import { randomTournamentName } from "@/composables/useRandomNames"
import type { LegMode, PlayoffSeedMode, Tiebreaker } from "@/modules/tournament/types"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket" | "league"

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settingsStore = useSettingsStore()

const name = ref("")
const selected = ref<string[]>([])
const format = ref<TournamentFormat>("bracket")
const drawType = ref<DrawType>(settingsStore.newSeasonDrawType)
const groupCount = ref(4)
const qualifiersPerGroup = ref(2)
const wildcardCount = ref(0)
const showManualDraw = ref(false)
const hasThirdPlace = ref(false)
const playoffSeedMode = ref<PlayoffSeedMode>(settingsStore.newSeasonPlayoffSeedMode)
const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)
const knockoutLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)
const leagueLegMode = ref<LegMode>("single")
const tiebreaker = ref<Tiebreaker>(settingsStore.tiebreaker)
const tierCount = ref(1)
const tierAssignments = ref<Record<string, number>>({})
const promotionCount = ref(1)

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]
const multiLegOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "3×" },
  { value: "quadruple", label: "4×" },
]
const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]

const allTeams = computed(() => teamsStore.teams)
const selectedTeams = computed(() => allTeams.value.filter((t) => selected.value.includes(t.id)))
const allSelected = computed(
  () => selected.value.length === allTeams.value.length && allTeams.value.length > 0
)
const minGroups = 2
const maxGroups = computed(() => Math.floor(selected.value.length / 2))
const minQpg = 1
const maxQpg = computed(() =>
  groupCount.value > 0 ? Math.floor(selected.value.length / groupCount.value) : 2
)
const maxWildcards = computed(() => {
  const minGroupSize = Math.floor(selected.value.length / groupCount.value)
  return qualifiersPerGroup.value < minGroupSize ? groupCount.value : 0
})
const canCreate = computed(() => !!name.value.trim() && selected.value.length >= 2)
const teamsPerGroup = computed(() =>
  groupCount.value > 0 ? Math.ceil(selected.value.length / groupCount.value) : 0
)

const tierNames = computed(() => {
  const names: string[] = []
  for (let i = 0; i < tierCount.value; i++) {
    names.push(i === 0 ? "Division 1" : `Division ${i + 1}`)
  }
  return names
})

const teamsPerTier = computed(() => {
  const buckets: string[][] = Array.from({ length: tierCount.value }, () => [])
  for (const team of selectedTeams.value) {
    const tier = tierAssignments.value[team.id] ?? 0
    buckets[Math.min(tier, tierCount.value - 1)].push(team.id)
  }
  return buckets
})

const maxPromotionCount = computed(() => {
  if (tierCount.value <= 1) return 0
  return Math.max(0, Math.min(...teamsPerTier.value.map((b) => b.length)) - 1)
})

watch(maxGroups, (max) => {
  groupCount.value = Math.max(minGroups, Math.min(groupCount.value, max))
})
watch(maxQpg, (max) => {
  qualifiersPerGroup.value = Math.max(minQpg, Math.min(qualifiersPerGroup.value, max))
})
watch(maxWildcards, (max) => {
  wildcardCount.value = Math.min(wildcardCount.value, max)
})
watch(tierCount, (count) => {
  const sorted = [...selectedTeams.value].sort((a, b) => b.power - a.power)
  const assignments: Record<string, number> = {}
  const perTier = Math.ceil(sorted.length / count)
  sorted.forEach((team, i) => {
    assignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
  })
  tierAssignments.value = assignments
})
watch(selectedTeams, (teams) => {
  if (tierCount.value <= 1) return
  const count = tierCount.value
  const sorted = [...teams].sort((a, b) => b.power - a.power)
  const perTier = Math.ceil(sorted.length / count)
  const newAssignments = { ...tierAssignments.value }
  sorted.forEach((team, i) => {
    if (newAssignments[team.id] === undefined) {
      newAssignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
    }
  })
  for (const id of Object.keys(newAssignments)) {
    if (!teams.find((t) => t.id === id)) delete newAssignments[id]
  }
  tierAssignments.value = newAssignments
})

function toggleAll() {
  selected.value = allSelected.value ? [] : allTeams.value.map((t) => t.id)
}

function setFormat(f: TournamentFormat) {
  format.value = f
  if (f === "league") return
  drawType.value =
    f === "group+bracket" ? settingsStore.newSeasonGroupDrawType : settingsStore.newSeasonDrawType
  if (f === "group+bracket") {
    playoffSeedMode.value = settingsStore.newSeasonPlayoffSeedMode
    groupCount.value = Math.min(4, maxGroups.value)
    qualifiersPerGroup.value = Math.min(2, maxQpg.value)
  }
}

function handleCreate() {
  if (!canCreate.value) return
  if (format.value === "league") {
    doCreate()
    return
  }
  if (drawType.value === "manual") {
    showManualDraw.value = true
    return
  }
  doCreate()
}

function doCreate(orderedIds?: string[]) {
  if (format.value === "league") {
    if (tierCount.value > 1) {
      const tierDefs = teamsPerTier.value.map((ids, i) => ({
        name: tierNames.value[i],
        teamIds: ids,
      }))
      const id = store.createMultiTierLeagueTournament(
        name.value.trim(),
        tierDefs,
        leagueLegMode.value,
        promotionCount.value,
        tiebreaker.value
      )
      router.push(`/tournaments/${id}`)
      return
    }
    const id = store.createLeagueTournament(
      name.value.trim(),
      selected.value,
      leagueLegMode.value,
      tiebreaker.value
    )
    router.push(`/tournaments/${id}`)
    return
  }
  const isGroup = format.value === "group+bracket"
  const gc = isGroup ? groupCount.value : undefined
  const qpg = isGroup ? qualifiersPerGroup.value : undefined
  const isSeeded = drawType.value === "seeded"
  const gLeg = isGroup ? groupLegMode.value : "single"
  const id = store.create(
    name.value.trim(),
    selected.value,
    isSeeded,
    orderedIds,
    gc,
    qpg,
    isGroup ? wildcardCount.value : 0,
    gLeg,
    knockoutLegMode.value,
    finalLegMode.value,
    tiebreaker.value
  )
  if (isGroup) store.setPlayoffSeedMode(id, playoffSeedMode.value)
  if (hasThirdPlace.value) store.toggleThirdPlace(id)
  router.push(`/tournaments/${id}`)
}
</script>

<template>
  <div class="page">
    <!-- Page header -->
    <div class="ctp-header">
      <RouterLink to="/tournaments" class="back-link">
        <ArrowLeft :size="14" />
        Tournaments
      </RouterLink>
      <h2 class="ctp-title">New Tournament</h2>
    </div>

    <!-- Manual draw overlay -->
    <template v-if="showManualDraw">
      <div class="ctp-card">
        <GroupDraw
          v-if="format === 'group+bracket'"
          :teams="selectedTeams"
          :group-count="groupCount"
          @confirm="(ids) => doCreate(ids)"
          @cancel="showManualDraw = false"
        />
        <ManualDraw
          v-else
          :teams="selectedTeams"
          @confirm="(ids) => doCreate(ids)"
          @cancel="showManualDraw = false"
        />
      </div>
    </template>

    <template v-else>
      <!-- Name -->
      <div class="ctp-card">
        <div class="ctp-section-title">Tournament Name</div>
        <div class="ctp-name-wrap">
          <input
            v-model="name"
            class="ctp-name-input"
            placeholder="e.g. Spring Championship 2025"
            @keyup.enter="handleCreate"
          />
          <button class="btn-random" title="Random name" @click="name = randomTournamentName()">
            <Shuffle :size="14" />
          </button>
        </div>
      </div>

      <!-- Teams -->
      <div class="ctp-card">
        <div class="ctp-section-title">Participating Teams</div>
        <TeamSelector :teams="allTeams" :selected="selected" @update:selected="selected = $event" />
      </div>

      <!-- Format -->
      <div class="ctp-card">
        <div class="ctp-section-title">Tournament Format</div>
        <div class="ctp-format-row">
          <button
            class="ctp-format-card"
            :class="{ 'ctp-format-card--on': format === 'bracket' }"
            @click="setFormat('bracket')"
          >
            <Trophy :size="28" class="ctp-format-icon" />
            <span class="ctp-format-title">Knockout Bracket</span>
            <span class="ctp-format-desc">Lose once and you're out</span>
          </button>
          <button
            class="ctp-format-card"
            :class="{ 'ctp-format-card--on': format === 'group+bracket' }"
            :disabled="selected.length < 4"
            @click="setFormat('group+bracket')"
          >
            <LayoutGrid :size="28" class="ctp-format-icon" />
            <span class="ctp-format-title">Groups + Knockout</span>
            <span class="ctp-format-desc">Group stage, then top teams advance</span>
          </button>
          <button
            class="ctp-format-card"
            :class="{ 'ctp-format-card--on': format === 'league' }"
            :disabled="selected.length < 2"
            @click="setFormat('league')"
          >
            <List :size="28" class="ctp-format-icon" />
            <span class="ctp-format-title">League</span>
            <span class="ctp-format-desc">Everyone plays everyone, most points wins</span>
          </button>
        </div>

        <!-- Group count + qualifiers -->
        <div v-if="format === 'group+bracket'" class="ctp-gc-block">
          <div class="ctp-gc-row">
            <span class="ctp-gc-label">Number of Groups</span>
            <div class="ctp-gc-stepper">
              <button
                :disabled="groupCount <= minGroups"
                @click="groupCount = Math.max(minGroups, groupCount - 1)"
              >
                −
              </button>
              <span class="ctp-gc-val">{{ groupCount }}</span>
              <button
                :disabled="groupCount >= maxGroups"
                @click="groupCount = Math.min(maxGroups, groupCount + 1)"
              >
                +
              </button>
            </div>
            <span class="ctp-gc-hint">~{{ teamsPerGroup }} teams per group</span>
          </div>
          <div class="ctp-gc-row">
            <span class="ctp-gc-label">Teams that advance</span>
            <div class="ctp-gc-stepper">
              <button
                :disabled="qualifiersPerGroup <= minQpg"
                @click="qualifiersPerGroup = Math.max(minQpg, qualifiersPerGroup - 1)"
              >
                −
              </button>
              <span class="ctp-gc-val">{{ qualifiersPerGroup }}</span>
              <button
                :disabled="qualifiersPerGroup >= maxQpg"
                @click="qualifiersPerGroup = Math.min(maxQpg, qualifiersPerGroup + 1)"
              >
                +
              </button>
            </div>
            <span class="ctp-gc-hint">
              per group →
              <strong>{{ qualifiersPerGroup * groupCount }}</strong>
              reach knockout
            </span>
          </div>
          <div v-if="maxWildcards > 0" class="ctp-gc-row">
            <span class="ctp-gc-label">Best runner-up wildcards</span>
            <div class="ctp-gc-stepper">
              <button
                :disabled="wildcardCount <= 0"
                @click="wildcardCount = Math.max(0, wildcardCount - 1)"
              >
                −
              </button>
              <span class="ctp-gc-val">{{ wildcardCount }}</span>
              <button
                :disabled="wildcardCount >= maxWildcards"
                @click="wildcardCount = Math.min(maxWildcards, wildcardCount + 1)"
              >
                +
              </button>
            </div>
            <span class="ctp-gc-hint">
              →
              <strong>{{ qualifiersPerGroup * groupCount + wildcardCount }}</strong>
              total
            </span>
          </div>
        </div>
      </div>

      <!-- League Format options -->
      <template v-if="format === 'league'">
        <div class="ctp-card">
          <div class="ctp-section-title">Round Format</div>
          <div class="ctp-leg-row">
            <span class="ctp-row-label">Schedule</span>
            <BtnGroup v-model="leagueLegMode" :options="multiLegOptions" />
          </div>
          <div class="ctp-hint-box" style="margin-top: 8px">
            <strong>Single</strong>
            — once &nbsp;·&nbsp;
            <strong>Double</strong>
            — home &amp; away &nbsp;·&nbsp;
            <strong>3×</strong>
            — 3 matches &nbsp;·&nbsp;
            <strong>4×</strong>
            — 4 matches (2H &amp; 2A)
          </div>
        </div>

        <div class="ctp-card">
          <div class="ctp-section-title">League Tiers</div>
          <div class="ctp-gc-row">
            <span class="ctp-gc-label">Number of Tiers</span>
            <div class="ctp-gc-stepper">
              <button :disabled="tierCount <= 1" @click="tierCount = Math.max(1, tierCount - 1)">
                −
              </button>
              <span class="ctp-gc-val">{{ tierCount }}</span>
              <button
                :disabled="tierCount >= 4 || selected.length < (tierCount + 1) * 2"
                @click="tierCount = Math.min(4, tierCount + 1)"
              >
                +
              </button>
            </div>
            <span class="ctp-gc-hint">
              {{ tierCount === 1 ? "single division" : `${tierCount} divisions` }}
            </span>
          </div>

          <template v-if="tierCount > 1">
            <div class="ctp-gc-row" style="margin-top: 8px">
              <span class="ctp-gc-label">Promotion / Relegation</span>
              <div class="ctp-gc-stepper">
                <button
                  :disabled="promotionCount <= 1"
                  @click="promotionCount = Math.max(1, promotionCount - 1)"
                >
                  −
                </button>
                <span class="ctp-gc-val">{{ promotionCount }}</span>
                <button
                  :disabled="promotionCount >= maxPromotionCount"
                  @click="promotionCount = Math.min(maxPromotionCount, promotionCount + 1)"
                >
                  +
                </button>
              </div>
              <span class="ctp-gc-hint">teams swap between adjacent tiers</span>
            </div>

            <div class="ctp-tier-blocks">
              <div v-for="(ids, ti) in teamsPerTier" :key="ti" class="ctp-tier-block">
                <div class="ctp-tier-label">{{ tierNames[ti] }} ({{ ids.length }})</div>
                <div class="ctp-tier-chips">
                  <div v-for="teamId in ids" :key="teamId" class="ctp-tier-chip">
                    <span
                      class="ctp-dot"
                      :style="{
                        background: allTeams.find((t) => t.id === teamId)?.color ?? '#888',
                      }"
                    />
                    <span class="ctp-tier-chip-name">
                      {{ allTeams.find((t) => t.id === teamId)?.name }}
                    </span>
                    <div class="ctp-tier-move">
                      <button
                        v-if="ti > 0"
                        class="ctp-tier-mv-btn"
                        title="Move up"
                        @click="tierAssignments[teamId] = ti - 1"
                      >
                        ↑
                      </button>
                      <button
                        v-if="ti < tierCount - 1"
                        class="ctp-tier-mv-btn"
                        title="Move down"
                        @click="tierAssignments[teamId] = ti + 1"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <!-- Draw Method (bracket formats) -->
      <template v-if="format !== 'league'">
        <div class="ctp-card">
          <div class="ctp-section-title">Draw Method</div>
          <div class="ctp-draw-rows">
            <div class="ctp-draw-row">
              <span v-if="format === 'group+bracket'" class="ctp-row-label">Group stage</span>
              <BtnGroup v-model="drawType" :options="drawOptions" />
            </div>
            <div v-if="format === 'group+bracket'" class="ctp-draw-row">
              <span class="ctp-row-label">Playoff bracket</span>
              <BtnGroup
                v-model="playoffSeedMode"
                :options="[
                  { value: 'cross', label: 'Cross' },
                  { value: 'no-same-group', label: 'No rematch' },
                  { value: 'random', label: 'Random' },
                ]"
              />
            </div>
          </div>
          <div class="ctp-hint-box">
            <strong>Random</strong>
            — teams placed by chance &nbsp;·&nbsp;
            <strong>Seeded</strong>
            — top teams kept apart &nbsp;·&nbsp;
            <strong>Manual</strong>
            — you arrange them
            <template v-if="format === 'group+bracket'">
              <br />
              <strong>Playoff bracket:</strong>
              Cross — A1 vs B2, B1 vs A2 &nbsp;·&nbsp; No rematch — avoids same-group matchups in
              Round 1 &nbsp;·&nbsp; Random — fully random
            </template>
          </div>
        </div>
      </template>

      <!-- 3rd Place Option -->
      <template v-if="selected.length >= 4 && format !== 'league'">
        <div class="ctp-card">
          <div class="ctp-section-title">Options</div>
          <label class="ctp-toggle-row">
            <input v-model="hasThirdPlace" type="checkbox" />
            <span class="ctp-toggle-label">3rd Place Match</span>
            <span class="ctp-toggle-hint">Semi-final losers play for bronze medal</span>
          </label>
        </div>
      </template>

      <!-- Tiebreaker -->
      <template v-if="format !== 'bracket'">
        <div class="ctp-card">
          <div class="ctp-section-title">Tiebreaker</div>
          <div class="ctp-leg-row">
            <span class="ctp-row-label">Method</span>
            <BtnGroup
              v-model="tiebreaker"
              :options="[
                { value: 'head-to-head', label: 'H2H' },
                { value: 'goal-diff', label: 'Goal diff' },
              ]"
            />
          </div>
        </div>
      </template>

      <!-- Leg Modes (bracket formats) -->
      <template v-if="format !== 'league'">
        <div class="ctp-card">
          <div class="ctp-section-title">Legs per Match</div>
          <div class="ctp-leg-rows">
            <div v-if="format === 'group+bracket'" class="ctp-leg-row">
              <span class="ctp-row-label">Group Stage</span>
              <BtnGroup v-model="groupLegMode" :options="multiLegOptions" />
            </div>
            <div class="ctp-leg-row">
              <span class="ctp-row-label">Knockout Rounds</span>
              <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
            </div>
            <div class="ctp-leg-row">
              <span class="ctp-row-label">Final</span>
              <BtnGroup v-model="finalLegMode" :options="legOptions" />
            </div>
          </div>
        </div>
      </template>

      <!-- Footer actions -->
      <div class="ctp-footer">
        <button class="primary ctp-create-btn" :disabled="!canCreate" @click="handleCreate">
          Create Tournament
          <span v-if="selected.length >= 2" class="ctp-badge">{{ selected.length }} teams</span>
        </button>
        <RouterLink to="/tournaments" class="ctp-cancel-link">Cancel</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ctp-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.ctp-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.ctp-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}

.ctp-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.ctp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ctp-section-header .ctp-section-title {
  margin-bottom: 0;
}

.ctp-count {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.ctp-name-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ctp-name-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 15px;
  padding: 8px 36px 8px 10px;
}

.btn-random {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--text-muted);
  transition:
    color 0.15s,
    background 0.15s;
}
.btn-random:hover {
  color: var(--text);
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
}

.ctp-team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 2px 0;
}

.ctp-check {
  display: none;
}

.ctp-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 10px;
  border: 1px solid var(--border-light);
  background: var(--bg);
  user-select: none;
  border-radius: var(--radius);
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s;
}
.ctp-chip:hover {
  background: var(--surface);
}
.ctp-chip--on {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: var(--accent);
  color: var(--accent);
}
.ctp-chip--on .ctp-power {
  color: var(--accent);
  opacity: 0.65;
}

.ctp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ctp-power {
  color: var(--text-muted);
  font-size: 11px;
}

.ctp-warn {
  font-size: 12px;
  color: var(--danger);
  margin: 8px 0 0;
}

.ctp-format-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.ctp-format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 16px 10px;
  border: 2px solid var(--border-light);
  background: var(--bg);
  cursor: pointer;
  text-align: center;
  border-radius: var(--radius);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.ctp-format-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
}
.ctp-format-card--on {
  border-color: var(--accent) !important;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg)) !important;
}
.ctp-format-card:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ctp-format-icon {
  color: var(--accent);
}
.ctp-format-title {
  font-size: 13px;
  font-weight: 700;
}
.ctp-format-desc {
  font-size: 11px;
  color: var(--text-muted);
}

.ctp-gc-block {
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ctp-gc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ctp-gc-label {
  font-size: 13px;
  color: var(--text);
  width: 160px;
  flex-shrink: 0;
}
.ctp-gc-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.ctp-gc-stepper button {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  font-size: 16px;
  line-height: 1;
  border-radius: 0;
  display: flex;
  justify-content: center;
}
.ctp-gc-stepper button:first-child {
  border-right: 1px solid var(--border);
}
.ctp-gc-stepper button:last-child {
  border-left: 1px solid var(--border);
}
.ctp-gc-val {
  width: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  font-family: var(--font-ui);
}
.ctp-gc-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.ctp-row-label {
  font-size: 13px;
  color: var(--text);
  width: 140px;
  flex-shrink: 0;
}

.ctp-hint-box {
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.ctp-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.ctp-toggle-label {
  font-size: 14px;
  font-weight: 600;
}
.ctp-toggle-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.ctp-draw-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ctp-draw-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ctp-leg-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ctp-leg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ctp-tier-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}
.ctp-tier-block {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}
.ctp-tier-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 5px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}
.ctp-tier-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px 10px;
}
.ctp-tier-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 5px 3px 7px;
  border: 1px solid var(--border-light);
  background: var(--surface);
  border-radius: var(--radius);
}
.ctp-tier-chip-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ctp-tier-move {
  display: inline-flex;
  gap: 2px;
  margin-left: 2px;
}
.ctp-tier-mv-btn {
  padding: 0 4px;
  font-size: 11px;
  line-height: 18px;
  height: 18px;
  border-color: transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius);
}
.ctp-tier-mv-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.ctp-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 8px;
  border-top: 1px solid var(--border-light);
  margin-top: 4px;
}

.ctp-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 8px 20px;
}

.ctp-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius);
  padding: 0 8px;
  font-size: 12px;
}

.ctp-cancel-link {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  transition:
    color 0.15s,
    border-color 0.15s;
}
.ctp-cancel-link:hover {
  color: var(--text);
  border-color: var(--border);
}

@media (max-width: 640px) {
  .ctp-format-row {
    grid-template-columns: 1fr;
  }
  .ctp-gc-label,
  .ctp-row-label {
    width: auto;
    flex: 1 1 100%;
  }
}
</style>
