import { describe, expect, it } from "vitest"
import { effectScope, ref } from "vue"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"
import { createLiveMatch } from "@/engine"
import { useManagerMatch } from "../useManagerMatch"

const POSITION_CYCLE = ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD"] as const

function squad(teamId: string, size = 16): Player[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `${teamId}-p${i}`,
    teamId,
    name: `${teamId} player ${i}`,
    position: POSITION_CYCLE[i % POSITION_CYCLE.length],
    power: 60,
  }))
}

function team(id: string): Team {
  return { id, name: id, color: "#333333", power: 60 }
}

/**
 * `useManagerMatch` calls `onScopeDispose`, so it needs to run inside one —
 * the way a component setup provides it for free. Nothing here calls
 * `.start()`, so the RAF loop never runs; only the plain state transitions
 * `substitute()` performs are under test.
 */
function withMatch<T>(fn: (match: ReturnType<typeof useManagerMatch>) => T): T {
  const scope = effectScope()
  try {
    return scope.run(() => {
      const state = createLiveMatch({
        homeTeam: team("h"),
        awayTeam: team("a"),
        homeSquad: squad("h"),
        awaySquad: squad("a"),
        managedSide: "home",
      })
      // A change made at kick-off (minute 0) is recorded from minute 1 — the
      // earliest a substitution can actually take the field — so the clock
      // has to have moved on at least once for it to show up on the pitch.
      state.minute = 1
      const match = useManagerMatch(state, "home", ref(1))
      return fn(match)
    })!
  } finally {
    scope.stop()
  }
}

describe("useManagerMatch.substitute", () => {
  it("reports success and updates the pitch when the change is legal", () => {
    withMatch((match) => {
      const outSlot = match.pitch.value[0]
      const inPlayer = { ...match.bench.value[0] }
      const ok = match.substitute(outSlot, inPlayer)

      expect(ok).toBe(true)
      expect(match.pitch.value.some((slot) => slot.playerId === inPlayer.id)).toBe(true)
      expect(match.pitch.value.includes(outSlot)).toBe(false)
    })
  })

  it("reports failure and leaves the pitch untouched for a slot no longer out there", () => {
    withMatch((match) => {
      const staleOutSlot = { ...match.pitch.value[0] } // a copy, not the live slot object
      const inPlayer = match.bench.value[0]
      const before = match.pitch.value

      const ok = match.substitute(staleOutSlot, inPlayer)

      expect(ok).toBe(false)
      expect(match.pitch.value).toBe(before)
    })
  })

  it("reports failure for a player who isn't actually on the bench", () => {
    withMatch((match) => {
      const outSlot = match.pitch.value[0]
      // Same id as someone already out there — not a real bench player.
      const disguised: Player = {
        id: match.pitch.value[1].playerId!,
        teamId: "h",
        name: "disguised",
        position: "DEF",
        power: 60,
      }

      const ok = match.substitute(outSlot, disguised)

      expect(ok).toBe(false)
    })
  })
})
