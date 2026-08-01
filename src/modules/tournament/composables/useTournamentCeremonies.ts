import { ref, computed, type ComputedRef, type Ref } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import {
  buildPlayoffPots,
  computeCrossDrawPlan,
  getLeaguePlayoffData,
  getLeaguePlayoffQualifierIds,
  computeLeaguePlayoffPlan,
} from "@/engine"
import type { CeremonyContext, DrawMode, DrawPlan, Pot } from "@/engine"
import type { PlayoffSeedMode, Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import type { Qualifier } from "../components/draw"

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function useTournamentCeremonies(
  tournament: ComputedRef<Tournament | undefined>,
  allTeams: ComputedRef<Team[]>,
  startNewSeason: (
    seeded: boolean,
    orderedIds?: string[],
    isHaveThirdPlace?: boolean,
    playoffSeedMode?: PlayoffSeedMode,
    overrideTeamIds?: string[]
  ) => void,
  startNewLeagueSeason: (teamIds: string[]) => void,
  isMultiTier: ComputedRef<boolean>,
  activeTierIdx: Ref<number>
) {
  const router = useRouter()
  const store = useTournamentStore()
  const settings = useSettingsStore()
  const { t: trns } = useI18n()

  const showSeasonModal = ref(false)
  const showManualSeason = ref(false)
  const showMultiTierModal = ref(false)
  const showPlayoffManualDraw = ref(false)
  const showLeaguePlayoffManualDraw = ref(false)
  const pendingOverrideTeamIds = ref<string[] | null>(null)

  const showCeremony = ref(false)
  const ceremonyContext = ref<CeremonyContext | null>(null)
  const ceremonyPots = ref<Pot[] | undefined>(undefined)
  const ceremonyFixedPlan = ref<DrawPlan | undefined>(undefined)
  const ceremonyAction = ref<"playoff" | "season" | "leaguePlayoff" | null>(null)
  const ceremonySeasonOpts = ref<{
    thirdPlace: boolean
    playoffSeedMode?: PlayoffSeedMode
  }>()

  const leaguePlayoffData = computed(() =>
    tournament.value ? getLeaguePlayoffData(tournament.value) : undefined
  )
  const showLeaguePlayoffControls = computed(
    () => tournament.value?.format === "league" && (!isMultiTier.value || activeTierIdx.value === 0)
  )
  const canStartLeaguePlayoffFlow = computed(() => {
    const t = tournament.value
    if (!t) return false
    return store.canStartPlayoff(t.id)
  })

  const tournamentTeams = computed(() =>
    allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
  )

  const manualSeasonTeams = computed(() => {
    if (pendingOverrideTeamIds.value) {
      return allTeams.value.filter((t) => pendingOverrideTeamIds.value!.includes(t.id))
    }
    return tournamentTeams.value
  })

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
        return s
          ? [{ teamId: s.teamId, groupName: group.name, pts: s.pts, gd: s.gd, gf: s.gf }]
          : []
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
    return league.standings.slice(0, data.qualifierCount).map((s, i) => {
      const team = allTeams.value.find((tm) => tm.id === s.teamId)
      return {
        teamId: s.teamId,
        label: trns("leaguePlayoff.qualifier", { rank: i + 1 }),
        teamName: team?.name ?? s.teamId,
      }
    })
  })

  async function openNewSeason() {
    const t = tournament.value
    if (!t) return

    // Multi-tier league new season
    if (t.format === "league" && isMultiTier.value) {
      showMultiTierModal.value = true
      return
    }

    // Single-tier league
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
    } else if (ceremonyAction.value === "leaguePlayoff") {
      store.startLeaguePlayoffBracket(t.id, "manual", orderedIds)
    } else if (ceremonyAction.value === "season") {
      const opts = ceremonySeasonOpts.value
      startNewSeason(
        false,
        orderedIds,
        opts?.thirdPlace ?? false,
        opts?.playoffSeedMode,
        orderedIds
      )
    }
    ceremonyAction.value = null
  }

  function handleMultiTierSeasonConfirm() {
    showMultiTierModal.value = false
    const t = tournament.value
    if (!t?.tiers) return
    const tiers = t.tiers
    const n = tiers.length
    const pc = t.promotionCount ?? 1

    const relegated: string[][] = []
    const promoted: string[][] = []
    for (let i = 0; i < n - 1; i++) {
      const upper = tiers[i].league.standings
      const lower = tiers[i + 1].league.standings
      relegated[i] = upper.slice(upper.length - pc).map((s) => s.teamId)
      promoted[i] = lower.slice(0, pc).map((s) => s.teamId)
    }

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

  function onStartLeaguePlayoff() {
    const t = tournament.value
    const data = leaguePlayoffData.value
    if (!t || !data || !canStartLeaguePlayoffFlow.value) return
    if (data.seedMode === "manual") {
      showLeaguePlayoffManualDraw.value = true
      return
    }
    if (settings.drawCeremony) {
      openLeaguePlayoffCeremony(data.seedMode)
      return
    }
    store.startLeaguePlayoffBracket(t.id, data.seedMode)
  }

  function openLeaguePlayoffCeremony(mode: "seeded" | "random") {
    const t = tournament.value
    if (!t) return
    const qIds = getLeaguePlayoffQualifierIds(t)
    // Two pots split by table position (top seeds / rest) — same shape as a
    // seeded bracket draw. Locked & deterministic for "seeded" via the fixed plan.
    const half = Math.ceil(qIds.length / 2)
    ceremonyPots.value = [
      { label: trns("leaguePlayoff.potTop"), teamIds: qIds.slice(0, half) },
      { label: trns("leaguePlayoff.potRest"), teamIds: qIds.slice(half) },
    ]
    ceremonyContext.value = {
      kind: "playoff",
      teams: allTeams.value.filter((tm) => qIds.includes(tm.id)),
      drawMode: mode,
    }
    ceremonyFixedPlan.value = mode === "seeded" ? computeLeaguePlayoffPlan(t) : undefined
    ceremonySeasonOpts.value = undefined
    ceremonyAction.value = "leaguePlayoff"
    showCeremony.value = true
  }

  function handleLeaguePlayoffManualConfirm(orderedIds: string[]) {
    const t = tournament.value
    if (!t) return
    store.startLeaguePlayoffBracket(t.id, "manual", orderedIds)
    showLeaguePlayoffManualDraw.value = false
  }

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

  return {
    showSeasonModal,
    showManualSeason,
    showMultiTierModal,
    showPlayoffManualDraw,
    showLeaguePlayoffManualDraw,
    showCeremony,
    ceremonyContext,
    ceremonyPots,
    ceremonyFixedPlan,
    ceremonyAction,
    showLeaguePlayoffControls,
    canStartLeaguePlayoffFlow,
    leaguePlayoffData,
    manualSeasonTeams,
    groupPlayoffQualifiers,
    leaguePlayoffQualifiers,
    openNewSeason,
    onCeremonyUseOldDraw,
    onCeremonyComplete,
    handleMultiTierSeasonConfirm,
    onStartLeaguePlayoff,
    handleLeaguePlayoffManualConfirm,
    handleManualSeasonConfirm,
    closeSeasonModal,
    handleQuickGroupDraw,
    onAdvance,
    handlePlayoffManualConfirm,
  }
}
