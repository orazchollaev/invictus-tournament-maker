import { defineStore } from "pinia"
import { ref } from "vue"
import type { Player, PlayerPosition } from "./types"
import { DEFAULT_FIRST_NAMES, DEFAULT_LAST_NAMES } from "./constants"
import { uid } from "@/engine"

export const usePlayersStore = defineStore("players", () => {
  const players = ref<Player[]>([])

  // Generate Players' name pool. `null` means "use the defaults" — kept
  // separate from the defaults themselves so "use default" can restore
  // them without losing track of the user's last custom list forever.
  const customFirstNames = ref<string[] | null>(null)
  const customLastNames = ref<string[] | null>(null)

  function effectiveFirstNames(): string[] {
    return customFirstNames.value ?? DEFAULT_FIRST_NAMES
  }

  function effectiveLastNames(): string[] {
    return customLastNames.value ?? DEFAULT_LAST_NAMES
  }

  function setCustomNames(first: string[], last: string[]) {
    customFirstNames.value = first
    customLastNames.value = last
  }

  function resetCustomNames() {
    customFirstNames.value = null
    customLastNames.value = null
  }

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

  /** Bulk-add for "Generate Players" — reuses `add` so ids/power-clamping stay identical. */
  function addMany(
    teamId: string,
    specs: Array<{ name: string; position: PlayerPosition; power: number; number?: number }>
  ) {
    for (const spec of specs) add(teamId, spec.name, spec.position, spec.power, spec.number)
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

  return {
    players,
    add,
    addMany,
    remove,
    removeByTeam,
    update,
    byTeam,
    byId,
    customFirstNames,
    customLastNames,
    effectiveFirstNames,
    effectiveLastNames,
    setCustomNames,
    resetCustomNames,
  }
})
