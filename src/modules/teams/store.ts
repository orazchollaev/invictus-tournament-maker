import { defineStore } from "pinia"
import { ref } from "vue"
import type { Team } from "./types"
import { useTournamentStore } from "@/modules/tournament/store"
import { MAX_TEAMS } from "@/constants"
import { showAlert } from "@/composables/useDialog"

const COLORS = [
  "#e63946",
  "#457b9d",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#264653",
  "#6a4c93",
  "#1982c4",
  "#8ac926",
  "#ff595e",
]

export const useTeamsStore = defineStore("teams", () => {
  const { tournaments } = useTournamentStore()

  const teams = ref<Team[]>([
    { id: "1", name: "Team 1", color: "#e63946", power: 82 },
    { id: "2", name: "Team 2", color: "#457b9d", power: 80 },
    { id: "3", name: "Team 3", color: "#2a9d8f", power: 75 },
    { id: "4", name: "Team 4", color: "#e9c46a", power: 72 },
  ])

  function clampPower(power: number) {
    return Math.min(99, Math.max(1, Math.round(power)))
  }

  function add(name: string, color: string, power: number, abbr?: string) {
    if (teams.value.length >= MAX_TEAMS) return
    const entry: import("./types").Team = {
      id: Date.now().toString(),
      name,
      color,
      power: clampPower(power),
    }
    if (abbr?.trim()) entry.abbr = abbr.trim().slice(0, 7)
    teams.value.push(entry)
  }

  function remove(id: string) {
    if (isTeamInTournament(id)) {
      showAlert("This team cannot be deleted because it is used in a tournament")
      return
    }

    teams.value = teams.value.filter((t) => t.id !== id)
  }

  function update(id: string, data: Partial<Omit<Team, "id">>) {
    const t = teams.value.find((t) => t.id === id)
    if (!t) return
    if (data.power !== undefined) data = { ...data, power: clampPower(data.power) }
    Object.assign(t, data)
  }

  function isTeamInTournament(id: string) {
    return tournaments.some((t) => t.teamIds.find((tmId) => tmId == id))
  }

  return { teams, add, remove, update, COLORS }
})
