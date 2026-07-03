import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { showAlert, showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"
import { version } from "../../../../package.json"

interface Dataset {
  label: string
  description: string
  order?: number
  type: "country" | "club"
  teams: { id: string; name: string; color: string; power: number }[]
  tournaments?: any[]
}

const globbed = import.meta.glob<Dataset>("../../../examples/*.json", {
  eager: true,
  import: "default",
})
export const SAMPLE_DATASETS = Object.values(globbed).sort(
  (a, b) => (a.order ?? 999) - (b.order ?? 999)
)

const DATA_KEYS = ["teams", "tournament"] as const

export function useDataManagement() {
  const { t } = useI18n()
  const teamsStore = useTeamsStore()
  const tournamentStore = useTournamentStore()

  async function loadDataset(dataset: Dataset) {
    const ok = await showConfirm(t("settings.sampleData.loadConfirm", { name: dataset.label }), {
      confirmLabel: t("settings.sampleData.loadLabel"),
      dangerous: true,
    })
    if (!ok) return
    localStorage.setItem("teams", JSON.stringify({ teams: dataset.teams }))
    if (dataset.tournaments)
      localStorage.setItem("tournament", JSON.stringify({ tournaments: dataset.tournaments }))
    else localStorage.setItem("tournament", JSON.stringify({ tournaments: [], active: null }))
    location.reload()
  }

  async function clearData() {
    const ok = await showConfirm(t("settings.dataManagement.clearAll.confirmMsg"), {
      confirmLabel: t("settings.dataManagement.clearAll.confirmLabel"),
      dangerous: true,
    })
    if (!ok) return
    DATA_KEYS.forEach((k) => localStorage.removeItem(k))
    location.reload()
  }

  function exportData() {
    const payload = {
      teams: { teams: teamsStore.teams },
      tournament: { tournaments: tournamentStore.tournaments, active: tournamentStore.active },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `invictus-v${version}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json,application/json"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string)
          if (typeof parsed !== "object" || parsed === null) throw new Error()
          DATA_KEYS.forEach((k) => {
            if (k in parsed) localStorage.setItem(k, JSON.stringify(parsed[k]))
          })
          location.reload()
        } catch {
          showAlert(t("settings.dataManagement.invalidFile"))
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return { loadDataset, clearData, exportData, importData }
}
