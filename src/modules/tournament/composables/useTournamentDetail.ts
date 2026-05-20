import { computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { PlayoffSeedMode } from "@/modules/tournament/types"
import { simulateMatch, simulatePenaltyShootout } from "@/engine"

import confetti from "canvas-confetti"

export function useTournamentDetail() {
  const route = useRoute()
  const router = useRouter()
  const teamsStore = useTeamsStore()
  const store = useTournamentStore()

  const allTeams = computed(() => teamsStore.teams)
  const tournament = computed(() => store.getById(route.params.id as string))
  const winnerTeam = computed(() => allTeams.value.find((t) => t.id === tournament.value?.winnerId))

  const dateStr = computed(() => {
    if (!tournament.value) return ""
    return new Date(tournament.value.createdAt).toLocaleDateString()
  })

  function simMatch(ri: number, mi: number) {
    const t = tournament.value
    if (!t) return
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    const result = simulateMatch(match, allTeams.value)
    if (result.home === result.away) {
      const pen = simulatePenaltyShootout(match, allTeams.value)
      store.setResult(t.id, ri, mi, result.home, result.away, pen.penHome, pen.penAway)
    } else {
      store.setResult(t.id, ri, mi, result.home, result.away)
    }
  }

  function deleteTournament() {
    if (!confirm("Delete this tournament?")) return
    store.remove(route.params.id as string)
    router.push("/tournaments")
  }

  function resetTournament() {
    if (!confirm("Reset this tournament?")) return
    store.resetResults(route.params.id as string)
  }

  function startNewSeason(seeded: boolean, orderedIds?: string[]) {
    const id = store.newSeason(route.params.id as string, seeded, orderedIds)
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

  function fireTeamConfetti(color: string) {
    const end = Date.now() + 2000

    const frame = () => {
      // Sol
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: [color, "#ffffff"],
        zIndex: 9999,
      })
      // Sağ
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: [color, "#ffffff"],
        zIndex: 9999,
      })

      if (Date.now() < end) requestAnimationFrame(frame)
    }

    frame()
  }

  watch(
    () => tournament.value?.winnerId,
    (winnerId) => {
      if (!winnerId) return
      const team = allTeams.value.find((t) => t.id === winnerId)
      if (team) fireTeamConfetti(team.color)
    }
  )

  return {
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
  }
}
