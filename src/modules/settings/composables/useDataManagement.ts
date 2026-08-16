import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { showAlert, showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"
import { Capacitor } from "@capacitor/core"
import { idbStorage } from "@/lib/idbStorage"
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

// Short keys used in the exported backup JSON only — storage keys (idb/pinia
// store ids) stay "teams"/"tournament". Shaves bytes off exported files,
// which matters once tournament history gets large.
const EXPORT_KEY_MAP: Record<(typeof DATA_KEYS)[number], string> = {
  teams: "t",
  tournament: "tm",
}
const IMPORT_KEY_MAP: Record<string, (typeof DATA_KEYS)[number]> = {
  t: "teams",
  tm: "tournament",
  // accept older backups exported before keys were shortened
  teams: "teams",
  tournament: "tournament",
}

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
    await idbStorage.setItem("teams", JSON.stringify({ teams: dataset.teams }))
    if (dataset.tournaments)
      await idbStorage.setItem("tournament", JSON.stringify({ tournaments: dataset.tournaments }))
    else await idbStorage.setItem("tournament", JSON.stringify({ tournaments: [], active: null }))
    location.reload()
  }

  async function clearData() {
    const ok = await showConfirm(t("settings.dataManagement.clearAll.confirmMsg"), {
      confirmLabel: t("settings.dataManagement.clearAll.confirmLabel"),
      dangerous: true,
    })
    if (!ok) return
    await Promise.all(DATA_KEYS.map((k) => idbStorage.removeItem(k)))
    location.reload()
  }

  /** Write the JSON backup to cache and hand it to the native OS share sheet. */
  async function shareNative(json: string, filename: string, title: string) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ])
    const written = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title, url: written.uri, dialogTitle: title })
  }

  async function exportData() {
    const payload = {
      [EXPORT_KEY_MAP.teams]: { teams: teamsStore.teams },
      [EXPORT_KEY_MAP.tournament]: {
        tournaments: tournamentStore.tournaments,
        active: tournamentStore.active,
      },
    }
    const json = JSON.stringify(payload)
    const filename = `invictus-v${version}-${new Date().toISOString().slice(0, 10)}.json`

    // Same story as the bracket PNG export: Android's system WebView (what
    // Capacitor apps run in) has no download manager wired to <a download> —
    // it silently no-ops there. Native apps must go through the
    // Share/Filesystem plugins instead, which hand the file to a real OS
    // share sheet.
    if (Capacitor.isNativePlatform()) {
      try {
        await shareNative(json, filename, filename)
      } catch {
        // user cancelled the native share sheet, or the plugin failed —
        // nothing more we can do on-device.
      }
      return
    }

    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
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
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string)
          if (typeof parsed !== "object" || parsed === null) throw new Error()
          const writes = Object.keys(parsed)
            .filter((k) => k in IMPORT_KEY_MAP)
            .map((k) => idbStorage.setItem(IMPORT_KEY_MAP[k], JSON.stringify(parsed[k])))
          if (!writes.length) throw new Error()
          await Promise.all(writes)
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
