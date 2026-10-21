import { defineStore } from "pinia"
import { computed, ref } from "vue"
import type { Coach, Team } from "./types"
import type { CrestSpec } from "@/engine/crest/types"
import { useTournamentStore } from "@/modules/tournament/store"
import { usePlayersStore } from "@/modules/players/store"
import { showAlert } from "@/composables/useDialog"
import { i18n } from "@/i18n"
import { uid } from "@/engine"

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
  const playersStore = usePlayersStore()

  const teams = ref<Team[]>([])
  /** Keys created in the form but not yet carried by any team — kept so they stay pickable. */
  const savedCategoryKeys = ref<string[]>([])

  function clampPower(power: number) {
    return Math.min(99, Math.max(1, Math.round(power)))
  }

  function add(
    name: string,
    color: string,
    power: number,
    abbr?: string,
    flag?: string,
    image?: string,
    crest?: CrestSpec,
    categories?: Record<string, string>
  ) {
    const entry: import("./types").Team = {
      id: uid(),
      name,
      color,
      power: clampPower(power),
    }
    if (abbr?.trim()) entry.abbr = abbr.trim().slice(0, 7)
    if (flag) entry.flag = flag
    if (image) entry.image = image
    if (image && crest) entry.crest = crest
    if (categories && Object.keys(categories).length) entry.categories = { ...categories }
    teams.value.push(entry)
  }

  function remove(id: string) {
    if (isTeamInTournament(id)) {
      showAlert(i18n.global.t("teams.deleteInUse"))
      return
    }

    teams.value = teams.value.filter((t) => t.id !== id)
    playersStore.removeByTeam(id)
  }

  function update(id: string, data: Partial<Omit<Team, "id">>) {
    const t = teams.value.find((t) => t.id === id)
    if (!t) return
    if (data.power !== undefined) data = { ...data, power: clampPower(data.power) }
    Object.assign(t, data)
    if (t.categories && !Object.keys(t.categories).length) delete t.categories
  }

  /** Appoint or sack one manager. `undefined` leaves the club without one. */
  function setCoach(id: string, coach: Coach | undefined) {
    const team = teams.value.find((t) => t.id === id)
    if (!team) return
    if (coach) team.coach = { ...coach, power: clampPower(coach.power) }
    else delete team.coach
  }

  /** A whole generation run at once — mirrors players' `addMany`. */
  function setCoaches(specs: Array<Coach & { teamId: string }>) {
    for (const { teamId, ...coach } of specs) setCoach(teamId, coach)
  }

  function isTeamInTournament(id: string) {
    return tournaments.some((t) => t.teamIds.find((tmId) => tmId == id))
  }

  /** Every category key in use, in first-seen order. */
  const categoryKeys = computed(() => {
    const keys = new Set<string>()
    for (const t of teams.value) for (const k of Object.keys(t.categories ?? {})) keys.add(k)
    return [...keys]
  })

  /** Keys offered by the team form: those in use plus ones created but not yet used. */
  const knownCategoryKeys = computed(() => [
    ...new Set([...categoryKeys.value, ...savedCategoryKeys.value]),
  ])

  function addCategoryKey(key: string) {
    if (!savedCategoryKeys.value.includes(key)) savedCategoryKeys.value.push(key)
  }

  function categoryValues(key: string) {
    const values = new Set<string>()
    for (const t of teams.value) {
      const v = t.categories?.[key]
      if (v) values.add(v)
    }
    return [...values].sort((a, b) => a.localeCompare(b))
  }

  return {
    teams,
    savedCategoryKeys,
    add,
    remove,
    update,
    setCoach,
    setCoaches,
    categoryKeys,
    knownCategoryKeys,
    addCategoryKey,
    categoryValues,
    COLORS,
  }
})
