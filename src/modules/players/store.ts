import { defineStore } from "pinia"
import { ref } from "vue"
import type { Player, PlayerPosition } from "./types"
import { uid } from "@/engine"

export const usePlayersStore = defineStore("players", () => {
  const players = ref<Player[]>([])

  function clampPower(power: number) {
    return Math.min(99, Math.max(1, Math.round(power)))
  }

  /** Shirt numbers are cosmetic — out-of-range or duplicate values just drop. */
  function clampNumber(value: number | undefined): number | undefined {
    if (value === undefined || !Number.isFinite(value)) return undefined
    const n = Math.round(value)
    return n >= 1 && n <= 99 ? n : undefined
  }

  function add(
    teamId: string,
    name: string,
    position: PlayerPosition,
    power: number,
    number?: number
  ) {
    const shirt = clampNumber(number)
    players.value.push({
      id: uid(),
      teamId,
      name,
      position,
      power: clampPower(power),
      ...(shirt !== undefined ? { number: shirt } : {}),
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
    if ("number" in data) data = { ...data, number: clampNumber(data.number) }
    Object.assign(p, data)
    if (p.number === undefined) delete p.number
  }

  function byTeam(teamId: string) {
    return players.value.filter((p) => p.teamId === teamId)
  }

  function byId(id: string | null | undefined) {
    if (!id) return undefined
    return players.value.find((p) => p.id === id)
  }

  return { players, add, remove, removeByTeam, update, byTeam, byId }
})
