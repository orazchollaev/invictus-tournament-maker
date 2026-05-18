import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "@/modules/tournament/types"

export function useCreateTournament() {
  const router = useRouter()
  const teamsStore = useTeamsStore()
  const store = useTournamentStore()

  const newName = ref("")
  const selected = ref<string[]>([])
  const seeded = ref(false)

  const allSelected = computed(
    () => selected.value.length === teamsStore.teams.length && teamsStore.teams.length > 0
  )

  function toggleAll() {
    selected.value = allSelected.value ? [] : teamsStore.teams.map((t) => t.id)
  }

  function createTournament() {
    if (!newName.value.trim() || selected.value.length < 2) return
    const id = store.create(newName.value.trim(), selected.value, seeded.value)
    newName.value = ""
    selected.value = []
    seeded.value = false
    router.push(`/tournaments/${id}`)
  }

  function winnerName(t: Tournament) {
    return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.name ?? "?"
  }

  function winnerColor(t: Tournament) {
    return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.color ?? "#888"
  }

  return {
    router,
    teamsStore,
    store,
    newName,
    selected,
    seeded,
    allSelected,
    toggleAll,
    createTournament,
    winnerName,
    winnerColor,
  }
}
