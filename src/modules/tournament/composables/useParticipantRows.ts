import { computed, ref, type Ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "../types"
import { playedMatches } from "@/engine"
import { resultScore } from "../components/participants/formatters"
import { buildFinishContext, buildRow } from "../components/participants/rowBuilders"
import { type ParticipantRow, type SortKey, type TeamStats } from "../components/participants/types"

/** Sorts that read better ascending on first click. */
const ASCENDING_FIRST: SortKey[] = ["name", "group"]

export function useParticipantRows(tournament: Ref<Tournament>, teams: Ref<Team[]>) {
  const sortKey = ref<SortKey>("result")
  const sortAsc = ref(true)

  function toggleSort(key: SortKey) {
    if (sortKey.value === key) sortAsc.value = !sortAsc.value
    else {
      sortKey.value = key
      sortAsc.value = ASCENDING_FIRST.includes(key)
    }
  }

  function sortIcon(key: SortKey): string {
    if (sortKey.value !== key) return "↕"
    return sortAsc.value ? "↑" : "↓"
  }

  const statsByTeam = computed(() => {
    const map = new Map<string, TeamStats>()

    function get(id: string): TeamStats {
      let s = map.get(id)
      if (!s) {
        s = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
        map.set(id, s)
      }
      return s
    }

    for (const entry of playedMatches(tournament.value)) {
      // The third-place match has never counted towards these tallies.
      if (entry.source.kind === "third-place") continue
      const h = get(entry.homeId!)
      const a = get(entry.awayId!)
      const hg = entry.result!.home
      const ag = entry.result!.away

      h.played++
      a.played++
      h.gf += hg
      h.ga += ag
      a.gf += ag
      a.ga += hg

      if (hg > ag) {
        h.wins++
        a.losses++
      } else if (ag > hg) {
        a.wins++
        h.losses++
      } else {
        h.draws++
        a.draws++
      }
    }

    return map
  })

  const rows = computed<ParticipantRow[]>(() => {
    const ctx = buildFinishContext(tournament.value)
    return teams.value
      .filter((t) => tournament.value.teamIds.includes(t.id))
      .map((team) => buildRow(ctx, team, statsByTeam.value.get(team.id)))
  })

  const sortedRows = computed<ParticipantRow[]>(() => {
    const dir = sortAsc.value ? 1 : -1
    return [...rows.value].sort((a, b) => {
      switch (sortKey.value) {
        case "name":
          return dir * a.team.name.localeCompare(b.team.name)
        case "group":
          return dir * (a.groupName ?? "").localeCompare(b.groupName ?? "")
        case "power":
          return dir * (b.team.power - a.team.power)
        case "wins":
          return dir * (b.stats.wins - a.stats.wins)
        case "draws":
          return dir * (b.stats.draws - a.stats.draws)
        case "losses":
          return dir * (b.stats.losses - a.stats.losses)
        case "gf":
          return dir * (b.stats.gf - a.stats.gf)
        case "ga":
          return dir * (a.stats.ga - b.stats.ga)
        case "gd":
          return dir * (b.stats.gf - b.stats.ga - (a.stats.gf - a.stats.ga))
        default:
          return dir * (resultScore(a) - resultScore(b))
      }
    })
  })

  return { sortKey, sortAsc, toggleSort, sortIcon, rows, sortedRows }
}
