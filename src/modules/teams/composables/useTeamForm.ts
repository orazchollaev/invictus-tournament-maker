import { ref } from "vue"
import { useTeamsStore } from "../store"
import type { Team } from "../types"

export function useTeamForm() {
  const store = useTeamsStore()

  const newName = ref("")
  const newAbbr = ref("")
  const newColor = ref("#3366cc")
  const newFlag = ref<string | undefined>(undefined)
  const newPower = ref(70)

  function addTeam() {
    if (!newName.value.trim()) return
    store.add(newName.value.trim(), newColor.value, newPower.value, newAbbr.value, newFlag.value)
    newName.value = ""
    newAbbr.value = ""
    newPower.value = 70
    newFlag.value = undefined
  }

  const editing = ref<string | null>(null)
  const editName = ref("")
  const editAbbr = ref("")
  const editColor = ref("")
  const editFlag = ref<string | undefined>(undefined)
  const editPower = ref(70)

  function startEdit(team: Team) {
    editing.value = team.id
    editName.value = team.name
    editAbbr.value = team.abbr ?? ""
    editColor.value = team.color
    editFlag.value = team.flag
    editPower.value = team.power
  }

  function saveEdit(id: string) {
    store.update(id, {
      name: editName.value,
      abbr: editAbbr.value.trim().slice(0, 7) || undefined,
      color: editColor.value,
      flag: editFlag.value,
      power: editPower.value,
    })
    editing.value = null
  }

  return {
    newName,
    newAbbr,
    newColor,
    newFlag,
    newPower,
    addTeam,
    editing,
    editName,
    editAbbr,
    editColor,
    editFlag,
    editPower,
    startEdit,
    saveEdit,
  }
}
