import { SHIELD_PATHS } from "./shieldPaths"
import type { CrestShape } from "./types"

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Measured bounding boxes of SHIELD_PATHS (getBBox), in their own 200x200 space. */
const RAW_BOXES: Record<CrestShape, [number, number, number, number]> = {
  heater: [25, 25, 150, 175],
  spanish: [25, 25, 150, 175],
  french: [25, 25, 150, 175.4],
  swiss: [25, 20, 150, 180],
  renaissance: [25, 14.4, 150, 185.6],
  baroque: [25, 25, 150.3, 175],
  oldFrench: [24.9, 25, 150.1, 175],
  wedged: [24.9, 19, 149.3, 181],
  pavise: [34.8, 5.3, 130.9, 184.7],
  horsehead: [20, 15, 160, 185],
  round: [15, 15, 170, 170],
  oval: [32.3, 6.4, 135.4, 187.4],
  square: [25, 25, 150, 150],
  hexagon: [23.8, 12, 152.4, 176],
  fantasy1: [15, 5, 170, 195],
  fantasy2: [30, 17, 140, 183],
  fantasy5: [30, 0, 140, 200],
}

export const CREST_SHAPES = Object.keys(SHIELD_PATHS) as CrestShape[]

/**
 * Armoria's shields come in different sizes and offsets. Every shape is fitted
 * into the same frame so patterns, stars and the ribbon line up whatever the
 * outline: centred on x=100, top at y=20, at most 156 wide and 180 tall.
 */
const FRAME = { cx: 100, top: 20, w: 156, h: 180 }

export interface FittedShield {
  path: string
  /** Applied to `path` to land it in the frame. */
  transform: string
  /** The uniform scale inside `transform`, for stroke widths drawn on `path`. */
  scale: number
  /** The shield's box after fitting, in crest coordinates. */
  box: Box
}

export function fitShield(shape: CrestShape): FittedShield {
  const [x, y, w, h] = RAW_BOXES[shape] ?? RAW_BOXES.heater
  const s = Math.min(FRAME.w / w, FRAME.h / h)
  const fw = w * s
  const fh = h * s
  const top = FRAME.top + (FRAME.h - fh) / 2
  const tx = FRAME.cx - fw / 2 - x * s
  const ty = top - y * s
  return {
    path: SHIELD_PATHS[shape] ?? SHIELD_PATHS.heater,
    transform: `translate(${r(tx)} ${r(ty)}) scale(${r(s, 1000)})`,
    scale: s,
    box: { x: FRAME.cx - fw / 2, y: top, w: fw, h: fh },
  }
}

export function r(n: number, p = 100): number {
  return Math.round(n * p) / p
}
