import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { Player, PlayerPosition } from "./types"
import { DEFAULT_FIRST_NAMES, DEFAULT_LAST_NAMES } from "./constants"
import { uid } from "@/engine"
import type { FaceConfig } from "@/lib/faces"

export const usePlayersStore = defineStore("players", () => {
  const players = ref<Player[]>([])

  // Generate Players' name pool. `null` means "use the defaults" — kept
  // separate from the defaults themselves so "use default" can restore
  // them without losing track of the user's last custom list forever.
  const customFirstNames = ref<string[] | null>(null)
  const customLastNames = ref<string[] | null>(null)
  // Set only when the matching list came from an uploaded .txt file, so
  // reopening Generate Players can show the file summary again instead of
  // dumping every name — possibly tens of thousands of them — into the
  // textarea.
  const customFirstNamesFile = ref<string | null>(null)
  const customLastNamesFile = ref<string | null>(null)

  function effectiveFirstNames(): string[] {
    return customFirstNames.value ?? DEFAULT_FIRST_NAMES
  }

  function effectiveLastNames(): string[] {
    return customLastNames.value ?? DEFAULT_LAST_NAMES
  }

  function setCustomNames(
    first: string[],
    last: string[],
    firstFile: string | null = null,
    lastFile: string | null = null
  ) {
    customFirstNames.value = first
    customLastNames.value = last
    customFirstNamesFile.value = firstFile
    customLastNamesFile.value = lastFile
  }

  function resetCustomNames() {
    customFirstNames.value = null
    customLastNames.value = null
    customFirstNamesFile.value = null
    customLastNamesFile.value = null
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

  /**
   * Players added without a face get a random one as soon as facesjs has
   * loaded. It is a large library and this store is needed at launch, so it
   * is not imported until a face is actually wanted; one load serves a whole
   * batch, so "Generate Players" pays for it once.
   */
  const faceless = new Set<string>()
  let faceFill: Promise<void> | null = null

  function queueRandomFace(id: string) {
    faceless.add(id)
    faceFill ??= import("@/lib/faces").then(({ randomFace }) => {
      faceFill = null
      for (const p of players.value) {
        if (faceless.has(p.id) && !p.face) p.face = randomFace()
      }
      faceless.clear()
    })
  }

  function add(
    teamId: string,
    name: string,
    position: PlayerPosition,
    power: number,
    number?: number,
    image?: string,
    face?: FaceConfig
  ) {
    const shirt = clampNumber(number)
    const id = uid()
    players.value.push({
      id,
      teamId,
      name,
      position,
      power: clampPower(power),
      ...(shirt !== undefined ? { number: shirt } : {}),
      ...(image ? { image } : {}),
      ...(face ? { face } : {}),
    })
    if (!face) queueRandomFace(id)
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

  function removeAll() {
    players.value = []
  }

  function update(id: string, data: Partial<Omit<Player, "id">>) {
    const p = players.value.find((p) => p.id === id)
    if (!p) return
    if (data.power !== undefined) data = { ...data, power: clampPower(data.power) }
    if ("number" in data) data = { ...data, number: clampNumber(data.number) }
    Object.assign(p, data)
    if (p.number === undefined) delete p.number
    if (!p.image) delete p.image
    if (!p.face) delete p.face
  }

  /**
   * Built once per change to the roster. `byId` is called per line of every
   * match report a stats table walks, so a linear search there made a
   * 60-team league's player rankings scan the whole roster thousands of times.
   */
  const index = computed(() => {
    const ids = new Map<string, Player>()
    const teams = new Map<string, Player[]>()
    for (const p of players.value) {
      if (!ids.has(p.id)) ids.set(p.id, p) // first wins, as `find` did
      const squad = teams.get(p.teamId)
      if (squad) squad.push(p)
      else teams.set(p.teamId, [p])
    }
    return { ids, teams }
  })

  function byTeam(teamId: string) {
    // A copy: callers sort and filter what they get back.
    return index.value.teams.get(teamId)?.slice() ?? []
  }

  function byId(id: string | null | undefined) {
    if (!id) return undefined
    return index.value.ids.get(id)
  }

  return {
    players,
    add,
    addMany,
    remove,
    removeByTeam,
    removeAll,
    update,
    byTeam,
    byId,
    customFirstNames,
    customLastNames,
    customFirstNamesFile,
    customLastNamesFile,
    effectiveFirstNames,
    effectiveLastNames,
    setCustomNames,
    resetCustomNames,
  }
})
