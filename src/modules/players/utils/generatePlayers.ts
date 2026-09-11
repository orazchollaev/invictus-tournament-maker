import type { Player, PlayerPosition } from "../types"
import { PLAYER_POSITIONS } from "../types"
import { SQUAD_POSITION_TARGETS, SQUAD_TARGET_SIZE } from "../constants"

export interface PositionDeficit {
  position: PlayerPosition
  count: number
}

/**
 * How many players of each position a squad is short of its target depth.
 * Never shrinks an oversized position, and never plans past the overall
 * squad target even when the per-position deficits would sum past it.
 */
export function planGeneration(
  currentSquad: Player[],
  targets: Record<PlayerPosition, number> = SQUAD_POSITION_TARGETS,
  totalTarget: number = SQUAD_TARGET_SIZE
): PositionDeficit[] {
  const counts: Record<PlayerPosition, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
  for (const p of currentSquad) counts[p.position]++

  let room = Math.max(0, totalTarget - currentSquad.length)
  const plan: PositionDeficit[] = []

  for (const position of PLAYER_POSITIONS) {
    const deficit = Math.max(0, targets[position] - counts[position])
    const count = Math.min(deficit, room)
    if (count > 0) plan.push({ position, count })
    room -= count
  }

  return plan
}

export interface GeneratedPlayerSpec {
  name: string
  position: PlayerPosition
  power: number
  /** Absent once every shirt number 1-99 is already taken by the squad. */
  number?: number
}

/** How far an individual generated player's power can drift from the squad's target average. */
const POWER_SPREAD = 15

/**
 * Turns a position plan into concrete player specs: names drawn without
 * repeats from the pool where possible, power spread evenly around
 * `targetPower` (the team's own rating, by default) rather than every
 * generated player landing near a fixed default — a generated squad reads
 * as belonging to its team instead of every team fielding the same players —
 * and a shirt number unique within the squad, drawn from 1-99 minus
 * `takenNumbers` (the existing squad's numbers, kept updated as each spec
 * claims one so two generated players never collide with each other either).
 */
export function drawGenerationSpecs(
  plan: PositionDeficit[],
  firstNames: string[],
  lastNames: string[],
  targetPower = 60,
  takenNumbers: Set<number> = new Set(),
  rng: () => number = Math.random
): GeneratedPlayerSpec[] {
  const specs: GeneratedPlayerSpec[] = []
  const used = new Set<string>()
  const maxCombos = firstNames.length * lastNames.length
  const takenShirts = new Set(takenNumbers)

  function pick(pool: string[]): string {
    return pool[Math.floor(rng() * pool.length)]
  }

  function drawName(): string {
    if (!firstNames.length || !lastNames.length) return "Player"
    for (let attempt = 0; attempt < 20; attempt++) {
      const combo = `${pick(firstNames)} ${pick(lastNames)}`
      if (!used.has(combo) || used.size >= maxCombos) {
        used.add(combo)
        return combo
      }
    }
    return `${pick(firstNames)} ${pick(lastNames)}`
  }

  function drawPower(): number {
    const power = Math.round(targetPower + (rng() - 0.5) * 2 * POWER_SPREAD)
    return Math.max(1, Math.min(99, power))
  }

  function drawNumber(): number | undefined {
    if (takenShirts.size >= 99) return undefined
    let n: number
    do {
      n = 1 + Math.floor(rng() * 99)
    } while (takenShirts.has(n))
    takenShirts.add(n)
    return n
  }

  for (const { position, count } of plan) {
    for (let i = 0; i < count; i++) {
      specs.push({ name: drawName(), position, power: drawPower(), number: drawNumber() })
    }
  }

  return specs
}
