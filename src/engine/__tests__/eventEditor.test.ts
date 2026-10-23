// engine/__tests__/eventEditor.test.ts
import { describe, it, expect } from "vitest"
import type { Player } from "@/modules/players/types"
import { buildLineup } from "../events/lineup"
import { generateMatchStats } from "../events/generate"
import {
  blankStats,
  draftFromStats,
  rebuildStats,
  redsOfDraft,
  scoreOfEvents,
  shootoutTally,
  type MatchDraft,
} from "../events/editor"
import { packStats, unpackStats } from "../events/packStats"

function squad(teamId: string): Player[] {
  const out: Player[] = []
  const shape = { GK: 2, DEF: 6, MID: 6, FWD: 5 } as const
  for (const position of ["GK", "DEF", "MID", "FWD"] as const) {
    for (let i = 0; i < shape[position]; i++) {
      out.push({
        id: `${teamId}-${position}-${i}`,
        teamId,
        name: `${position}${i}`,
        position,
        power: 70,
      })
    }
  }
  return out
}

function generated(home = 2, away = 1) {
  const h = squad("h")
  const a = squad("a")
  return generateMatchStats({
    homeLineup: buildLineup(h),
    awayLineup: buildLineup(a),
    homePower: 70,
    awayPower: 70,
    homeGoals: home,
    awayGoals: away,
    homeSquad: h,
    awaySquad: a,
  })
}

describe("scoreOfEvents", () => {
  it("credits own goals to the side on the event", () => {
    const score = scoreOfEvents([
      { minute: 10, type: "goal", side: "home", playerId: "x" },
      { minute: 20, type: "ownGoal", side: "away", playerId: "y" },
      { minute: 30, type: "penMiss", side: "home", playerId: "x" },
      { minute: 40, type: "yellow", side: "away", playerId: "y" },
    ])
    expect(score).toEqual({ home: 1, away: 1 })
  })

  it("splits the score at ninety when extra time was played", () => {
    const score = scoreOfEvents(
      [
        { minute: 88, type: "goal", side: "home", playerId: "x" },
        { minute: 101, type: "goal", side: "away", playerId: "y" },
      ],
      true
    )
    expect(score).toEqual({ home: 1, away: 1, ft: { home: 1, away: 0 } })
  })
})

describe("shootoutTally / redsOfDraft", () => {
  it("counts scored kicks per side", () => {
    expect(
      shootoutTally([
        { order: 1, side: "home", playerId: null, scored: true },
        { order: 2, side: "away", playerId: null, scored: false },
        { order: 3, side: "home", playerId: null, scored: true },
      ])
    ).toEqual({ home: 2, away: 0 })
  })

  it("leaves extra-time dismissals out of the stored reds", () => {
    const draft: MatchDraft = {
      events: [
        { minute: 60, type: "red", side: "home", playerId: null },
        { minute: 100, type: "red", side: "away", playerId: null },
      ],
      substitutions: [],
      shootout: [],
      extraTime: true,
    }
    expect(redsOfDraft(draft)).toEqual([{ side: "home", minute: 60 }])
  })
})

describe("rebuildStats", () => {
  it("is a no-op on the numbers when the draft is unchanged", () => {
    const base = generated(2, 1)
    const out = rebuildStats(base, draftFromStats(base, false))
    expect(scoreOfEvents(out.events)).toEqual(scoreOfEvents(base.events))
    for (const old of base.lines) {
      if (!old.playerId) continue
      const line = out.lines.find((l) => l.playerId === old.playerId && l.side === old.side)!
      expect(line.goals).toBe(old.goals)
      expect(line.assists).toBe(old.assists)
      expect(line.rating).toBeCloseTo(old.rating, 0)
    }
  })

  it("moves a goal from one player to another and re-rates both", () => {
    const base = blankStats(generated(0, 0))
    const [first, second] = base.lines.filter(
      (l) => l.side === "home" && l.playerId && l.position === "MID"
    )
    const draft = draftFromStats(base, false)
    draft.events.push({
      minute: 30,
      type: "goal",
      side: "home",
      playerId: first.playerId,
      assistId: null,
    })
    const scored = rebuildStats(base, draft)
    expect(scored.lines.find((l) => l.playerId === first.playerId)!.goals).toBe(1)
    expect(scored.lines.find((l) => l.playerId === first.playerId)!.rating).toBeGreaterThan(
      first.rating
    )

    const moved = rebuildStats(scored, {
      ...draftFromStats(scored, false),
      events: [
        {
          minute: 30,
          type: "goal",
          side: "home",
          playerId: second.playerId,
          assistId: first.playerId,
        },
      ],
    })
    const lost = moved.lines.find((l) => l.playerId === first.playerId)!
    expect(lost.goals).toBe(0)
    expect(lost.assists).toBe(1)
    expect(moved.lines.find((l) => l.playerId === second.playerId)!.goals).toBe(1)
  })

  it("adds a line for a bench player and keeps goals consistent with the score", () => {
    const base = blankStats(generated(0, 0))
    const draft = draftFromStats(base, false)
    draft.events.push({
      minute: 12,
      type: "goal",
      side: "away",
      playerId: "a-FWD-4",
      assistId: null,
    })
    const out = rebuildStats(base, draft, () => "FWD")
    expect(scoreOfEvents(out.events)).toEqual({ home: 0, away: 1 })
    expect(out.lines.find((l) => l.playerId === "a-FWD-4")?.goals).toBe(1)
    const homeKeeper = out.lines.find((l) => l.side === "home" && l.position === "GK")!
    expect(homeKeeper.conceded).toBe(1)
    expect(homeKeeper.cleanSheet).toBe(false)
    expect(out.team.onTarget[1]).toBeGreaterThanOrEqual(1)
  })

  it("derives minutes from substitutions and drops a bench line whose change was removed", () => {
    const base = blankStats(generated(0, 0))
    const out0 = draftFromStats(base, false)
    const starter = base.lines.find((l) => l.side === "home" && l.position === "MID" && l.playerId)!
    const starters = new Set(base.lines.map((l) => l.playerId))
    const bench = squad("h").find((p) => p.position === "MID" && !starters.has(p.id))!.id
    out0.substitutions.push({
      minute: 60,
      side: "home",
      outPlayerId: starter.playerId,
      inPlayerId: bench,
      position: "MID",
      reason: "tactical",
    })
    const withSub = rebuildStats(base, out0, () => "MID")
    expect(withSub.lines.find((l) => l.playerId === starter.playerId)?.minutesPlayed).toBe(60)
    expect(withSub.lines.find((l) => l.playerId === bench)?.minutesPlayed).toBe(30)
    expect(withSub.events.some((e) => e.type === "sub" && e.minute === 60)).toBe(true)

    // Take the change back out: the bench player disappears, the starter plays on.
    const undone = rebuildStats(withSub, { ...draftFromStats(withSub, false), substitutions: [] })
    expect(undone.lines.some((l) => l.playerId === bench)).toBe(false)
    expect(undone.lines.find((l) => l.playerId === starter.playerId)?.minutesPlayed).toBeUndefined()
  })

  it("survives a pack/unpack round trip", () => {
    const base = generated(3, 2)
    const draft = draftFromStats(base, false)
    draft.shootout = [{ order: 1, side: "home", playerId: "h-FWD-0", scored: true }]
    const out = rebuildStats(base, draft)
    expect(unpackStats(packStats(out))).toEqual(out)
  })
})
