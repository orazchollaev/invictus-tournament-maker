import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { usePlayersStore } from "@/modules/players/store"
import { showAlert, showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"
import { Capacitor } from "@capacitor/core"
import { idbStorage } from "@/lib/idbStorage"
import {
  clearAllTournaments,
  replaceAllTournaments,
} from "@/modules/tournament/services/persistence"
import { normalizeTournament } from "@/modules/tournament/services/tournamentSchema"
import type { Tournament } from "@/modules/tournament/types"
import { APP_VERSION } from "@/constants"
import { uid } from "@/engine"
import { useRewardedAd } from "@/composables/useRewardedAd"

interface Dataset {
  label: string
  description: string
  order?: number
  type: "country" | "club"
  teams: { id: string; name: string; color: string; power: number; flag?: string }[]
  /** Optional squads. Player.teamId must match an id in `teams`. */
  players?: {
    id: string
    teamId: string
    name: string
    position: "GK" | "DEF" | "MID" | "FWD"
    power: number
    number?: number
  }[]
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

/**
 * Rewrite every quoted occurrence of an old team id to its new one, inside a
 * dataset's own tournaments. Team ids show up all over a Tournament — group
 * standings, match sides, manager state, per-team adjustment maps — so this
 * goes through the serialized form once instead of chasing each field by
 * hand. Safe here because the map only ever holds a *dataset's own* team ids
 * (see the collision check in loadDataset), so it can't touch an unrelated
 * id that happens to share a value with something else in the tournament.
 */
function remapTeamIds<T>(value: T, idMap: Map<string, string>): T {
  if (!idMap.size) return value
  let json = JSON.stringify(value)
  for (const [oldId, newId] of idMap) {
    json = json.split(`"${oldId}"`).join(`"${newId}"`)
  }
  return JSON.parse(json)
}

export function useDataManagement() {
  const { t } = useI18n()
  const teamsStore = useTeamsStore()
  const tournamentStore = useTournamentStore()
  const playersStore = usePlayersStore()
  const { nextSelectionShowsAd, onSampleDataSelected } = useRewardedAd()

  async function loadDataset(dataset: Dataset) {
    const willShowAd = nextSelectionShowsAd.value
    const confirmMsg = willShowAd
      ? t("settings.sampleData.loadConfirmAd", { name: dataset.label })
      : t("settings.sampleData.loadConfirm", { name: dataset.label })
    const ok = await showConfirm(confirmMsg, {
      confirmLabel: t("settings.sampleData.loadLabel"),
    })
    if (!ok) return

    // Datasets are added on top of whatever is already there, not swapped in
    // — a dataset's own ids are namespaced (e.g. "afc-01") so they normally
    // never collide with what is already loaded, but the same dataset can be
    // picked twice. Any id that does collide gets a fresh one so the new
    // teams, squads and tournaments never overwrite or get merged into the
    // existing ones.
    const idMap = new Map<string, string>()
    const existingIds = new Set(teamsStore.teams.map((t) => t.id))
    const newTeams = dataset.teams.map((team) => {
      if (!existingIds.has(team.id)) return team
      const newId = uid()
      idMap.set(team.id, newId)
      return { ...team, id: newId }
    })
    // Pushed straight into the live stores rather than written to idbStorage
    // and reloaded: teams/players persist themselves on mutation (the pinia
    // plugin in main.ts), and the tournament store has its own per-item
    // watcher (see modules/tournament/store/index.ts) — so this is visible
    // and saved immediately, no reload needed.
    teamsStore.teams.push(...newTeams)

    const newPlayers = (dataset.players ?? []).map((p) => ({
      ...p,
      teamId: idMap.get(p.teamId) ?? p.teamId,
    }))
    playersStore.players.push(...newPlayers)

    // Normalized like an import: a sample file is checked into the repo and
    // can fall behind the shape the app reads, and a bundled dataset that
    // breaks the launch is worse than one that loads a tournament short.
    const newTournaments = (Array.isArray(dataset.tournaments) ? dataset.tournaments : [])
      .map((entry: unknown) => normalizeTournament(entry))
      .filter((t: Tournament | null): t is Tournament => t !== null)
      .map((t) => remapTeamIds(t, idMap))
    tournamentStore.tournaments.push(...newTournaments)

    // Every 2nd dataset picked shows a rewarded ad — best effort.
    void onSampleDataSelected()
  }

  async function clearData() {
    const ok = await showConfirm(t("settings.dataManagement.clearAll.confirmMsg"), {
      confirmLabel: t("settings.dataManagement.clearAll.confirmLabel"),
      dangerous: true,
    })
    if (!ok) return
    await Promise.all(DATA_KEYS.map((k) => idbStorage.removeItem(k)))
    // The legacy "tournament" key above no longer holds the tournaments
    // themselves (see modules/tournament/persistence.ts) — those live in
    // their own per-id records, which need clearing separately or they
    // all come back on the next launch.
    await clearAllTournaments()
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
    const filename = `invictus-v${APP_VERSION}-${new Date().toISOString().slice(0, 10)}.json${buf ? ".gz" : ""}`

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
    // Revoking on the same tick can abort a download that has not actually
    // started yet — the click only queues one. A turn of the event loop is
    // enough for every browser to have taken its own reference.
    setTimeout(() => URL.revokeObjectURL(url), 0)
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
          let droppedTournaments = 0
          const importedKeys = Object.keys(parsed)
            .filter((k) => k in IMPORT_KEY_MAP)
            .map((k) => IMPORT_KEY_MAP[k])
          const writes = Object.keys(parsed)
            .filter((k) => k in IMPORT_KEY_MAP && IMPORT_KEY_MAP[k] !== "tournament")
            .map((k) => idbStorage.setItem(IMPORT_KEY_MAP[k], JSON.stringify(parsed[k])))
          // `tournaments` lives one-per-record now (see
          // modules/tournament/persistence.ts), not in the exported blob's
          // shape — importing it the same way loadDataset() writes a fresh
          // dataset in, or the previous data's tournaments survive in the
          // index and come back alongside the imported ones.
          const tournamentKey = Object.keys(parsed).find((k) => IMPORT_KEY_MAP[k] === "tournament")
          if (tournamentKey) {
            const imported = parsed[tournamentKey] ?? {}
            // Checked rather than cast. A backup can be hand-edited, can come
            // from an older build, or can simply not hold an array here — and a
            // cast let all three through to be written verbatim and silently
            // dropped on the next launch. Normalizing repairs what can be
            // repaired and counts what cannot, so the user is told.
            const raw = Array.isArray(imported.tournaments) ? imported.tournaments : []
            const tournaments = raw
              .map((entry: unknown) => normalizeTournament(entry))
              .filter((t: Tournament | null): t is Tournament => t !== null)
            droppedTournaments = raw.length - tournaments.length
            writes.push(replaceAllTournaments(tournaments))
            // An active id pointing at a tournament that did not survive leaves
            // the app opening on nothing.
            const active =
              typeof imported.active === "string" &&
              tournaments.some((t: Tournament) => t.id === imported.active)
                ? imported.active
                : null
            writes.push(idbStorage.setItem("tournament", JSON.stringify({ active })))
          }
          if (!writes.length) throw new Error()
          // A section the backup does not carry is a section that has to go,
          // not one that survives: leaving the old teams behind would orphan
          // them against imported tournaments that never name them, and
          // leaving the old squad behind would orphan it against team ids that
          // no longer exist. Same rule loadDataset() already follows.
          if (!importedKeys.includes("players")) writes.push(idbStorage.removeItem("players"))
          if (!importedKeys.includes("teams")) writes.push(idbStorage.removeItem("teams"))
          await Promise.all(writes)
          // Said before the reload, because after it there is nothing left to
          // explain why a tournament is missing.
          if (droppedTournaments > 0) {
            await showAlert(
              t("settings.dataManagement.partialImport", { count: droppedTournaments })
            )
          }
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
