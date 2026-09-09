// modules/tournament/services/excelExport.ts
//
// A tournament as a spreadsheet: the tables the app draws, in a file the user
// can sort, pivot and hand to someone else.
//
// Sheet headers are written in English rather than the active locale, the same
// choice the simulation CSV export already made — a spreadsheet tends to
// outlive the session that produced it and gets opened by people who never saw
// the app, so a stable column name is worth more than a translated one. Every
// piece of *content* (team names, group names, round names) is the user's own
// data and comes through as-is.
//
// exceljs is loaded on demand: it is by far the heaviest dependency in the
// project and nothing outside this file touches it.
import type { Column, Workbook, Worksheet } from "exceljs"
import type { Team } from "@/modules/teams/types"
import { allMatches, isBye, redsOf, type MatchEntry } from "@/engine"
import { saveFile } from "@/lib/fileShare"
import type { Group, GroupStanding, Tournament } from "../types"

/** One player's totals across the tournament, as the stats panel computes them. */
export interface ExcelPlayerRow {
  playerId: string
  name: string
  teamId: string
  position: string
  apps: number
  goals: number
  assists: number
  yellow: number
  red: number
  cleanSheets: number
  saves: number
  conceded: number
  rating: number
}

export interface ExcelExportInput {
  tournament: Tournament
  teams: Team[]
  /** Empty when the tournament has no generated match reports yet. */
  players: ExcelPlayerRow[]
}

type ColumnSpec = Partial<Column> & { header: string; key: string }

const FORMAT_LABEL: Record<string, string> = {
  bracket: "Knockout",
  "group+bracket": "Groups + Knockout",
  league: "League",
  swiss: "Swiss",
}

/** A sheet name Excel will accept: 31 chars, none of `[]:*?/\`. */
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet"
}

function header(sheet: Worksheet, columns: ColumnSpec[]) {
  sheet.columns = columns
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
}

function stageOf(entry: MatchEntry): string {
  const source = entry.source
  switch (source.kind) {
    case "group":
      return source.groupName
    case "league":
      return source.tierName ? `${source.tierName} — ${source.matchdayName}` : source.matchdayName
    case "knockout":
      return source.roundName
    case "third-place":
      return "Third place"
  }
}

/** The leg number, or blank for a one-off fixture. */
function legOf(entry: MatchEntry): number | "" {
  if (!entry.isDoubleLeg) return ""
  return "leg" in entry.source ? entry.source.leg : 1
}

function buildOverview(book: Workbook, input: ExcelExportInput, nameOf: (id: string) => string) {
  const { tournament: t } = input
  const sheet = book.addWorksheet("Overview")
  header(sheet, [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 42 },
  ])

  const played = allMatches(t).filter((e) => e.result && !isBye(e)).length
  const rows: [string, string | number][] = [
    ["Tournament", t.name],
    ["Season", t.season],
    ["Format", FORMAT_LABEL[t.format] ?? t.format],
    ["Teams", t.teamIds.length],
    ["Matches played", played],
    ["Winner", t.winnerId ? nameOf(t.winnerId) : "—"],
    ["Exported", new Date().toISOString().slice(0, 16).replace("T", " ")],
  ]
  for (const [field, value] of rows) sheet.addRow({ field, value })
}

const STANDING_COLUMNS: ColumnSpec[] = [
  { header: "Table", key: "table", width: 18 },
  { header: "#", key: "rank", width: 5 },
  { header: "Team", key: "team", width: 24 },
  { header: "P", key: "played", width: 5 },
  { header: "W", key: "won", width: 5 },
  { header: "D", key: "drawn", width: 5 },
  { header: "L", key: "lost", width: 5 },
  { header: "GF", key: "gf", width: 6 },
  { header: "GA", key: "ga", width: 6 },
  { header: "GD", key: "gd", width: 6 },
  { header: "Pts", key: "pts", width: 6 },
]

function addStandings(
  sheet: Worksheet,
  table: string,
  standings: GroupStanding[],
  nameOf: (id: string) => string
) {
  standings.forEach((row, index) => {
    sheet.addRow({
      table,
      rank: index + 1,
      team: nameOf(row.teamId),
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      gf: row.gf,
      ga: row.ga,
      gd: row.gd,
      pts: row.pts,
    })
  })
}

/**
 * Every table the tournament has, stacked into one sheet with a `Table`
 * column. A pure knockout has none, and gets no sheet at all.
 */
function buildStandings(book: Workbook, input: ExcelExportInput, nameOf: (id: string) => string) {
  const t = input.tournament
  const tables: { name: string; standings: GroupStanding[] }[] = []

  t.groups?.forEach((group: Group) => tables.push({ name: group.name, standings: group.standings }))
  if (t.league) tables.push({ name: "League", standings: t.league.standings })
  t.tiers?.forEach((tier) => tables.push({ name: tier.name, standings: tier.league.standings }))

  if (!tables.length) return

  const sheet = book.addWorksheet("Standings")
  header(sheet, STANDING_COLUMNS)
  for (const table of tables) addStandings(sheet, table.name, table.standings, nameOf)
}

function buildFixtures(book: Workbook, input: ExcelExportInput, nameOf: (id: string) => string) {
  const sheet = book.addWorksheet("Fixtures")
  header(sheet, [
    { header: "Stage", key: "stage", width: 26 },
    { header: "Leg", key: "leg", width: 5 },
    { header: "Home", key: "home", width: 24 },
    { header: "Away", key: "away", width: 24 },
    { header: "HG", key: "hg", width: 5 },
    { header: "AG", key: "ag", width: 5 },
    { header: "AET", key: "aet", width: 6 },
    { header: "Pens", key: "pens", width: 9 },
    { header: "Red cards", key: "reds", width: 11 },
  ])

  for (const entry of allMatches(input.tournament)) {
    if (isBye(entry)) continue
    const result = entry.result
    const pens =
      result?.penHome !== undefined && result.penAway !== undefined
        ? `${result.penHome}-${result.penAway}`
        : ""
    const reds = redsOf(result)

    sheet.addRow({
      stage: stageOf(entry),
      leg: legOf(entry),
      home: nameOf(entry.homeId as string),
      away: nameOf(entry.awayId as string),
      hg: result ? result.home : "",
      ag: result ? result.away : "",
      aet: result?.ft ? "yes" : "",
      pens,
      reds: reds.length
        ? reds.map((r) => `${r.side === "home" ? "H" : "A"} ${r.minute}'`).join(", ")
        : "",
    })
  }
}

function buildTeams(book: Workbook, input: ExcelExportInput, nameOf: (id: string) => string) {
  const sheet = book.addWorksheet("Teams")
  header(sheet, [
    { header: "Team", key: "team", width: 24 },
    { header: "Abbr", key: "abbr", width: 8 },
    { header: "Power", key: "power", width: 8 },
    { header: "Country", key: "country", width: 9 },
  ])

  const byId = new Map(input.teams.map((team) => [team.id, team]))
  for (const id of input.tournament.teamIds) {
    const team = byId.get(id)
    sheet.addRow({
      team: nameOf(id),
      abbr: team?.abbr ?? "",
      power: team?.power ?? "",
      country: team?.flag?.toUpperCase() ?? "",
    })
  }
}

function buildPlayers(book: Workbook, input: ExcelExportInput, nameOf: (id: string) => string) {
  if (!input.players.length) return

  const sheet = book.addWorksheet("Players")
  header(sheet, [
    { header: "Player", key: "player", width: 24 },
    { header: "Team", key: "team", width: 24 },
    { header: "Pos", key: "position", width: 6 },
    { header: "Apps", key: "apps", width: 6 },
    { header: "Goals", key: "goals", width: 7 },
    { header: "Assists", key: "assists", width: 8 },
    { header: "Yellow", key: "yellow", width: 8 },
    { header: "Red", key: "red", width: 6 },
    { header: "Clean sheets", key: "cleanSheets", width: 13 },
    { header: "Saves", key: "saves", width: 7 },
    { header: "Conceded", key: "conceded", width: 10 },
    { header: "Rating", key: "rating", width: 8 },
  ])

  for (const row of input.players) {
    sheet.addRow({
      player: row.name,
      team: nameOf(row.teamId),
      position: row.position,
      apps: row.apps,
      goals: row.goals,
      assists: row.assists,
      yellow: row.yellow,
      red: row.red,
      cleanSheets: row.cleanSheets,
      saves: row.saves,
      conceded: row.conceded,
      rating: row.rating,
    })
  }
}

/** A filename that survives every filesystem the app can write to. */
export function workbookFilename(t: Tournament): string {
  const stem = `${t.name}-${t.season}`.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")
  return `${stem || "tournament"}.xlsx`
}

/**
 * exceljs ships two builds and they do not agree on their shape: the browser
 * bundle Vite picks for the app exports a single default namespace, while the
 * CommonJS entry Node resolves (tests, SSR) exposes the classes as named
 * exports. The typings only describe the second, so the first has to be
 * reached for explicitly — without this the app would build clean and then
 * hand back `undefined` for the constructor at runtime.
 */
type ExcelJsModule = {
  Workbook?: new () => Workbook
  default?: { Workbook: new () => Workbook }
}

async function loadWorkbookCtor(): Promise<new () => Workbook> {
  const mod = (await import("exceljs")) as unknown as ExcelJsModule
  const ctor = mod.Workbook ?? mod.default?.Workbook
  if (!ctor) throw new Error("exceljs: no Workbook constructor on the loaded build")
  return ctor
}

/** Build the workbook. Exported on its own so tests never touch the file system. */
export async function buildWorkbook(input: ExcelExportInput): Promise<Workbook> {
  const WorkbookCtor = await loadWorkbookCtor()
  const book = new WorkbookCtor()
  book.creator = "Invictus Tournament Maker"
  book.created = new Date()

  const byId = new Map(input.teams.map((team) => [team.id, team]))
  const nameOf = (id: string) => byId.get(id)?.name ?? id

  buildOverview(book, input, nameOf)
  buildStandings(book, input, nameOf)
  buildFixtures(book, input, nameOf)
  buildTeams(book, input, nameOf)
  buildPlayers(book, input, nameOf)

  // Sheet names are fixed above and already legal, but the sanitiser runs
  // anyway so a future sheet named after user data cannot produce a workbook
  // Excel refuses to open.
  book.eachSheet((sheet) => {
    sheet.name = sheetName(sheet.name)
  })

  return book
}

/** Build the workbook and hand it to the user. */
export async function exportTournamentWorkbook(input: ExcelExportInput): Promise<void> {
  const book = await buildWorkbook(input)
  const buffer = await book.xlsx.writeBuffer()
  await saveFile({
    blob: new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename: workbookFilename(input.tournament),
    title: input.tournament.name,
  })
}
