import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { usePlayersStore } from "@/modules/players/store"
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

const DATA_KEYS = ["teams", "tournament", "players"] as const

// Short keys used in the exported backup JSON only — storage keys (idb/pinia
// store ids) stay "teams"/"tournament"/"players". Shaves bytes off exported
// files, which matters once tournament history gets large.
const EXPORT_KEY_MAP: Record<(typeof DATA_KEYS)[number], string> = {
  teams: "t",
  tournament: "tm",
  players: "p",
}
const IMPORT_KEY_MAP: Record<string, (typeof DATA_KEYS)[number]> = {
  t: "teams",
  tm: "tournament",
  p: "players",
  // accept older backups exported before keys were shortened
  teams: "teams",
  tournament: "tournament",
  players: "players",
}

// gzip magic bytes — used to tell a compressed backup apart from plain JSON
// on import, no explicit version flag needed.
const GZIP_MAGIC = [0x1f, 0x8b]

function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]
}

async function gzipCompress(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).arrayBuffer()
}

async function gzipDecompress(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes.slice().buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

/** btoa() chokes on large arrays passed via spread — chunk it. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export function useDataManagement() {
  const { t } = useI18n()
  const teamsStore = useTeamsStore()
  const tournamentStore = useTournamentStore()
  const playersStore = usePlayersStore()

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
    // Datasets carry teams, not players — dropping stale players avoids
    // orphaned entries pointing at team ids that no longer exist.
    await idbStorage.removeItem("players")
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

  /** Write the backup to cache and hand it to the native OS share sheet. */
  async function shareNative(base64Data: string, filename: string, title: string) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ])
    // No `encoding` option — that writes the base64 payload as raw binary,
    // same as the bracket PNG export.
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
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
      [EXPORT_KEY_MAP.players]: { players: playersStore.players },
    }
    const json = JSON.stringify(payload)

    // Team crests can now carry base64 images, so a plain JSON export can get
    // big fast — gzip it when the runtime supports it (CompressionStream,
    // widely available since ~2020). importData() sniffs the gzip magic
    // bytes, so both compressed and old plain-JSON backups keep working.
    const canCompress = typeof CompressionStream !== "undefined"
    const buf = canCompress ? await gzipCompress(json) : null
    const filename = `invictus-v${version}-${new Date().toISOString().slice(0, 10)}.json${buf ? ".gz" : ""}`

    // Same story as the bracket PNG export: Android's system WebView (what
    // Capacitor apps run in) has no download manager wired to <a download> —
    // it silently no-ops there. Native apps must go through the
    // Share/Filesystem plugins instead, which hand the file to a real OS
    // share sheet.
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = bytesToBase64(
          new Uint8Array(buf ?? new TextEncoder().encode(json).buffer)
        )
        await shareNative(base64Data, filename, filename)
      } catch {
        // user cancelled the native share sheet, or the plugin failed —
        // nothing more we can do on-device.
      }
      return
    }

    const blob = buf
      ? new Blob([buf], { type: "application/gzip" })
      : new Blob([json], { type: "application/json" })
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
    input.accept = ".json,.gz,application/json,application/gzip"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const bytes = new Uint8Array(e.target?.result as ArrayBuffer)
          let text: string
          if (isGzip(bytes)) {
            if (typeof DecompressionStream === "undefined") throw new Error()
            text = await gzipDecompress(bytes)
          } else {
            text = new TextDecoder().decode(bytes)
          }

          const parsed = JSON.parse(text)
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
      reader.readAsArrayBuffer(file)
    }
    input.click()
  }

  return { loadDataset, clearData, exportData, importData }
}
