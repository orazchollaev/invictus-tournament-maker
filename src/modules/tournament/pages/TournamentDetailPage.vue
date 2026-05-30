<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

import BracketPanel from "@/modules/tournament/components/BracketPanel.vue"
import GroupStage from "@/modules/tournament/components/GroupStage.vue"
import LeagueView from "@/modules/tournament/components/LeagueView.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TournamentSettings from "@/modules/tournament/components/TournamentSettings.vue"
import TournamentStats from "@/modules/tournament/components/TournamentStats.vue"
import PromotionModal from "@/modules/tournament/components/PromotionModal.vue"
import AppModal from "@/components/AppModal.vue"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { useSettingsStore } from "@/modules/settings/store"
import { Settings, Trophy, Lock, ArrowLeft, Zap } from "lucide-vue-next"

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

const {
  store,
  allTeams,
  tournament,
  winnerTeam,
  dateStr,
  deleteTournament,
  resetTournament,
  startNewSeason,
  startNewLeagueSeason,
  hasAnyResults,
  availableTeams,
  addTeam,
  removeTeam,
  redrawTournament,
  setPlayoffSeedMode,
  changeGroupCount,
  changeQualifiersPerGroup,
  changeWildcardCount,
  changeLegMode,
} = useTournamentDetail()

const showSeasonModal = ref(false)
const showManualSeason = ref(false)
const showSettingsModal = ref(false)
const showPromotionModal = ref(false)
const showMultiTierModal = ref(false)

const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)
const activeTierIdx = ref(0)

const linkedLeague = computed(() => {
  const t = tournament.value
  if (!t?.linkedLeagueId) return undefined
  return store.getById(t.linkedLeagueId)
})

const otherLeagues = computed(() =>
  store.tournaments
    .filter((t) => t.format === "league" && t.id !== tournament.value?.id)
    .map((t) => ({ id: t.id, name: t.name, season: t.season }))
)

function openNewSeason() {
  const t = tournament.value
  if (!t) return

  // Multi-tier league new season
  if (t.format === "league" && isMultiTier.value) {
    showMultiTierModal.value = true
    return
  }

  // Single-tier league with relegation: show promotion/relegation modal
  if (t.format === "league" && (t.relegationCount ?? 0) > 0) {
    if (t.linkedLeagueId && !linkedLeague.value?.winnerId) {
      alert(
        `"${linkedLeague.value?.name ?? "Linked league"}" must finish before starting a new season.`
      )
      return
    }
    showPromotionModal.value = true
    return
  }

  const isGroup = t.format === "group+bracket"
  const drawType = isGroup ? settings.newSeasonGroupDrawType : settings.newSeasonDrawType
  const playoffSeedMode = isGroup ? settings.newSeasonPlayoffSeedMode : undefined
  const thirdPlace = t.hasThirdPlace ?? false
  if (drawType === "random") {
    startNewSeason(false, undefined, thirdPlace, playoffSeedMode)
  } else if (drawType === "seeded") {
    startNewSeason(true, undefined, thirdPlace, playoffSeedMode)
  } else {
    showManualSeason.value = true
    showSeasonModal.value = true
  }
}

function handlePromotionConfirm(newTeamIds: string[]) {
  showPromotionModal.value = false
  const t = tournament.value

  // If linked league exists, also start its new season before navigating
  if (t?.linkedLeagueId && (t.relegationCount ?? 0) > 0) {
    const linked = linkedLeague.value
    if (linked?.league && linked.winnerId) {
      const relegationCount = t.relegationCount!
      const relegatedIds = t
        .league!.standings.slice(t.league!.standings.length - relegationCount)
        .map((s) => s.teamId)
      const survivingL2Ids = linked.league.standings.slice(relegationCount).map((s) => s.teamId)
      store.newSeason(t.linkedLeagueId, false, undefined, undefined, undefined, undefined, [
        ...survivingL2Ids,
        ...relegatedIds,
      ])
    }
  }

  startNewLeagueSeason(newTeamIds)
}

function handleMultiTierSeasonConfirm() {
  showMultiTierModal.value = false
  const t = tournament.value
  if (!t?.tiers) return
  const tiers = t.tiers
  const n = tiers.length
  const pc = t.promotionCount ?? 1

  // relegated[i] = bottom pc teams of tier i  → move DOWN to tier i+1
  // promoted[i]  = top    pc teams of tier i+1 → move UP   to tier i
  const relegated: string[][] = []
  const promoted: string[][] = []
  for (let i = 0; i < n - 1; i++) {
    const upper = tiers[i].league.standings
    const lower = tiers[i + 1].league.standings
    relegated[i] = upper.slice(upper.length - pc).map((s) => s.teamId)
    promoted[i] = lower.slice(0, pc).map((s) => s.teamId)
  }

  // Build each tier independently — no overwriting
  const newTierTeamIds: string[][] = tiers.map((tier, i) => {
    const leavingUp = i > 0 ? promoted[i - 1] : []
    const leavingDown = i < n - 1 ? relegated[i] : []
    const staying = tier.league.standings
      .filter((s) => !leavingUp.includes(s.teamId) && !leavingDown.includes(s.teamId))
      .map((s) => s.teamId)
    const arrivingFromAbove = i > 0 ? relegated[i - 1] : []
    const arrivingFromBelow = i < n - 1 ? promoted[i] : []
    return [...staying, ...arrivingFromAbove, ...arrivingFromBelow]
  })

  const id = store.newMultiTierSeason(t.id, newTierTeamIds)
  if (id) router.push(`/tournaments/${id}`)
}

type MainTab = "groups" | "bracket" | "league" | "stats" | "participants"

function defaultTab(): MainTab {
  const fmt = tournament.value?.format
  if (fmt === "league") return "league"
  if (fmt === "group+bracket") return "groups"
  return "bracket"
}

const activeTab = ref<MainTab>(defaultTab())
const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
const isLeagueFormat = computed(() => tournament.value?.format === "league")
const isFinished = computed(
  () => !!tournament.value && store.isTournamentFinished(tournament.value.id)
)

watch(
  () => tournament.value?.groupsDone,
  (done) => {
    if (done) activeTab.value = "bracket"
  }
)

watch(
  () => route.params.id,
  () => {
    activeTab.value = defaultTab()
  }
)

const tournamentTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
)

function handleManualSeasonConfirm(orderedIds: string[]) {
  const playoffSeedMode =
    tournament.value?.format === "group+bracket" ? settings.newSeasonPlayoffSeedMode : undefined
  startNewSeason(false, orderedIds, tournament.value?.hasThirdPlace ?? false, playoffSeedMode)
  showSeasonModal.value = false
  showManualSeason.value = false
}

function closeSeasonModal() {
  showSeasonModal.value = false
  showManualSeason.value = false
}

function changeTab(tab: MainTab, tierIdx?: number) {
  activeTab.value = tab
  if (tab === "league" && tierIdx !== undefined) {
    activeTierIdx.value = tierIdx
  }
}
</script>

<template>
  <div class="page">
    <div v-if="!tournament">
      <p class="not-found">
        Tournament not found.
        <RouterLink to="/tournaments">
          <ArrowLeft :size="14" />
          Back
        </RouterLink>
      </p>
    </div>
    <template v-else>
      <div class="t-header">
        <div class="t-header-top">
          <RouterLink to="/tournaments" class="back-link">
            <ArrowLeft :size="14" />
            Tournaments
          </RouterLink>
          <div class="t-header-actions">
            <Transition name="fade">
              <div
                v-if="tournament.winnerId"
                class="winner-chip"
                :style="{ borderColor: winnerTeam?.color, color: winnerTeam?.color }"
              >
                <Trophy :size="12" />
                {{ winnerTeam?.name }}
              </div>
            </Transition>
            <button v-if="isFinished" class="primary new-season-btn" @click="openNewSeason">
              New Season
            </button>
            <button
              v-if="!isFinished"
              class="simulate-all-btn"
              @click="store.simulateTournament(tournament!.id)"
            >
              <Zap :size="13" />
              Simulate All
            </button>
            <button class="settings-btn" @click="showSettingsModal = true">
              <Settings :size="14" />
              Settings
            </button>
          </div>
        </div>
        <h1>
          {{ tournament.name }}
          <span class="t-season">S{{ tournament.season }}</span>
          <span class="t-format-tag">
            {{
              tournament.format === "group+bracket"
                ? "Groups + KO"
                : tournament.format === "league"
                  ? "League"
                  : "Bracket"
            }}
          </span>
        </h1>
        <span class="t-meta">{{ tournament.teamIds.length }} teams · Created {{ dateStr }}</span>
      </div>

      <div class="phase-tabs">
        <!-- League format -->
        <template v-if="isLeagueFormat">
          <!-- Multi-tier: bir tab per tier -->
          <template v-if="isMultiTier">
            <button
              v-for="(tier, ti) in tournament.tiers"
              :key="ti"
              class="phase-tab"
              :class="{ active: activeTab === 'league' && activeTierIdx === ti }"
              @click="changeTab('league', ti)"
            >
              {{ tier.name }}
            </button>
          </template>
          <!-- Single-tier -->
          <template v-else>
            <button
              class="phase-tab"
              :class="{ active: activeTab === 'league' }"
              @click="activeTab = 'league'"
            >
              Table
            </button>
          </template>
        </template>
        <!-- Groups + Bracket format -->
        <template v-else-if="isGroupFormat">
          <button
            class="phase-tab"
            :class="{ active: activeTab === 'groups' }"
            @click="activeTab = 'groups'"
          >
            Groups
          </button>
          <button
            class="phase-tab"
            :class="{ active: activeTab === 'bracket', disabled: !tournament.groupsDone }"
            :disabled="!tournament.groupsDone"
            @click="tournament.groupsDone && (activeTab = 'bracket')"
          >
            Knockout
            <Lock v-if="!tournament.groupsDone" :size="13" class="tab-lock" />
          </button>
        </template>
        <!-- Pure bracket format -->
        <template v-else>
          <button
            class="phase-tab"
            :class="{ active: activeTab === 'bracket' }"
            @click="activeTab = 'bracket'"
          >
            Bracket
          </button>
        </template>
        <button
          class="phase-tab"
          :class="{ active: activeTab === 'stats', disabled: !hasAnyResults }"
          :disabled="!hasAnyResults"
          @click="hasAnyResults && (activeTab = 'stats')"
        >
          Statistics
          <Lock v-if="!hasAnyResults" :size="13" class="tab-lock" />
        </button>
        <button
          class="phase-tab"
          :class="{ active: activeTab === 'participants' }"
          @click="activeTab = 'participants'"
        >
          Participants
        </button>
      </div>

      <Transition name="tab" mode="out-in">
        <div v-if="activeTab === 'league'" key="league" class="section-box">
          <div class="section-body">
            <!-- Multi-tier mode -->
            <template v-if="isMultiTier && tournament.tiers">
              <Transition name="tab" mode="out-in">
                <LeagueView
                  :key="activeTierIdx"
                  :tournament="tournament"
                  :teams="allTeams"
                  :league-override="tournament.tiers[activeTierIdx]?.league"
                  :relegation-count-override="
                    activeTierIdx < tournament.tiers.length - 1
                      ? (tournament.promotionCount ?? 0)
                      : 0
                  "
                  :promotion-count="activeTierIdx > 0 ? (tournament.promotionCount ?? 0) : 0"
                  @set-result="
                    (mdi, mi, h, a) =>
                      store.setTierResult(tournament!.id, activeTierIdx, mdi, mi, h, a)
                  "
                  @sim-match="
                    (mdi, mi) => store.simTierMatch(tournament!.id, activeTierIdx, mdi, mi)
                  "
                  @sim-matchday="(mdi) => store.simTierMatchday(tournament!.id, activeTierIdx, mdi)"
                  @sim-all="store.simAllTier(tournament!.id, activeTierIdx)"
                />
              </Transition>
            </template>
            <!-- Single-tier mode -->
            <template v-else>
              <LeagueView
                :tournament="tournament"
                :teams="allTeams"
                @set-result="
                  (mdi, mi, h, a) => store.setLeagueResult(tournament!.id, mdi, mi, h, a)
                "
                @sim-match="(mdi, mi) => store.simLeagueMatch(tournament!.id, mdi, mi)"
                @sim-matchday="(mdi) => store.simLeagueMatchday(tournament!.id, mdi)"
                @sim-all="store.simAllLeague(tournament!.id)"
              />
            </template>
          </div>
        </div>
        <div v-else-if="activeTab === 'groups'" key="groups" class="section-box">
          <div class="section-body gs-body">
            <GroupStage
              :tournament="tournament"
              :teams="allTeams"
              @set-result="(gi, mi, h, a) => store.setGroupResult(tournament!.id, gi, mi, h, a)"
              @sim-match="(gi, mi) => store.simGroupMatch(tournament!.id, gi, mi)"
              @sim-group="(gi) => store.simGroup(tournament!.id, gi)"
              @sim-group-week="(gi) => store.simGroupWeek(tournament!.id, gi)"
              @sim-week="store.simWeek(tournament!.id)"
              @sim-all="store.simAllGroups(tournament!.id)"
              @advance="store.advanceToBracket(tournament!.id)"
            />
          </div>
        </div>
        <div v-else-if="activeTab === 'bracket'" key="bracket">
          <BracketPanel
            :tournament="tournament"
            :teams="allTeams"
            :title="isGroupFormat ? 'Knockout Stage' : 'Bracket'"
          />
        </div>
        <div v-else-if="activeTab === 'stats'" key="stats" class="section-box">
          <TournamentStats :tournament="tournament" :teams="allTeams" />
        </div>
        <div v-else key="participants" class="section-box">
          <div class="section-body flush">
            <ParticipantsTable :teams="allTeams" :tournament="tournament" />
          </div>
        </div>
      </Transition>
    </template>

    <TournamentSettings
      v-if="showSettingsModal && tournament"
      :tournament="tournament"
      :all-teams="allTeams"
      :has-any-results="hasAnyResults"
      :available-teams="availableTeams"
      :other-leagues="otherLeagues"
      @add-team="addTeam"
      @remove-team="removeTeam"
      @redraw="redrawTournament"
      @change-group-count="changeGroupCount"
      @change-qualifiers-per-group="changeQualifiersPerGroup"
      @change-wildcard-count="changeWildcardCount"
      @toggle-third-place="store.toggleThirdPlace(tournament!.id)"
      @set-playoff-seed-mode="setPlayoffSeedMode"
      @change-leg-mode="changeLegMode"
      @set-league-leg-mode="store.setLeagueLegMode(tournament!.id, $event)"
      @change-relegation-count="store.setRelegationCount(tournament!.id, $event)"
      @change-promotion-count="store.setPromotionCount(tournament!.id, $event)"
      @change-tier-count="store.rebuildTiers(tournament!.id, $event)"
      @set-linked-league="store.setLinkedLeague(tournament!.id, $event)"
      @change-tiebreaker="store.setTiebreaker(tournament!.id, $event)"
      @reset="resetTournament"
      @delete="deleteTournament"
      @close="showSettingsModal = false"
    />

    <PromotionModal
      v-if="showPromotionModal && tournament"
      :tournament-name="tournament.name"
      :season="tournament.season"
      :standings="tournament.league?.standings ?? []"
      :all-teams="allTeams"
      :available-teams="availableTeams"
      :relegation-count="tournament.relegationCount ?? 0"
      :linked-league="
        linkedLeague?.league
          ? { name: linkedLeague.name, standings: linkedLeague.league.standings }
          : undefined
      "
      @confirm="handlePromotionConfirm"
      @cancel="showPromotionModal = false"
    />

    <!-- Multi-tier new season confirmation modal -->
    <AppModal
      v-if="showMultiTierModal && tournament?.tiers"
      :title="`New Season — ${tournament.name}`"
      :width="'min(520px, calc(100vw - 32px))'"
      @close="showMultiTierModal = false"
    >
      <div class="mt-modal-body">
        <div v-for="(tier, ti) in tournament.tiers" :key="ti" class="mt-tier-block">
          <div class="mt-tier-title">{{ tier.name }}</div>
          <div class="mt-tier-rows">
            <div
              v-for="(row, rank) in tier.league.standings"
              :key="row.teamId"
              class="mt-tier-row"
              :class="{
                'mt-row--promoted': ti > 0 && rank < (tournament.promotionCount ?? 0),
                'mt-row--relegated':
                  ti < tournament.tiers!.length - 1 &&
                  rank >= tier.league.standings.length - (tournament.promotionCount ?? 0),
              }"
            >
              <span class="mt-rank">{{ rank + 1 }}</span>
              <span
                class="mt-dot"
                :style="{ background: allTeams.find((t) => t.id === row.teamId)?.color ?? '#888' }"
              />
              <span class="mt-name">
                {{ allTeams.find((t) => t.id === row.teamId)?.name ?? row.teamId }}
              </span>
              <span class="mt-pts">{{ row.pts }} pts</span>
              <span
                v-if="ti > 0 && rank < (tournament.promotionCount ?? 0)"
                class="mt-badge mt-badge--up"
              >
                ↑ Up
              </span>
              <span
                v-else-if="
                  ti < tournament.tiers!.length - 1 &&
                  rank >= tier.league.standings.length - (tournament.promotionCount ?? 0)
                "
                class="mt-badge mt-badge--down"
              >
                ↓ Down
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="primary" @click="handleMultiTierSeasonConfirm">Start New Season →</button>
        <button @click="showMultiTierModal = false">Cancel</button>
      </template>
    </AppModal>

    <AppModal
      v-if="showSeasonModal"
      :title="`New Season — ${tournament?.name}`"
      :width="showManualSeason && isGroupFormat ? 'min(680px, calc(100vw - 32px))' : undefined"
      @close="closeSeasonModal"
    >
      <template v-if="showManualSeason && isGroupFormat">
        <GroupDraw
          :teams="tournamentTeams"
          :group-count="tournament?.groups?.length ?? 2"
          @confirm="handleManualSeasonConfirm"
          @cancel="showManualSeason = false"
        />
      </template>
      <template v-else-if="showManualSeason">
        <ManualDraw
          :teams="tournamentTeams"
          @confirm="handleManualSeasonConfirm"
          @cancel="showManualSeason = false"
        />
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--text-muted);
}

.t-format-tag {
  font-size: 11px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 2px;
  padding: 1px 7px;
  font-family: var(--font-ui);
}
.t-meta {
  font-size: 12px;
  color: var(--text-muted);
}
.t-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.new-season-btn {
  font-size: 12px;
  padding: 3px 10px;
}
.settings-btn {
  font-size: 12px;
  padding: 3px 10px;
  border-color: var(--border-light);
  color: var(--text-muted);
}
.settings-btn:hover {
  color: var(--text);
  border-color: var(--border);
}
.simulate-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 3px 10px;
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.simulate-all-btn:hover {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
  border-color: var(--accent);
}
.winner-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid;
  border-radius: 2px;
  padding: 2px 9px;
  font-size: 12px;
  font-weight: 600;
  background: color-mix(in srgb, currentColor 8%, var(--surface));
  white-space: nowrap;
}
.gs-body {
  padding: 8px 0;
}

.mt-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}
.mt-tier-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mt-tier-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.mt-tier-rows {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.mt-tier-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  background: var(--bg);
  border: 1px solid var(--border-light);
}
.mt-row--promoted {
  border-color: color-mix(in srgb, #22c55e 35%, transparent);
  background: color-mix(in srgb, #22c55e 4%, var(--surface));
}
.mt-row--relegated {
  border-color: color-mix(in srgb, var(--danger) 35%, transparent);
  background: color-mix(in srgb, var(--danger) 4%, var(--surface));
}
.mt-rank {
  width: 18px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.mt-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mt-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mt-pts {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.mt-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  flex-shrink: 0;
}
.mt-badge--up {
  color: #22c55e;
  background: color-mix(in srgb, #22c55e 12%, transparent);
}
.mt-badge--down {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

@media (max-width: 600px) {
  .t-header-top {
    flex-wrap: wrap;
    gap: 6px;
  }
  .t-header-actions {
    flex-wrap: wrap;
  }
}
</style>
