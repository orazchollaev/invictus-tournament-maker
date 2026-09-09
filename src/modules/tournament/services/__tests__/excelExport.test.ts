// modules/tournament/services/__tests__/excelExport.test.ts
//
// The workbook builder only — `exportTournamentWorkbook` is the same thing
// plus a file hand-off, which belongs to the platform, not to a test.
import { describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import { createTournament } from "@/engine"
import { makeTeams, playGroupByRule, powerWins } from "@/engine/__tests__/helpers"
import { buildWorkbook, workbookFilename, type ExcelPlayerRow } from "../excelExport"

function groupTournament(teams: Team[]) {
  const t = createTournament("Champions Cup", teams, 1, false, undefined, 2, 2)
  for (const group of t.groups ?? []) playGroupByRule(group, teams, powerWins)
  return t
}

function rowsOf(sheet: { getRow: (n: number) => { values: unknown } }, count: number) {
  return Array.from({ length: count }, (_, i) => sheet.getRow(i + 1).values)
}

describe("buildWorkbook", () => {
  it("writes a sheet per section a group tournament has", async () => {
    const teams = makeTeams(8)
    const book = await buildWorkbook({
      tournament: groupTournament(teams),
      teams,
      players: [],
    })

    const names = book.worksheets.map((s) => s.name)
    expect(names).toEqual(["Overview", "Standings", "Fixtures", "Teams"])
  })

  it("skips the standings sheet for a pure knockout, which has no table", async () => {
    const teams = makeTeams(4)
    const t = createTournament("Cup", teams)
    const book = await buildWorkbook({ tournament: t, teams, players: [] })
    expect(book.worksheets.map((s) => s.name)).not.toContain("Standings")
  })

  it("skips the players sheet when no match reports exist", async () => {
    const teams = makeTeams(8)
    const book = await buildWorkbook({ tournament: groupTournament(teams), teams, players: [] })
    expect(book.worksheets.map((s) => s.name)).not.toContain("Players")
  })

  it("writes one standings row per team, in table order", async () => {
    const teams = makeTeams(8)
    const book = await buildWorkbook({ tournament: groupTournament(teams), teams, players: [] })
    const sheet = book.getWorksheet("Standings")!

    // Header plus eight teams across the two groups.
    expect(sheet.rowCount).toBe(9)
    expect(rowsOf(sheet, 1)[0]).toContain("Pts")
    // Each table restarts its ranking, and every row names its own table.
    expect(sheet.getRow(2).getCell("rank").value).toBe(1)
    expect(sheet.getRow(6).getCell("rank").value).toBe(1)
    expect(sheet.getRow(2).getCell("table").value).not.toBe(sheet.getRow(6).getCell("table").value)
    // The draw is random, so only the shape of a name is pinned, not which one.
    expect(sheet.getRow(2).getCell("team").value).toMatch(/^Team \d+$/)
  })

  it("names teams rather than leaking ids into the fixtures sheet", async () => {
    const teams = makeTeams(8)
    const book = await buildWorkbook({ tournament: groupTournament(teams), teams, players: [] })
    const sheet = book.getWorksheet("Fixtures")!

    const home = sheet.getRow(2).getCell("home").value as string
    expect(home).toMatch(/^Team \d+$/)
    expect(sheet.getRow(2).getCell("hg").value).toBeTypeOf("number")
  })

  it("reports the dismissals a result carries", async () => {
    const teams = makeTeams(8)
    const t = groupTournament(teams)
    t.groups![0].matches[0].result!.reds = [{ side: "home", minute: 63 }]

    const book = await buildWorkbook({ tournament: t, teams, players: [] })
    const cell = book.getWorksheet("Fixtures")!.getRow(2).getCell("reds").value
    expect(cell).toBe("H 63'")
  })

  it("adds a players sheet when there are player totals", async () => {
    const teams = makeTeams(8)
    const players: ExcelPlayerRow[] = [
      {
        playerId: "p1",
        name: "A Striker",
        teamId: "t1",
        position: "FWD",
        apps: 4,
        goals: 5,
        assists: 1,
        yellow: 0,
        red: 0,
        cleanSheets: 0,
        saves: 0,
        conceded: 0,
        rating: 7.4,
      },
    ]
    const book = await buildWorkbook({ tournament: groupTournament(teams), teams, players })
    const sheet = book.getWorksheet("Players")!

    expect(sheet.rowCount).toBe(2)
    expect(sheet.getRow(2).getCell("player").value).toBe("A Striker")
    expect(sheet.getRow(2).getCell("team").value).toBe("Team 1")
  })
})

describe("workbookFilename", () => {
  it("keeps letters and digits and drops everything else", () => {
    expect(workbookFilename({ name: "Süper Lig 2026/27", season: 3 } as never)).toBe(
      "Süper-Lig-2026-27-3.xlsx"
    )
  })

  it("falls back to a usable name when nothing survives", () => {
    expect(workbookFilename({ name: "///", season: 0 } as never)).toBe("0.xlsx")
  })
})
