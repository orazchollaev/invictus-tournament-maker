// Club crest builder. Kept out of engine/index.ts on purpose: the charge
// artwork is heavy, so the UI loads this module on demand.
//
// Shield outlines and the division shapes follow Armoria by Azgaar (MIT,
// https://github.com/Azgaar/Armoria). Only its CC0 charges are used — most of
// Armoria's detailed charges are CC BY-NC-SA, which a commercial app can't ship.
export type {
  CrestEmblem,
  CrestFont,
  CrestPart,
  CrestPlacement,
  CrestPos,
  CrestSize,
  CrestPattern,
  CrestShape,
  CrestSpec,
  CrestText,
} from "./types"
export { CREST_SHAPES } from "./shields"
export { CREST_PATTERNS } from "./patterns"
export { CREST_POSITIONS, CREST_SIZES, placement } from "./layout"
export { CHARGES, CHARGE_GROUPS, chargesInGroup } from "./charges"
export type { ChargeGroup } from "./charges"
export { CREST_PALETTES, randomCrest } from "./random"
export { renderCrest, renderCrestDataUrl, monogramText } from "./render"
