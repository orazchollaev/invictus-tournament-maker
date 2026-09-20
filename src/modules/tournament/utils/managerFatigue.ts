// modules/tournament/utils/managerFatigue.ts
//
// Bucketing engine/fatigue.ts's raw 0-1 values for display — every manager
// screen that lists players (the starting XI pitch, the slot picker, the
// substitution sheet, the live on-pitch list) reads a player's tiredness
// through this one place, so "40% and up counts as tired" is never redefined
// per screen.
export const FATIGUE_TIRED = 0.4
export const FATIGUE_EXHAUSTED = 0.75

export type FatigueLevel = "fresh" | "tired" | "exhausted"

/** `undefined` means no fatigue data at all — fatigue is off, or nothing has been played. */
export function fatigueLevel(value: number | undefined): FatigueLevel | null {
  if (value === undefined) return null
  if (value >= FATIGUE_EXHAUSTED) return "exhausted"
  if (value >= FATIGUE_TIRED) return "tired"
  return "fresh"
}

/**
 * The number a manager actually reads off a shirt: stamina, not fatigue —
 * 100% is fully fresh, and it falls toward 0% as `engine/fatigue.ts`'s own
 * (opposite-direction) figure climbs. The badge's colour still comes from
 * `fatigueLevel` above, on the raw value; only the printed number is flipped.
 */
export function staminaPercent(value: number | undefined): number {
  return Math.round((1 - (value ?? 0)) * 100)
}
