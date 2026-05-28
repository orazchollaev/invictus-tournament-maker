<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRoute } from "vue-router"

import BracketPanel from "@/modules/tournament/components/BracketPanel.vue"
import GroupStage from "@/modules/tournament/components/GroupStage.vue"
import LeagueView from "@/modules/tournament/components/LeagueView.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TournamentSettings from "@/modules/tournament/components/TournamentSettings.vue"
import TournamentStats from "@/modules/tournament/components/TournamentStats.vue"
import AppModal from "@/components/AppModal.vue"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { useSettingsStore } from "@/modules/settings/store"
import { Settings, Trophy, Lock, ArrowLeft, Zap } from "lucide-vue-next"

const route = useRoute()
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
  hasAnyResults,
  availableTeams,
  addTeam,
  removeTeam,
  redrawTournament,
  setPlayoffSeedMode,
  changeGroupCount,
  changeQualifiersPerGroup,
  changeLegMode,
} = useTournamentDetail()

const showSeasonModal = ref(false)
const showManualSeason = ref(false)
const showSettingsModal = ref(false)

function openNewSeason() {
  const isGroup = tournament.value?.format === "group+bracket"
  const drawType = isGroup ? settings.newSeasonGroupDrawType : settings.newSeasonDrawType
  const playoffSeedMode = isGroup ? settings.newSeasonPlayoffSeedMode : undefined
  const thirdPlace = tournament.value?.hasThirdPlace ?? false
  if (drawType === "random") {
    startNewSeason(false, undefined, thirdPlace, playoffSeedMode)
  } else if (drawType === "seeded") {
    startNewSeason(true, undefined, thirdPlace, playoffSeedMode)
  } else {
    showManualSeason.value = true
    showSeasonModal.value = true
  }
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
        <!-- League format: tek sekme -->
        <template v-if="isLeagueFormat">
          <button
            class="phase-tab"
            :class="{ active: activeTab === 'league' }"
            @click="activeTab = 'league'"
          >
            Table
          </button>
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
            <LeagueView
              :tournament="tournament"
              :teams="allTeams"
              @set-result="(mdi, mi, h, a) => store.setLeagueResult(tournament!.id, mdi, mi, h, a)"
              @sim-match="(mdi, mi) => store.simLeagueMatch(tournament!.id, mdi, mi)"
              @sim-matchday="(mdi) => store.simLeagueMatchday(tournament!.id, mdi)"
              @sim-all="store.simAllLeague(tournament!.id)"
            />
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
      @add-team="addTeam"
      @remove-team="removeTeam"
      @redraw="redrawTournament"
      @change-group-count="changeGroupCount"
      @change-qualifiers-per-group="changeQualifiersPerGroup"
      @toggle-third-place="store.toggleThirdPlace(tournament!.id)"
      @set-playoff-seed-mode="setPlayoffSeedMode"
      @change-leg-mode="changeLegMode"
      @set-league-leg-mode="store.setLeagueLegMode(tournament!.id, $event)"
      @reset="resetTournament"
      @delete="deleteTournament"
      @close="showSettingsModal = false"
    />

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
