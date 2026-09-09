// Wires the tournament detail page to the spreadsheet export: gathers the
// teams and the player table the page already has, and keeps a flag so the
// button can show that a (potentially slow) export is in flight.
import { ref } from "vue"
import { useTeamsStore } from "@/modules/teams/store"
import { exportTournamentWorkbook } from "../services/excelExport"
import { useTournamentPlayerStats } from "./useTournamentPlayerStats"
import type { Tournament } from "../types"

export function useTournamentExcelExport(getTournament: () => Tournament | undefined) {
  const teamsStore = useTeamsStore()
  const { rows: playerRows } = useTournamentPlayerStats(getTournament)
  const isExporting = ref(false)

  async function exportExcel() {
    const tournament = getTournament()
    if (!tournament || isExporting.value) return

    isExporting.value = true
    try {
      await exportTournamentWorkbook({
        tournament,
        teams: teamsStore.teams,
        players: playerRows.value,
      })
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportExcel }
}
