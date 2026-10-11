import { describe, expect, it } from "vitest"
import { reactive } from "vue"
import { reuseDisplayRounds } from "@/modules/tournament/components/bracket/bracketUtils"
import type { Match } from "@/modules/tournament/types"

function match(id: string, homeId: string | null = null, awayId: string | null = null): Match {
  return { id, homeId, awayId, result: null }
}

describe("reuseDisplayRounds", () => {
  it("wraps every match with its round and position", () => {
    const rounds = [{ matches: [match("a"), match("b")] }, { matches: [match("c")] }]
    const out = reuseDisplayRounds(rounds, undefined)
    expect(out[1][0]).toMatchObject({ id: "c", _origRound: 1, _origMatch: 0 })
    expect(out[0][1]).toMatchObject({ id: "b", _origRound: 0, _origMatch: 1 })
  })

  it("keeps the wrapper of a match that did not change", () => {
    const rounds = reactive([{ matches: [match("a", "x", "y"), match("b", "z", "w")] }])
    const first = reuseDisplayRounds(rounds, undefined)
    rounds[0].matches[1].result = { home: 1, away: 0 }
    const second = reuseDisplayRounds(rounds, first)
    expect(second[0][0]).toBe(first[0][0])
    expect(second[0][1]).not.toBe(first[0][1])
    expect(second[0][1].result).toEqual({ home: 1, away: 0 })
  })

  it("makes a new wrapper when a team is assigned", () => {
    const rounds = reactive([{ matches: [match("a")] }])
    const first = reuseDisplayRounds(rounds, undefined)
    rounds[0].matches[0].homeId = "x"
    expect(reuseDisplayRounds(rounds, first)[0][0]).not.toBe(first[0][0])
  })

  it("makes a new wrapper when a match moves to another position", () => {
    const a = match("a")
    const first = reuseDisplayRounds([{ matches: [a, match("b")] }], undefined)
    const moved = reuseDisplayRounds([{ matches: [match("b"), a] }], first)
    expect(moved[0][1]._origMatch).toBe(1)
    expect(moved[0][0].id).toBe("b")
  })
})
