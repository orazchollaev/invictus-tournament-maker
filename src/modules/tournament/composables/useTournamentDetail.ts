import { computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { PlayoffSeedMode, LegMode } from "@/modules/tournament/types"
import confetti from "canvas-confetti"
import { useSettingsStore } from "@/modules/settings/store"
import { showConfirm } from "@/composables/useDialog"

export function useTournamentDetail() {
  const route = useRoute()
  const router = useRouter()
  const teamsStore = useTeamsStore()
  const store = useTournamentStore()
  const settings = useSettingsStore()

  const allTeams = computed(() => teamsStore.teams)
  const tournament = computed(() => store.getById(route.params.id as string))
  const winnerTeam = computed(() => allTeams.value.find((t) => t.id === tournament.value?.winnerId))

  const dateStr = computed(() => {
    if (!tournament.value) return ""
    return new Date(tournament.value.createdAt).toLocaleDateString()
  })

  async function deleteTournament() {
    if (
      !(await showConfirm("Delete this tournament?", { confirmLabel: "Delete", dangerous: true }))
    )
      return
    store.remove(route.params.id as string)
    router.push("/tournaments")
  }

  async function resetTournament() {
    if (!(await showConfirm("Reset this tournament?", { confirmLabel: "Reset", dangerous: true })))
      return
    store.resetResults(route.params.id as string)
  }

  function startNewSeason(
    seeded: boolean,
    orderedIds?: string[],
    isHaveThirdPlace?: boolean,
    playoffSeedMode?: PlayoffSeedMode
  ) {
    const id = store.newSeason(
      route.params.id as string,
      seeded,
      orderedIds,
      undefined,
      isHaveThirdPlace,
      playoffSeedMode
    )
    if (id) router.push(`/tournaments/${id}`)
  }

  function startNewLeagueSeason(newTeamIds: string[]) {
    const id = store.newSeason(
      route.params.id as string,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      newTeamIds
    )
    if (id) router.push(`/tournaments/${id}`)
  }

  const tournamentId = computed(() => route.params.id as string)

  const hasAnyResults = computed(() => store.hasAnyResults(tournamentId.value))

  const availableTeams = computed(() =>
    teamsStore.teams.filter((t) => !tournament.value?.teamIds.includes(t.id))
  )

  function addTeam(teamId: string) {
    store.addTeamToTournament(tournamentId.value, teamId)
  }

  function removeTeam(teamId: string) {
    store.removeTeamFromTournament(tournamentId.value, teamId)
  }

  function redrawTournament(seeded = false, orderedIds?: string[]) {
    store.redrawTournament(tournamentId.value, seeded, orderedIds)
  }

  function setPlayoffSeedMode(mode: PlayoffSeedMode) {
    store.setPlayoffSeedMode(tournamentId.value, mode)
  }

  function changeGroupCount(count: number) {
    store.changeGroupCount(tournamentId.value, count)
  }

  function changeQualifiersPerGroup(qpg: number) {
    store.changeQualifiersPerGroup(tournamentId.value, qpg)
  }

  function changeWildcardCount(count: number) {
    store.changeWildcardCount(tournamentId.value, count)
  }

  function changeLegMode(stage: "group" | "knockout" | "final", mode: LegMode) {
    store.setLegMode(tournamentId.value, stage, mode)
  }

  function fireTeamConfetti(color: string) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const end = Date.now() + 2500

    const frame = () => {
      // Left
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.6 },
        colors: [color, "#ffffff"],
        zIndex: 9999,
      })
      // Right
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.6 },
        colors: [color, "#ffffff"],
        zIndex: 9999,
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }

  function playWinnerSound() {
    const audio = new Audio("/sfx/winning-sfx.mp3")
    audio.volume = 0.2
    audio.play().catch(() => {})
  }

  watch(
    [() => route.params.id as string, () => tournament.value?.winnerId],
    ([newId, newWinnerId], [oldId, oldWinnerId]) => {
      if (!newWinnerId) return
      if (newId !== oldId) return
      if (newWinnerId === oldWinnerId) return
      const team = allTeams.value.find((t) => t.id === newWinnerId)
      if (team && settings.confettiOnWin) fireTeamConfetti(team.color)
      if (team && settings.soundOnWin) playWinnerSound()
    }
  )

  return {
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
  }
}
