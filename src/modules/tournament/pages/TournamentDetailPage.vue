<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRoute } from "vue-router"

import Bracket from "@/modules/tournament/components/Bracket.vue"
import FixtureView from "@/modules/tournament/components/FixtureView.vue"
import GroupStage from "@/modules/tournament/components/GroupStage.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TournamentSettings from "@/modules/tournament/components/TournamentSettings.vue"
import TournamentStats from "@/modules/tournament/components/TournamentStats.vue"
import AppModal from "@/components/AppModal.vue"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { Settings, Trophy, Lock, Maximize2, Shuffle, X } from "lucide-vue-next"

const route = useRoute()

const {
  store,
  allTeams,
  tournament,
  winnerTeam,
  dateStr,
  simMatch,
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
} = useTournamentDetail()

const showSeasonModal = ref(false)
const showManualSeason = ref(false)
const showFullBracket = ref(false)
const showSettingsModal = ref(false)

const activeTab = ref<"groups" | "bracket">("groups")
const bracketView = ref<"bracket" | "fixtures">("bracket")
const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
const isFinished = computed(() => store.isTournamentFinished(tournament.value!.id))

watch(
  () => tournament.value?.groupsDone,
  (done) => {
    if (done) activeTab.value = "bracket"
  }
)

watch(
  () => route.params.id,
  () => {
    activeTab.value = "groups"
  }
)

function openFullBracket() {
  showFullBracket.value = true
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onFullBracketKey)
}

function closeFullBracket() {
  showFullBracket.value = false
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onFullBracketKey)
}

function onFullBracketKey(e: KeyboardEvent) {
  if (e.key === "Escape") closeFullBracket()
}

const tournamentTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
)

function handleNewSeason(seeded: boolean) {
  startNewSeason(seeded, undefined, tournament.value?.hasThirdPlace ?? false)
  showSeasonModal.value = false
}

function handleManualSeasonConfirm(orderedIds: string[]) {
  startNewSeason(false, orderedIds, tournament.value?.hasThirdPlace ?? false)
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
        <RouterLink to="/tournaments">← Back</RouterLink>
      </p>
    </div>
    <template v-else>
      <div class="t-header">
        <div class="t-header-top">
          <RouterLink to="/tournaments" class="back">← Tournaments</RouterLink>
          <div class="t-header-actions">
            <button
              v-if="isFinished"
              class="primary new-season-btn"
              @click="showSeasonModal = true"
            >
              New Season
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
            {{ tournament.format === "group+bracket" ? "Groups + KO" : "Bracket" }}
          </span>
        </h1>
        <span class="t-meta">{{ tournament.teamIds.length }} teams · Created {{ dateStr }}</span>
      </div>

      <div
        v-if="tournament.winnerId"
        class="winner-banner"
        :style="{ borderColor: winnerTeam?.color }"
      >
        <Trophy :size="18" />
        <strong>{{ winnerTeam?.name }}</strong>
        wins the tournament!
      </div>

      <template v-if="isGroupFormat">
        <div class="phase-tabs">
          <button
            class="phase-tab"
            :class="{ active: activeTab === 'groups' }"
            @click="activeTab = 'groups'"
          >
            Group Stage
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
        </div>

        <div v-if="activeTab === 'groups'" class="section-box">
          <div class="section-body gs-body">
            <GroupStage
              :tournament="tournament"
              :teams="allTeams"
              @set-result="(gi, mi, h, a) => store.setGroupResult(tournament!.id, gi, mi, h, a)"
              @sim-match="(gi, mi) => store.simGroupMatch(tournament!.id, gi, mi)"
              @sim-group="(gi) => store.simGroup(tournament!.id, gi)"
              @sim-all="store.simAllGroups(tournament!.id)"
              @advance="store.advanceToBracket(tournament!.id)"
            />
          </div>
        </div>

        <div v-if="activeTab === 'bracket'" class="section-box">
          <h2 class="bracket-heading">
            Knockout Stage
            <div class="bracket-heading-right">
              <div class="view-toggle">
                <button
                  class="view-toggle-btn"
                  :class="{ active: bracketView === 'bracket' }"
                  @click="bracketView = 'bracket'"
                >
                  Bracket
                </button>
                <button
                  class="view-toggle-btn"
                  :class="{ active: bracketView === 'fixtures' }"
                  @click="bracketView = 'fixtures'"
                >
                  Fixtures
                </button>
              </div>
              <button class="btn-xs" @click="openFullBracket">
                <Maximize2 :size="13" />
                Full View
              </button>
            </div>
          </h2>
          <div class="section-body bracket-body">
            <div class="flex sim-toolbar">
              <button @click="store.simulateAll(tournament.id)">
                <Shuffle :size="14" />
                Simulate All
              </button>
              <button
                v-for="(round, ri) in tournament.rounds"
                :key="ri"
                @click="store.simulateRound(tournament.id, ri)"
              >
                Sim {{ round.name }}
              </button>
            </div>
            <Bracket
              v-if="bracketView === 'bracket'"
              class="bracket-wrapper"
              :tournament="tournament"
              :teams="allTeams"
              @set-result="
                (ri, mi, h, a, ph, pa) => store.setResult(tournament!.id, ri, mi, h, a, ph, pa)
              "
              @sim-match="(ri, mi) => simMatch(ri, mi)"
              @set-third-place-result="
                (h, a, ph, pa) => store.setThirdPlaceResult(tournament!.id, h, a, ph, pa)
              "
              @sim-third-place="store.simulateThirdPlace(tournament.id)"
            />
            <FixtureView
              v-else
              class="fixture-wrapper"
              :tournament="tournament"
              :teams="allTeams"
              @set-result="
                (ri, mi, h, a, ph, pa) => store.setResult(tournament!.id, ri, mi, h, a, ph, pa)
              "
              @sim-match="(ri, mi) => simMatch(ri, mi)"
              @set-third-place-result="
                (h, a, ph, pa) => store.setThirdPlaceResult(tournament!.id, h, a, ph, pa)
              "
              @sim-third-place="store.simulateThirdPlace(tournament.id)"
            />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="section-box">
          <h2 class="bracket-heading">
            Bracket
            <div class="bracket-heading-right">
              <div class="view-toggle">
                <button
                  class="view-toggle-btn"
                  :class="{ active: bracketView === 'bracket' }"
                  @click="bracketView = 'bracket'"
                >
                  Bracket
                </button>
                <button
                  class="view-toggle-btn"
                  :class="{ active: bracketView === 'fixtures' }"
                  @click="bracketView = 'fixtures'"
                >
                  Fixtures
                </button>
              </div>
              <button class="btn-xs" @click="openFullBracket">
                <Maximize2 :size="13" />
                Full View
              </button>
            </div>
          </h2>
          <div class="section-body bracket-body">
            <div class="flex sim-toolbar">
              <button @click="store.simulateAll(tournament.id)">
                <Shuffle :size="14" />
                Simulate All
              </button>
              <button
                v-for="(round, ri) in tournament.rounds"
                :key="ri"
                @click="store.simulateRound(tournament.id, ri)"
              >
                Sim {{ round.name }}
              </button>
            </div>
            <div v-if="bracketView === 'bracket'" class="bracket-wrapper">
              <Bracket
                :tournament="tournament"
                :teams="allTeams"
                @set-result="
                  (ri, mi, h, a, ph, pa) => store.setResult(tournament!.id, ri, mi, h, a, ph, pa)
                "
                @sim-match="(ri, mi) => simMatch(ri, mi)"
                @set-third-place-result="
                  (h, a, ph, pa) => store.setThirdPlaceResult(tournament!.id, h, a, ph, pa)
                "
                @sim-third-place="store.simulateThirdPlace(tournament.id)"
              />
            </div>
            <FixtureView
              v-else
              class="fixture-wrapper"
              :tournament="tournament"
              :teams="allTeams"
              @set-result="
                (ri, mi, h, a, ph, pa) => store.setResult(tournament!.id, ri, mi, h, a, ph, pa)
              "
              @sim-match="(ri, mi) => simMatch(ri, mi)"
              @set-third-place-result="
                (h, a, ph, pa) => store.setThirdPlaceResult(tournament!.id, h, a, ph, pa)
              "
              @sim-third-place="store.simulateThirdPlace(tournament.id)"
            />
          </div>
        </div>
      </template>

      <div class="section-box">
        <h2>Statistics</h2>
        <TournamentStats :tournament="tournament" :teams="allTeams" />
      </div>

      <div class="section-box">
        <h2>Participants</h2>
        <div class="section-body flush">
          <ParticipantsTable :teams="allTeams" :tournament="tournament" />
        </div>
      </div>
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
      @reset="resetTournament"
      @delete="deleteTournament"
      @close="showSettingsModal = false"
    />

    <div
      v-if="showFullBracket"
      class="modal-backdrop full-bracket-backdrop"
      @click.self="closeFullBracket"
    >
      <div class="full-bracket-modal">
        <div class="full-bracket-header">
          <span>{{ tournament?.name }} — Knockout</span>
          <button class="btn-xs" @click="closeFullBracket">
            <X :size="13" />
            Close
          </button>
        </div>
        <div class="full-bracket-body">
          <Bracket
            :tournament="tournament!"
            :teams="allTeams"
            @set-result="
              (ri, mi, h, a, ph, pa) => store.setResult(tournament!.id, ri, mi, h, a, ph, pa)
            "
            @sim-match="(ri, mi) => simMatch(ri, mi)"
            @set-third-place-result="
              (h, a, ph, pa) => store.setThirdPlaceResult(tournament!.id, h, a, ph, pa)
            "
            @sim-third-place="store.simulateThirdPlace(tournament!.id)"
          />
        </div>
      </div>
    </div>

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
      <template v-else>
        <p class="modal-desc">Choose draw type for Season {{ (tournament?.season ?? 1) + 1 }}</p>
        <div class="modal-actions">
          <button class="primary" @click="handleNewSeason(false)">Random draw</button>
          <button class="primary" @click="handleNewSeason(true)">Seeded</button>
          <button class="primary" @click="showManualSeason = true">Manual</button>
          <button @click="closeSeasonModal">Cancel</button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--text-muted);
}

.bracket-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bracket-body {
  padding: 6px 0;
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

/* Phase tabs */
.phase-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.phase-tab {
  padding: 7px 18px;
  font-size: 13px;
  font-family: var(--font-ui);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin-bottom: -1px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.phase-tab:hover:not(:disabled) {
  color: var(--text);
}
.phase-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
.phase-tab.disabled,
.phase-tab:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.tab-lock {
  font-size: 11px;
}

.gs-body {
  padding: 8px 0;
}

/* Full bracket modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.full-bracket-backdrop {
  z-index: 300;
}
.full-bracket-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  width: 96vw;
  height: 92vh;
}
.full-bracket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg);
  font-family: var(--font);
  font-size: 15px;
  flex-shrink: 0;
}
.full-bracket-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.sim-toolbar {
  padding: 0 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}

.t-header {
  margin-bottom: 16px;
}
.back {
  font-size: 13px;
  color: var(--accent);
}
.t-header h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 6px 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.t-season {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 2px;
  padding: 1px 6px;
  font-family: var(--font-ui);
}
.t-meta {
  font-size: 12px;
  color: var(--text-muted);
}
.winner-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-light);
  border-left: 4px solid var(--team-color, var(--accent-2));
  background: color-mix(in srgb, var(--accent-2) 8%, var(--surface));
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 14px;
  border-radius: var(--radius);
  font-weight: 600;
}

.t-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
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

.bracket-wrapper {
  max-height: 600px;
  padding: 0 10px;
  overflow: auto;
}

.bracket-heading-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.view-toggle-btn {
  padding: 3px 10px;
  font-size: 12px;
  font-family: var(--font-ui);
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  color: var(--text-muted);
  transition:
    background 0.1s,
    color 0.1s;
}
.view-toggle-btn:not(:last-child) {
  border-right: 1px solid var(--border);
}
.view-toggle-btn:hover:not(.active) {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  color: var(--text);
}
.view-toggle-btn.active {
  background: var(--accent);
  color: #fff;
}

.fixture-wrapper {
  padding: 0 8px;
}

@media (max-width: 600px) {
  .t-header h1 {
    font-size: 18px;
  }
  .full-bracket-modal {
    width: 100vw;
    height: 100dvh;
  }
}
</style>
