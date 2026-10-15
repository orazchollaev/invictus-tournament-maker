import { CHARGES } from "./charges"
import { bestContrast, contrast } from "./color"
import type { CrestPattern, CrestShape, CrestSpec } from "./types"

type Rng = () => number

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

function weighted<T extends string>(rng: Rng, table: Partial<Record<T, number>>): T {
  const entries = Object.entries(table) as [T, number][]
  let roll = rng() * entries.reduce((sum, [, w]) => sum + w, 0)
  for (const [key, w] of entries) {
    roll -= w
    if (roll < 0) return key
  }
  return entries[entries.length - 1][0]
}

/** Club colourways: field, division, emblem. */
export const CREST_PALETTES: [string, string, string][] = [
  ["#c8102e", "#ffffff", "#f2c94c"],
  ["#0b3d91", "#ffffff", "#f2c94c"],
  ["#111111", "#ffffff", "#f2c94c"],
  ["#006a4e", "#ffffff", "#f2c94c"],
  ["#f6c000", "#0b2a5b", "#0b2a5b"],
  ["#6c1d45", "#7fb2e5", "#f2c94c"],
  ["#ff6a00", "#111111", "#ffffff"],
  ["#5b2a86", "#ffffff", "#f2c94c"],
  ["#c8102e", "#111111", "#ffffff"],
  ["#ffd200", "#008a3e", "#008a3e"],
  ["#a50021", "#004b9b", "#f2c94c"],
  ["#0a2240", "#c9a227", "#c9a227"],
  ["#7ec8f0", "#ffffff", "#0a2240"],
  ["#ffffff", "#c8102e", "#0a2240"],
  ["#ffffff", "#111111", "#c9a227"],
  ["#1d428a", "#e4002b", "#ffffff"],
  ["#00843d", "#f2c94c", "#ffffff"],
  ["#8b0000", "#f2c94c", "#f2c94c"],
]

const SHAPE_WEIGHTS: Partial<Record<CrestShape, number>> = {
  heater: 6,
  spanish: 5,
  french: 3,
  swiss: 4,
  oldFrench: 4,
  round: 5,
  baroque: 2,
  renaissance: 2,
  wedged: 2,
  horsehead: 1,
  oval: 2,
  square: 1,
  hexagon: 1,
  pavise: 1,
  fantasy1: 1,
  fantasy2: 1,
  fantasy5: 1,
}

const PATTERN_WEIGHTS: Record<CrestPattern, number> = {
  plain: 5,
  halves: 4,
  perFess: 2,
  perBend: 3,
  quarterly: 3,
  stripes: 5,
  hoops: 3,
  pale: 3,
  sash: 4,
  cross: 2,
  saltire: 2,
  chevron: 3,
  chief: 3,
  bordure: 3,
  checky: 1,
  gyronny: 1,
  pile: 1,
}

/** Charges that look at home on a football crest; the rest stay one tap away in the builder. */
const FAVOURITE_CHARGES = [
  "ball",
  "ball",
  "trophy",
  "crown",
  "crown",
  "bolt",
  "tower",
  "star",
  "mullet",
  "mullet6",
  "mulletFaceted",
  "crescent",
  "sun",
  "fleurDeLis",
  "heart",
  "anchor",
  "crossPattee",
  "crossMaltese",
  "trefle",
  "laurelWreath2",
  "helmetZischagge",
  "cavalier",
  "squirrel",
  "flamberge",
  "compassRose",
  "bridge2",
].filter((id) => id in CHARGES)

/**
 * A crest worth keeping without touching anything. With `base`, the field
 * takes that colour and the rest is chosen to read against it.
 */
export function randomCrest(rng: Rng = Math.random, base?: string): CrestSpec {
  let [field, pattern, emblem] = pick(rng, CREST_PALETTES)
  if (base) {
    field = base
    pattern = bestContrast(base, ["#ffffff", "#111111", "#0a2240"])
    emblem = bestContrast(base, ["#f2c94c", "#ffffff", "#111111"])
  }
  // The emblem sits on both field and division, so it has to clear both.
  if (contrast(emblem, field) < 1.8 || contrast(emblem, pattern) < 1.4) {
    emblem = bestContrast(field, ["#f2c94c", "#ffffff", "#111111", pattern])
  }

  const year = rng() < 0.3 ? String(1870 + Math.floor(rng() * 130)) : undefined
  return {
    v: 1,
    shape: weighted(rng, SHAPE_WEIGHTS),
    pattern: weighted(rng, PATTERN_WEIGHTS),
    colors: { field, pattern, emblem },
    emblem:
      rng() < 0.72 ? { kind: "charge", id: pick(rng, FAVOURITE_CHARGES) } : { kind: "monogram" },
    stars: rng() < 0.6 ? 0 : pick(rng, [1, 1, 2, 3, 3, 4, 5]),
    ribbon: rng() < 0.35,
    year,
    font: rng() < 0.7 ? "sans" : "serif",
    trim: rng() < 0.5,
  }
}
