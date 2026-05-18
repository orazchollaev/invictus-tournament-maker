import { computed, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { simulateMatch } from "@/engine/logic"

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
    store.setResult(t.id, ri, mi, result.home, result.away)
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
      })
      // Sağ
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: [color, "#ffffff"],
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
  }
}
