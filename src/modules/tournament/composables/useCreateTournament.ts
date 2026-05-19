// modules/tournament/composables/useCreateTournament.ts
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "@/modules/tournament/types"

export type DrawType = "random" | "seeded" | "manual"

export function useCreateTournament() {
  const router = useRouter()
  const teamsStore = useTeamsStore()
  const store = useTournamentStore()

  const newName = ref("")
  const selected = ref<string[]>([])
  const drawType = ref<DrawType>("random")

  const allSelected = computed(
    () => selected.value.length === teamsStore.teams.length && teamsStore.teams.length > 0
  )

  const selectedTeams = computed(() =>
    teamsStore.teams.filter((t) => selected.value.includes(t.id))
  )

  function toggleAll() {
    selected.value = allSelected.value ? [] : teamsStore.teams.map((t) => t.id)
  }

  function doCreate(orderedIds?: string[], groupCount?: number) {
    if (!newName.value.trim() || selected.value.length < 2) return
    const isSeeded = drawType.value === "seeded"
    const id = store.create(newName.value.trim(), selected.value, isSeeded, orderedIds, groupCount)
    newName.value = ""
    selected.value = []
    drawType.value = "random"
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
    selectedTeams,
    drawType,
    allSelected,
    toggleAll,
    doCreate,
    winnerName,
    winnerColor,
  }
}
