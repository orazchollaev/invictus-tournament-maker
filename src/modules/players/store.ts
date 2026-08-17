import { defineStore } from "pinia"
import { ref } from "vue"
import type { Player, PlayerPosition } from "./types"

export const usePlayersStore = defineStore("players", () => {
  const players = ref<Player[]>([])

  function clampPower(power: number) {
    return Math.min(99, Math.max(1, Math.round(power)))
  }

  function add(teamId: string, name: string, position: PlayerPosition, power: number) {
    players.value.push({
      id: Date.now().toString(),
      teamId,
      name,
      position,
      power: clampPower(power),
    })
  }

  function remove(id: string) {
    players.value = players.value.filter((p) => p.id !== id)
  }

  function removeByTeam(teamId: string) {
    players.value = players.value.filter((p) => p.teamId !== teamId)
  }

  function update(id: string, data: Partial<Omit<Player, "id">>) {
    const p = players.value.find((p) => p.id === id)
    if (!p) return
    if (data.power !== undefined) data = { ...data, power: clampPower(data.power) }
    Object.assign(p, data)
  }

  function byTeam(teamId: string) {
    return players.value.filter((p) => p.teamId === teamId)
  }

  return { players, add, remove, removeByTeam, update, byTeam }
})
