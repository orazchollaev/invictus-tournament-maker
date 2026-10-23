// Player pickers for the match event editor.
import type { Player } from "@/modules/players/types"

/** AppSelect cannot hold an empty value, so "nobody / unknown" is a sentinel. */
export const UNKNOWN_PLAYER = "__unknown"

export interface PlayerOption {
  value: string
  label: string
}

/**
 * The squad as select options, "Unknown Player" first. `extraIds` keeps a
 * player the report already names selectable even if he has since left the
 * squad, so opening the editor never silently blanks a field.
 */
export function playerOptions(
  squad: readonly Player[],
  extraIds: readonly (string | null | undefined)[],
  nameOf: (id: string) => string | undefined,
  unknownLabel: string
): PlayerOption[] {
  const known = new Set(squad.map((p) => p.id))
  const options: PlayerOption[] = [{ value: UNKNOWN_PLAYER, label: unknownLabel }]
  for (const p of squad) {
    options.push({ value: p.id, label: p.number ? `${p.number} · ${p.name}` : p.name })
  }
  for (const id of new Set(extraIds)) {
    if (!id || known.has(id)) continue
    options.push({ value: id, label: nameOf(id) ?? unknownLabel })
  }
  return options
}

export const fromSelect = (value: string): string | null =>
  value === UNKNOWN_PLAYER ? null : value
export const toSelect = (id: string | null | undefined): string => id ?? UNKNOWN_PLAYER
