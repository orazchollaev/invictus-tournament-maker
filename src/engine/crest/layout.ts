import type { CrestPart, CrestPlacement, CrestPos, CrestSize, CrestSpec } from "./types"

/** Positions each part accepts; the first is its default. */
export const CREST_POSITIONS: Record<CrestPart, CrestPos[]> = {
  emblem: ["center", "top", "bottom", "left", "right"],
  year: ["sides", "top", "bottom", "left", "right", "center"],
  stars: ["top", "bottom", "left", "right"],
  ribbon: ["bottom", "top"],
}

export const CREST_SIZES: CrestSize[] = ["sm", "md", "lg"]

/** Multiplier on each part's medium size. */
export const SIZE_SCALE: Record<CrestSize, number> = { sm: 0.72, md: 1, lg: 1.3 }

/**
 * Where a part sits, falling back to its default for anything unset or not
 * valid for that part. A monogram fills the shield's width, so its year
 * defaults to underneath instead of either side.
 */
export function placement(spec: CrestSpec, part: CrestPart): CrestPlacement {
  const set = spec.layout?.[part]
  const allowed = CREST_POSITIONS[part]
  let fallback = allowed[0]
  if (part === "year" && spec.emblem.kind === "monogram") fallback = "bottom"
  const pos = set?.pos && allowed.includes(set.pos) ? set.pos : fallback
  const size = set?.size && CREST_SIZES.includes(set.size) ? set.size : "md"
  return { pos, size }
}
