// engine/legs.ts
//
// How many times a fixture repeats for a given leg mode. Its own module
// because every fixture builder needs it and it must not drag a dependency on
// the tournament factories along with it.
import type { LegMode } from "../modules/tournament/types"

export function legModeToCount(mode: LegMode): number {
  if (mode === "double") return 2
  if (mode === "triple") return 3
  if (mode === "quadruple") return 4
  return 1
}
