<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

import BracketPanel from "@/modules/tournament/components/BracketPanel.vue"
import GroupStage from "@/modules/tournament/components/GroupStage.vue"
import LeagueView from "@/modules/tournament/components/LeagueView.vue"
import WildcardRankings from "@/modules/tournament/components/WildcardRankings.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import PlayoffManualDraw from "@/modules/tournament/components/PlayoffManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TournamentStats from "@/modules/tournament/components/TournamentStats.vue"
import PromotionModal from "@/modules/tournament/components/PromotionModal.vue"
import LeaguePlayInPanel from "@/modules/tournament/components/LeaguePlayInPanel.vue"
import { DrawCeremony } from "@/modules/tournament/components/draw-ceremony"
import {
  buildPlayoffPots,
  computeCrossDrawPlan,
  getLeaguePlayoffData,
  resolveLeaguePlayInWinners,
} from "@/engine"
import type { CeremonyContext, DrawMode, DrawPlan, Pot } from "@/engine"
import type { PlayoffSeedMode } from "@/modules/tournament/types"
import type { Qualifier } from "../components/draw/types"
import AppModal from "@/components/AppModal.vue"
import { DetailHeader, DetailPhaseTabs, DetailMultiTierModal } from "../components/detail"
import type { MainTab } from "../components/detail"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { useSettingsStore } from "@/modules/settings/store"
import { showAlert } from "@/composables/useDialog"

const { t: trns } = useI18n()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()

const {
  store,
  allTeams,
  tournament,
  winnerTeam,
  dateStr,
  startNewSeason,
  startNewLeagueSeason,
  hasAnyResults,
  availableTeams,
} = useTournamentDetail()

const showSeasonModal = ref(false)
const showManualSeason = ref(false)
const showPromotionModal = ref(false)
const showMultiTierModal = ref(false)
const showPlayoffManualDraw = ref(false)
const showLeaguePlayoffManualDraw = ref(false)
const pendingOverrideTeamIds = ref<string[] | null>(null)

const showCeremony = ref(false)
const ceremonyContext = ref<CeremonyContext | null>(null)
const ceremonyPots = ref<Pot[] | undefined>(undefined)
const ceremonyFixedPlan = ref<DrawPlan | undefined>(undefined)
const ceremonyAction = ref<"playoff" | "season" | null>(null)
const ceremonySeasonOpts = ref<{
  thirdPlace: boolean
  playoffSeedMode?: PlayoffSeedMode
}>()

const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)
const activeTierIdx = ref(0)

watch(
  () => tournament.value?.tiers?.length,
  (len) => {
    if (len !== undefined && activeTierIdx.value >= len) activeTierIdx.value = 0
  }
)

const linkedLeague = computed(() => {
  const t = tournament.value
  if (!t?.linkedLeagueId) return undefined
  return store.getById(t.linkedLeagueId)
})

async function openNewSeason() {
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
      await showAlert(
        trns("tournament.linkedLeagueNotFinished", {
          name: linkedLeague.value?.name ?? "Linked league",
        })
      )
      return
    }
    showPromotionModal.value = true
    return
  }

  // League without relegation
  if (t.format === "league") {
    startNewLeagueSeason(t.teamIds)
    return
  }

  // Bracket / group+bracket: go straight to ceremony (team mgmt + old-draw inside)
  const isGroup = t.format === "group+bracket"
  const drawType =
    t.drawType ?? (isGroup ? settings.newSeasonGroupDrawType : settings.newSeasonDrawType)
  const playoffSeedMode = isGroup
    ? (t.playoffSeedMode ?? settings.newSeasonPlayoffSeedMode)
    : undefined
  const thirdPlace = t.hasThirdPlace ?? false

  if ((drawType === "random" || drawType === "seeded") && settings.drawCeremony) {
    openSeasonCeremony(drawType, thirdPlace, playoffSeedMode)
  } else if (drawType === "random") {
    startNewSeason(false, undefined, thirdPlace, playoffSeedMode)
  } else if (drawType === "seeded") {
    startNewSeason(true, undefined, thirdPlace, playoffSeedMode)
  } else {
    pendingOverrideTeamIds.value = null
    showManualSeason.value = true
    showSeasonModal.value = true
  }
}

function openSeasonCeremony(
  drawMode: DrawMode,
  thirdPlace: boolean,
  playoffSeedMode?: PlayoffSeedMode
) {
  const t = tournament.value
  if (!t) return
  ceremonyContext.value = {
    kind: t.format === "group+bracket" ? "group" : "bracket",
    teams: tournamentTeams.value,
    drawMode,
    groupCount: t.format === "group+bracket" ? t.groups?.length : undefined,
  }
  ceremonyPots.value = undefined
  ceremonyFixedPlan.value = undefined
  ceremonySeasonOpts.value = { thirdPlace, playoffSeedMode }
  ceremonyAction.value = "season"
  showCeremony.value = true
}

function onCeremonyUseOldDraw() {
  showCeremony.value = false
  const t = tournament.value
  if (!t) return
  const opts = ceremonySeasonOpts.value
  startNewSeason(false, [...t.teamIds], opts?.thirdPlace ?? false, opts?.playoffSeedMode)
  ceremonyAction.value = null
}

function openPlayoffCeremony() {
  const t = tournament.value
  if (!t) return
  const pots = buildPlayoffPots(t, allTeams.value)
  const qIds = new Set(pots.flatMap((p) => p.teamIds))
  ceremonyContext.value = {
    kind: "playoff",
    teams: allTeams.value.filter((tm) => qIds.has(tm.id)),
    drawMode: "seeded",
  }
  ceremonyPots.value = pots

  // "cross" seed mode → deterministic rotating cross, pots locked (no editing).
  // Falls back to editable pots when the cross order can't be built (e.g. qpg ≠ 2).
  const mode = t.playoffSeedMode ?? settings.newSeasonPlayoffSeedMode
  let fixedPlan: DrawPlan | undefined
  if (mode === "cross") {
    const plan = computeCrossDrawPlan(t, allTeams.value)
    if (plan.orderedIds.length) fixedPlan = plan
  }
  ceremonyFixedPlan.value = fixedPlan

  ceremonySeasonOpts.value = undefined
  ceremonyAction.value = "playoff"
  showCeremony.value = true
}

function onCeremonyComplete(orderedIds: string[]) {
  showCeremony.value = false
  const t = tournament.value
  if (!t) return
  if (ceremonyAction.value === "playoff") {
    store.advanceToBracketManual(t.id, orderedIds)
  } else if (ceremonyAction.value === "season") {
    const opts = ceremonySeasonOpts.value
    startNewSeason(false, orderedIds, opts?.thirdPlace ?? false, opts?.playoffSeedMode, orderedIds)
  }
  ceremonyAction.value = null
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

const VALID_TABS: MainTab[] = ["groups", "bracket", "league", "stats", "participants"]

function defaultTab(): MainTab {
  const fmt = tournament.value?.format
  if (fmt === "league") return "league"
  if (fmt === "group+bracket") return "groups"
  return "bracket"
}

function tabFromQuery(): MainTab {
  const q = route.query.tab as string
  return (VALID_TABS.includes(q as MainTab) ? q : defaultTab()) as MainTab
}

const activeTab = ref<MainTab>(tabFromQuery())
const groupSubTab = ref<"groups" | "wildcards">("groups")
const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
const hasWildcards = computed(
  () => isGroupFormat.value && (tournament.value?.wildcardCount ?? 0) > 0
)
const isLeagueFormat = computed(() => tournament.value?.format === "league")
const isFinished = computed(
  () => !!tournament.value && store.isTournamentFinished(tournament.value.id)
)

const leaguePlayoffData = computed(() =>
  tournament.value ? getLeaguePlayoffData(tournament.value) : undefined
)
const hasLeaguePlayoff = computed(() => !!leaguePlayoffData.value?.started)
const showLeaguePlayoffControls = computed(
  () => isLeagueFormat.value && (!isMultiTier.value || activeTierIdx.value === 0)
)
const canStartLeaguePlayoffFlow = computed(() => {
  const t = tournament.value
  if (!t) return false
  return store.canStartPlayoff(t.id)
})
const leaguePlayInPending = computed(() => {
  const playIn = leaguePlayoffData.value?.playIn
  return !!playIn && playIn.matches.some((m) => m.result === null)
})
const leaguePlayInReady = computed(() => {
  const playIn = leaguePlayoffData.value?.playIn
  return !!playIn && playIn.matches.every((m) => m.result !== null)
})

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const groupPlayoffQualifiers = computed<Qualifier[]>(() => {
  const t = tournament.value
  if (!t?.groups) return []
  const qpg = t.qualifiersPerGroup ?? 2
  const wcCount = t.wildcardCount ?? 0
  const result: Qualifier[] = []
  for (const group of t.groups) {
    for (let rank = 0; rank < qpg; rank++) {
      const standing = group.standings[rank]
      if (!standing) continue
      const team = allTeams.value.find((tm) => tm.id === standing.teamId)
      result.push({
        teamId: standing.teamId,
        label: `${group.name} · ${ordinal(rank + 1)}`,
        teamName: team?.name ?? standing.teamId,
      })
    }
  }
  if (wcCount > 0) {
    const candidates = t.groups.flatMap((group) => {
      const s = group.standings[qpg]
      return s ? [{ teamId: s.teamId, groupName: group.name, pts: s.pts, gd: s.gd, gf: s.gf }] : []
    })
    candidates.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
    for (let i = 0; i < wcCount && i < candidates.length; i++) {
      const team = allTeams.value.find((tm) => tm.id === candidates[i].teamId)
      result.push({
        teamId: candidates[i].teamId,
        label: `${candidates[i].groupName} · ${trns("manualDraw.wildcard")}`,
        teamName: team?.name ?? candidates[i].teamId,
      })
    }
  }
  return result
})

const leaguePlayoffQualifiers = computed<Qualifier[]>(() => {
  const t = tournament.value
  const data = leaguePlayoffData.value
  if (!t || !data) return []
  const league = t.tiers?.length ? t.tiers[0].league : t.league
  if (!league) return []
  const result: Qualifier[] = []
  league.standings.slice(0, data.directCount).forEach((s, i) => {
    const team = allTeams.value.find((tm) => tm.id === s.teamId)
    result.push({
      teamId: s.teamId,
      label: trns("leaguePlayoff.directQualifier", { rank: i + 1 }),
      teamName: team?.name ?? s.teamId,
    })
  })
  if (data.playIn) {
    const winners = resolveLeaguePlayInWinners(data.playIn)
    winners?.forEach((id, i) => {
      const team = allTeams.value.find((tm) => tm.id === id)
      result.push({
        teamId: id,
        label: trns("leaguePlayoff.playInWinner", { pair: i + 1 }),
        teamName: team?.name ?? id,
      })
    })
  }
  return result
})

function startLeaguePlayoffFlow() {
  const t = tournament.value
  const data = leaguePlayoffData.value
  if (!t || !data) return
  if (data.playInTeamCount > 0) {
    store.startLeaguePlayIn(t.id, data.seedMode)
    return
  }
  if (data.seedMode === "manual") {
    showLeaguePlayoffManualDraw.value = true
    return
  }
  store.startLeaguePlayIn(t.id, data.seedMode)
}

function seedLeaguePlayoffFromPlayIn() {
  const t = tournament.value
  const data = leaguePlayoffData.value
  if (!t || !data) return
  if (data.seedMode === "manual") {
    showLeaguePlayoffManualDraw.value = true
    return
  }
  store.startLeaguePlayoffBracket(t.id, data.seedMode)
}

function handleLeaguePlayoffManualConfirm(orderedIds: string[]) {
  const t = tournament.value
  if (!t) return
  store.startLeaguePlayoffBracket(t.id, "manual", orderedIds)
  showLeaguePlayoffManualDraw.value = false
}

function setLeaguePlayInResult(matchIdx: number, home: number, away: number) {
  const t = tournament.value
  if (!t) return
  store.setLeaguePlayInResult(t.id, matchIdx, home, away)
}

watch(
  () => tournament.value?.groupsDone,
  (done) => {
    if (done) changeTab("bracket")
  }
)

watch(
  () => route.params.id,
  () => {
    activeTab.value = tabFromQuery()
    activeTierIdx.value = 0
    groupSubTab.value = "groups"
  }
)

watch(
  () => route.query.tab,
  () => {
    activeTab.value = tabFromQuery()
  }
)

const tournamentTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
)

const manualSeasonTeams = computed(() => {
  if (pendingOverrideTeamIds.value) {
    return allTeams.value.filter((t) => pendingOverrideTeamIds.value!.includes(t.id))
  }
  return tournamentTeams.value
})

function handleManualSeasonConfirm(orderedIds: string[]) {
  const playoffSeedMode =
    tournament.value?.format === "group+bracket" ? settings.newSeasonPlayoffSeedMode : undefined
  startNewSeason(
    false,
    orderedIds,
    tournament.value?.hasThirdPlace ?? false,
    playoffSeedMode,
    pendingOverrideTeamIds.value ?? undefined
  )
  pendingOverrideTeamIds.value = null
  showSeasonModal.value = false
  showManualSeason.value = false
}

function closeSeasonModal() {
  pendingOverrideTeamIds.value = null
  showSeasonModal.value = false
  showManualSeason.value = false
}

function handleQuickGroupDraw(seeded: boolean) {
  const t = tournament.value
  if (!t) return
  const playoffSeedMode = settings.newSeasonPlayoffSeedMode
  startNewSeason(seeded, undefined, t.hasThirdPlace ?? false, playoffSeedMode)
  showSeasonModal.value = false
  showManualSeason.value = false
}

function onAdvance() {
  const t = tournament.value
  if (!t) return
  const mode = t.playoffSeedMode ?? settings.newSeasonPlayoffSeedMode
  if (mode === "manual") {
    showPlayoffManualDraw.value = true
  } else if (settings.drawCeremony) {
    openPlayoffCeremony()
  } else {
    store.advanceToBracket(t.id)
  }
}

function handlePlayoffManualConfirm(orderedIds: string[]) {
  if (!tournament.value) return
  store.advanceToBracketManual(tournament.value.id, orderedIds)
  showPlayoffManualDraw.value = false
}

function changeTab(tab: MainTab, tierIdx?: number) {
  activeTab.value = tab
  if (tab === "league" && tierIdx !== undefined) {
    activeTierIdx.value = tierIdx
  }
  router.replace({ query: { tab } })
}
</script>

<template>
  <div class="page">
    <div v-if="!tournament">
      <p class="not-found">
        {{ trns("tournament.notFound") }}
        <RouterLink to="/tournaments">
          {{ trns("common.back") }}
        </RouterLink>
      </p>
    </div>
    <template v-else>
      <DetailHeader
        :tournament="tournament"
        :winner-team="winnerTeam"
        :date-str="dateStr"
        :is-finished="isFinished"
        @open-new-season="openNewSeason"
        @simulate-all="store.simulateTournament(tournament!.id)"
        @open-settings="router.push(`/tournaments/${tournament!.id}/settings`)"
      />

      <DetailPhaseTabs
        :tournament="tournament"
        :active-tab="activeTab"
        :is-league-format="isLeagueFormat"
        :is-group-format="isGroupFormat"
        :is-multi-tier="isMultiTier"
        :active-tier-idx="activeTierIdx"
        :has-any-results="hasAnyResults"
        :has-league-playoff="hasLeaguePlayoff"
        @change-tab="changeTab"
      />

      <Transition name="tab" mode="out-in">
        <div v-if="activeTab === 'league'" key="league" class="section-box">
          <div class="section-body">
            <template
              v-if="showLeaguePlayoffControls && leaguePlayoffData?.enabled && !hasLeaguePlayoff"
            >
              <LeaguePlayInPanel
                v-if="leaguePlayoffData.playIn"
                :play-in="leaguePlayoffData.playIn"
                :teams="allTeams"
                @set-result="setLeaguePlayInResult"
              />
              <div class="lpc-actions">
                <button
                  v-if="!leaguePlayoffData.playIn"
                  class="primary"
                  :disabled="!canStartLeaguePlayoffFlow"
                  @click="startLeaguePlayoffFlow"
                >
                  {{ trns("leaguePlayoff.startPlayIn") }}
                </button>
                <button
                  v-else-if="leaguePlayInReady"
                  class="primary"
                  @click="seedLeaguePlayoffFromPlayIn"
                >
                  {{ trns("leaguePlayoff.seedBracket") }}
                </button>
                <span v-else-if="leaguePlayInPending" class="lpc-hint">
                  {{ trns("leaguePlayoff.resolvePlayIn") }}
                </span>
              </div>
            </template>
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
          <div v-if="hasWildcards" class="gs-subtab-row">
            <button
              class="gs-subtab"
              :class="{ active: groupSubTab === 'groups' }"
              @click="groupSubTab = 'groups'"
            >
              {{ trns("tournament.tabs.groups") }}
            </button>
            <button
              class="gs-subtab"
              :class="{ active: groupSubTab === 'wildcards' }"
              @click="groupSubTab = 'wildcards'"
            >
              {{ trns("tournament.tabs.wildcards") }}
            </button>
          </div>
          <div class="section-body gs-body">
            <GroupStage
              v-if="!hasWildcards || groupSubTab === 'groups'"
              :tournament="tournament"
              :teams="allTeams"
              @set-result="(gi, mi, h, a) => store.setGroupResult(tournament!.id, gi, mi, h, a)"
              @sim-match="(gi, mi) => store.simGroupMatch(tournament!.id, gi, mi)"
              @sim-group="(gi) => store.simGroup(tournament!.id, gi)"
              @sim-group-week="(gi) => store.simGroupWeek(tournament!.id, gi)"
              @sim-week="store.simWeek(tournament!.id)"
              @sim-all="store.simAllGroups(tournament!.id)"
              @advance="onAdvance"
            />
            <WildcardRankings v-else :tournament="tournament" :teams="allTeams" />
          </div>
        </div>
        <div v-else-if="activeTab === 'bracket'" key="bracket">
          <BracketPanel
            :tournament="tournament"
            :teams="allTeams"
            :title="
              isGroupFormat ? trns('tournament.tabs.bracket') : trns('tournament.tabs.bracket')
            "
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

    <DrawCeremony
      v-if="showCeremony && ceremonyContext"
      :title="trns('drawCeremony.title')"
      :context="ceremonyContext"
      :teams="allTeams"
      :initial-pots="ceremonyPots"
      :fixed-plan="ceremonyFixedPlan"
      :previous-team-ids="ceremonyAction === 'season' ? tournament?.teamIds : undefined"
      :all-available-teams="ceremonyAction === 'season' ? allTeams : undefined"
      @complete="onCeremonyComplete"
      @use-old-draw="onCeremonyUseOldDraw"
      @cancel="showCeremony = false"
    />

    <DetailMultiTierModal
      v-if="showMultiTierModal && tournament?.tiers"
      :tournament="tournament"
      :all-teams="allTeams"
      @confirm="handleMultiTierSeasonConfirm"
      @close="showMultiTierModal = false"
    />

    <AppModal
      v-if="showPlayoffManualDraw && tournament"
      title="Playoff Draw"
      :width="'min(680px, calc(100vw - 32px))'"
      @close="showPlayoffManualDraw = false"
    >
      <PlayoffManualDraw
        :qualifiers="groupPlayoffQualifiers"
        :teams="allTeams"
        @confirm="handlePlayoffManualConfirm"
        @cancel="showPlayoffManualDraw = false"
      />
    </AppModal>

    <AppModal
      v-if="showLeaguePlayoffManualDraw && tournament"
      :title="trns('leaguePlayoff.playoffDrawTitle')"
      :width="'min(680px, calc(100vw - 32px))'"
      @close="showLeaguePlayoffManualDraw = false"
    >
      <PlayoffManualDraw
        :qualifiers="leaguePlayoffQualifiers"
        :teams="allTeams"
        @confirm="handleLeaguePlayoffManualConfirm"
        @cancel="showLeaguePlayoffManualDraw = false"
      />
    </AppModal>

    <AppModal
      v-if="showSeasonModal"
      :title="`New Season — ${tournament?.name}`"
      :width="showManualSeason && isGroupFormat ? 'min(680px, calc(100vw - 32px))' : undefined"
      @close="closeSeasonModal"
    >
      <template v-if="showManualSeason && isGroupFormat">
        <GroupDraw
          :teams="manualSeasonTeams"
          :group-count="tournament?.groups?.length ?? 2"
          @confirm="handleManualSeasonConfirm"
          @cancel="closeSeasonModal"
        />
        <div class="quick-draw-row">
          <span class="quick-draw-label">or:</span>
          <button @click="handleQuickGroupDraw(true)">{{ trns("common.seeded") }}</button>
          <button @click="handleQuickGroupDraw(false)">{{ trns("common.random") }}</button>
        </div>
      </template>
      <template v-else-if="showManualSeason">
        <ManualDraw
          :teams="manualSeasonTeams"
          @confirm="handleManualSeasonConfirm"
          @cancel="closeSeasonModal"
        />
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.lpc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.lpc-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.gs-subtab-row {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--border-light);
}
.gs-subtab {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px 5px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 0;
  margin-bottom: -1px;
}
.gs-subtab:hover {
  color: var(--text);
}
.gs-subtab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.not-found {
  color: var(--text-muted);
}

.gs-body {
  padding: 8px 0;
}

.quick-draw-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0 2px;
  border-top: 1px solid var(--border-light);
  margin-top: 4px;
}
.quick-draw-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 2px;
}

@media (max-width: 640px) {
  .page {
    padding-bottom: 40px;
  }
}
</style>
