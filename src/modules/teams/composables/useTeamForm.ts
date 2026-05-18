import { ref } from "vue"
import { useTeamsStore } from "../store"
import type { Team } from "../types"

export function useTeamForm() {
  const store = useTeamsStore()

  const newName = ref("")
  const newColor = ref("#3366cc")
  const newPower = ref(70)

  function addTeam() {
    if (!newName.value.trim()) return
    store.add(newName.value.trim(), newColor.value, newPower.value)
    newName.value = ""
    newPower.value = 70
  }

  const editing = ref<string | null>(null)
  const editName = ref("")
  const editColor = ref("")
  const editPower = ref(70)

  function startEdit(team: Team) {
    editing.value = team.id
    editName.value = team.name
    editColor.value = team.color
    editPower.value = team.power
  }

  function saveEdit(id: string) {
    store.update(id, { name: editName.value, color: editColor.value, power: editPower.value })
    editing.value = null
  }

  return {
    newName,
    newColor,
    newPower,
    addTeam,
    editing,
    editName,
    editColor,
    editPower,
    startEdit,
    saveEdit,
  }
}
