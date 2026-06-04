import type { Match } from "../types"

export type DisplayMatch = Match & { _origRound: number; _origMatch: number }

export function connStroke(active: boolean): string {
  return active ? "var(--accent)" : "var(--border)"
}

export function connOpacity(active: boolean): number {
  return active ? 0.55 : 0.4
}
