import { stageForDistance } from "@/engine"
import type { KnockoutStage } from "../types"

/** Named knockout stages (excluding the final) present in a bracket with
 *  `totalRounds` rounds, ordered from the earliest/biggest round (r64) down
 *  to the one right before the final (semifinal). Distances beyond r64
 *  collapse into the same "r64" entry, so the list never grows past 5 rows. */
export function knockoutStagesForRoundCount(totalRounds: number): KnockoutStage[] {
  const stages: KnockoutStage[] = []
  for (let distance = totalRounds - 1; distance >= 1; distance--) {
    const stage = stageForDistance(distance)
    if (!stages.includes(stage)) stages.push(stage)
  }
  return stages
}

/** Total knockout rounds (including the final) for a bracket seeded with
 *  `count` teams/qualifiers — used to preview which stage rows will exist
 *  before the bracket is actually built (e.g. during tournament creation). */
export function totalRoundsForSize(count: number): number {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(2, count))))
  return Math.log2(size)
}
