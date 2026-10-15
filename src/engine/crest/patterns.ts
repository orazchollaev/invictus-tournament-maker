import { r, type Box, type FittedShield } from "./shields"
import type { CrestPattern } from "./types"

type Pt = [number, number]

/** A straight band of thickness `t` from p to q, as a polygon. */
function band([x1, y1]: Pt, [x2, y2]: Pt, t: number): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const nx = (-(y2 - y1) / len) * (t / 2)
  const ny = ((x2 - x1) / len) * (t / 2)
  return poly([
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
  ])
}

function poly(points: Pt[]): string {
  return `<polygon points="${points.map(([x, y]) => `${r(x)},${r(y)}`).join(" ")}"/>`
}

function rect(x: number, y: number, w: number, h: number): string {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"/>`
}

/**
 * Field divisions, drawn in the pattern colour over the field colour and
 * clipped to the shield by the caller. Coordinates come from the fitted
 * shield's box, so each one sits right on every outline. The shapes follow
 * Armoria's divisions and ordinaries (MIT), simplified to straight lines.
 */
const PATTERNS: Record<CrestPattern, (b: Box, shield: FittedShield, color: string) => string> = {
  plain: () => "",
  halves: (b) => rect(b.x + b.w / 2, b.y - 5, b.w, b.h + 10),
  perFess: (b) => rect(b.x - 5, b.y + b.h * 0.48, b.w + 10, b.h),
  perBend: (b) =>
    poly([
      [b.x - 5, b.y - 5],
      [b.x + b.w + 5, b.y - 5],
      [b.x + b.w + 5, b.y + b.h + 5],
    ]),
  quarterly: (b) =>
    rect(b.x + b.w / 2, b.y - 5, b.w, b.h * 0.48 + 5) +
    rect(b.x - 5, b.y + b.h * 0.48, b.w / 2 + 5, b.h),
  stripes: (b) => {
    const n = 7
    const sw = b.w / n
    let out = ""
    for (let i = 1; i < n; i += 2) out += rect(b.x + i * sw, b.y - 5, sw, b.h + 10)
    return out
  },
  hoops: (b) => {
    const n = 7
    const sh = b.h / n
    let out = ""
    for (let i = 1; i < n; i += 2) out += rect(b.x - 5, b.y + i * sh, b.w + 10, sh)
    return out
  },
  pale: (b) => rect(b.x + b.w * 0.36, b.y - 5, b.w * 0.28, b.h + 10),
  sash: (b) => band([b.x - 5, b.y - 5], [b.x + b.w + 5, b.y + b.h + 5], b.w * 0.3),
  cross: (b) =>
    rect(b.x + b.w * 0.39, b.y - 5, b.w * 0.22, b.h + 10) +
    rect(b.x - 5, b.y + b.h * 0.36, b.w + 10, b.w * 0.22),
  saltire: (b) =>
    band([b.x - 5, b.y - 5], [b.x + b.w + 5, b.y + b.h + 5], b.w * 0.2) +
    band([b.x + b.w + 5, b.y - 5], [b.x - 5, b.y + b.h + 5], b.w * 0.2),
  chevron: (b, _s, color) => {
    const t = b.w * 0.2
    const apex: Pt = [b.x + b.w / 2, b.y + b.h * 0.38]
    const d = `M${r(b.x - 10)},${r(b.y + b.h * 0.95)} L${r(apex[0])},${r(apex[1])} L${r(b.x + b.w + 10)},${r(b.y + b.h * 0.95)}`
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r(t)}" stroke-linejoin="miter"/>`
  },
  chief: (b) => rect(b.x - 5, b.y - 5, b.w + 10, b.h * 0.3 + 5),
  bordure: (_b, s, color) => {
    return `<path d="${s.path}" transform="${s.transform}" fill="none" stroke="${color}" stroke-width="${r(30 / s.scale)}"/>`
  },
  checky: (b) => {
    const cols = 6
    const c = b.w / cols
    const rows = Math.ceil(b.h / c)
    let out = ""
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) if ((x + y) % 2) out += rect(b.x + x * c, b.y + y * c, c, c)
    return out
  },
  gyronny: (b) => {
    const cx = b.x + b.w / 2
    const cy = b.y + b.h * 0.45
    const R = Math.max(b.w, b.h) * 1.2
    let out = ""
    for (let i = 0; i < 8; i += 2) {
      const a1 = (i * Math.PI) / 4 - Math.PI / 2
      const a2 = ((i + 1) * Math.PI) / 4 - Math.PI / 2
      out += poly([
        [cx, cy],
        [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R],
        [cx + Math.cos(a2) * R, cy + Math.sin(a2) * R],
      ])
    }
    return out
  },
  pile: (b) =>
    poly([
      [b.x + b.w * 0.18, b.y - 5],
      [b.x + b.w * 0.82, b.y - 5],
      [b.x + b.w / 2, b.y + b.h * 0.8],
    ]),
}

export const CREST_PATTERNS = Object.keys(PATTERNS) as CrestPattern[]

export function patternMarkup(pattern: CrestPattern, shield: FittedShield, color: string): string {
  return (PATTERNS[pattern] ?? PATTERNS.plain)(shield.box, shield, color)
}

/** Where the emblem sits for a pattern: lower when a chief takes the top band. */
export function emblemCenter(pattern: CrestPattern, b: Box): Pt {
  const ratio = pattern === "chief" ? 0.6 : 0.46
  return [b.x + b.w / 2, b.y + b.h * ratio]
}
