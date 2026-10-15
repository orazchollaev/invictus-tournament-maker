import { CHARGES, starPoints } from "./charges"
import { bestContrast, mix, outlineFor } from "./color"
import { placement, SIZE_SCALE } from "./layout"
import { emblemCenter, patternMarkup } from "./patterns"
import { fitShield, r, type Box } from "./shields"
import type { CrestPos, CrestSpec, CrestText } from "./types"

/**
 * Crest SVG as a standalone document. Every crest is shown through an <img>,
 * so ids inside never meet another crest's, and nothing external can load:
 * text falls back on the device's own fonts, which is why the stacks below
 * end in generic families.
 */

const FONTS = {
  sans: "'Arial Black','Helvetica Neue',Arial,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
}

type Pt = [number, number]

/** Running extent of everything drawn, so the view can hug it. */
interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

function grow(bounds: Bounds, x0: number, y0: number, x1: number, y1: number) {
  bounds.x0 = Math.min(bounds.x0, x0)
  bounds.y0 = Math.min(bounds.y0, y0)
  bounds.x1 = Math.max(bounds.x1, x1)
  bounds.y1 = Math.max(bounds.y1, y1)
}

/**
 * A square view around what was drawn, so a plain shield fills a small badge
 * instead of sitting in the margin a ribbon or stars would need.
 */
function viewBox({ x0, y0, x1, y1 }: Bounds): string {
  const w = x1 - x0
  const h = y1 - y0
  const size = Math.max(w, h)
  return [x0 - (size - w) / 2, y0 - (size - h) / 2, size, size].map((v) => r(v)).join(" ")
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Letters to draw for a monogram: the override, else the abbreviation, capped at 4. */
export function monogramText(spec: CrestSpec, text: CrestText): string {
  const raw = spec.emblem.kind === "monogram" && spec.emblem.text ? spec.emblem.text : text.abbr
  return [...raw.trim().toUpperCase()].slice(0, 4).join("")
}

/** Where on the shield an emblem anchored at `pos` is centred. */
function emblemAnchor(pos: CrestPos, spec: CrestSpec, b: Box): Pt {
  const cx = b.x + b.w / 2
  switch (pos) {
    case "top":
      return [cx, b.y + b.h * 0.25]
    case "bottom":
      return [cx, b.y + b.h * 0.68]
    case "left":
      return [b.x + b.w * 0.27, b.y + b.h * 0.44]
    case "right":
      return [b.x + b.w * 0.73, b.y + b.h * 0.44]
    default:
      return emblemCenter(spec.pattern, b)
  }
}

/** The ribbon's geometry: `ey` is the top edge at its ends, `c` how far the middle bows (down +, up −). */
interface RibbonFrame {
  ey: number
  c: number
}

function ribbonFrame(pos: CrestPos, b: Box): RibbonFrame {
  // At the foot it smiles over the point; across the top it arches over the shield's head.
  return pos === "top" ? { ey: b.y - 6, c: -18 } : { ey: Math.min(b.y + b.h - 26, 192), c: 18 }
}

export function renderCrest(spec: CrestSpec, text: CrestText): string {
  const { field, pattern, emblem } = spec.colors
  const outline = outlineFor(field)
  const shield = fitShield(spec.shape)
  const b = shield.box
  const font = FONTS[spec.font] ?? FONTS.sans
  const year = (spec.year ?? "").replace(/\D/g, "").slice(0, 4)
  const mid = emblemCenter(spec.pattern, b)
  // Secondary detail on a charge needs to read against the charge itself.
  const secondary = bestContrast(emblem, [field, pattern, outline])
  const stars = Math.max(0, Math.min(5, Math.round(spec.stars)))
  const hasRibbon = spec.ribbon && !!text.name.trim()
  const textStroke = `stroke="${outline}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"`

  const emblemAt = placement(spec, "emblem")
  const yearAt = placement(spec, "year")
  const starsAt = placement(spec, "stars")
  const ribbonAt = placement(spec, "ribbon")
  const ribbonGeo = hasRibbon ? ribbonFrame(ribbonAt.pos, b) : null

  const bounds: Bounds = { x0: b.x - 4, y0: b.y - 4, x1: b.x + b.w + 4, y1: b.y + b.h + 4 }

  // Field, division, emblem and year — everything that lives inside the shield.
  const inside: string[] = [
    `<rect x="-40" y="-40" width="280" height="300" fill="${field}"/>`,
    `<g fill="${pattern}">${patternMarkup(spec.pattern, shield, pattern)}</g>`,
  ]

  const [ex, ey] = emblemAnchor(emblemAt.pos, spec, b)
  const scale = SIZE_SCALE[emblemAt.size]
  const sideways = emblemAt.pos === "left" || emblemAt.pos === "right"
  // A year either side of a centred emblem needs a little room.
  const crowded = !!year && yearAt.pos === "sides" && emblemAt.pos === "center"
  const letters = spec.emblem.kind === "monogram" ? monogramText(spec, text) : ""
  if (spec.emblem.kind === "charge") {
    const charge = CHARGES[spec.emblem.id]
    if (charge) {
      const k = (crowded ? 0.95 : 1.12) * (sideways ? 0.72 : 1) * scale
      inside.push(
        `<g transform="translate(${r(ex)} ${r(ey)}) scale(${r(k, 1000)}) translate(-100 -100)" fill="${emblem}" stroke="${outline}">${charge.svg}</g>`
      )
    }
  } else if (letters) {
    const size = [0, 70, 60, 44, 34][letters.length] * (sideways ? 0.6 : 1) * scale
    inside.push(
      `<text x="${r(ex)}" y="${r(ey)}" font-family="${font}" font-weight="900" font-size="${r(size)}" text-anchor="middle" dominant-baseline="central" fill="${emblem}" ${textStroke}>${esc(letters)}</text>`
    )
  }

  if (year)
    inside.push(
      ...yearMarkup(year, yearAt.pos, SIZE_SCALE[yearAt.size], b, mid, font, emblem, textStroke)
    )

  const parts: string[] = [
    `<g clip-path="url(#s)">`,
    ...inside,
    `<rect x="-40" y="-40" width="280" height="300" fill="url(#g)"/>`,
    `</g>`,
  ]

  if (spec.trim) {
    const s = 0.88
    const tcx = b.x + b.w / 2
    const tcy = b.y + b.h / 2
    parts.push(
      `<g transform="translate(${r(tcx)} ${r(tcy)}) scale(${s}) translate(${r(-tcx)} ${r(-tcy)})">` +
        `<path d="${shield.path}" transform="${shield.transform}" fill="none" stroke="${emblem}" stroke-width="${r(3 / (shield.scale * s))}"/></g>`
    )
  }

  parts.push(
    `<path d="${shield.path}" transform="${shield.transform}" fill="none" stroke="${outline}" stroke-width="${r(5 / shield.scale)}" stroke-linejoin="round"/>`
  )

  if (ribbonGeo) {
    const label = text.name.trim()
    parts.push(ribbon(label, ribbonGeo, SIZE_SCALE[ribbonAt.size], emblem, field, outline, font))
    const { ey: top, c } = ribbonGeo
    grow(bounds, -16, Math.min(top, top + c / 2) - 2, 216, Math.max(top + 38, top + 26 + c / 2) + 2)
  }

  if (stars) {
    const R = 10.5 * SIZE_SCALE[starsAt.size]
    // Stars clear the ribbon when it sits on the same edge.
    const topEdge = ribbonGeo && ribbonAt.pos === "top" ? ribbonGeo.ey + ribbonGeo.c / 2 - 2 : b.y
    const bottomEdge = ribbonGeo && ribbonAt.pos === "bottom" ? ribbonGeo.ey + 38 : b.y + b.h
    for (const [sx, sy] of starSpots(stars, starsAt.pos, R, b, topEdge, bottomEdge)) {
      parts.push(
        `<polygon points="${starPoints(sx, sy, R, R * 0.42)}" fill="${emblem}" stroke="${outline}" stroke-width="1.5" stroke-linejoin="round"/>`
      )
      grow(bounds, sx - R - 1, sy - R - 1, sx + R + 1, sy + R + 1)
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(bounds)}" width="240" height="240">` +
    `<defs><clipPath id="s"><path d="${shield.path}" transform="${shield.transform}"/></clipPath>` +
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".32"/>` +
    `<stop offset=".5" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>` +
    `<style>.secondary{fill:${secondary}}.tertiary{fill:${mix(emblem, outline, 0.35)}}.pseudostroke{fill:${outline}}</style></defs>` +
    parts.join("") +
    `</svg>`
  )
}

function yearMarkup(
  year: string,
  pos: CrestPos,
  scale: number,
  b: Box,
  [mx, my]: Pt,
  font: string,
  fill: string,
  textStroke: string
): string[] {
  const attrs = `font-family="${font}" font-weight="800" font-size="${r(17 * scale)}" text-anchor="middle" dominant-baseline="central" fill="${fill}" ${textStroke}`
  const at = (x: number, y: number, s: string, rotate = 0) =>
    `<text x="${r(x)}" y="${r(y)}"${rotate ? ` transform="rotate(${rotate} ${r(x)} ${r(y)})"` : ""} letter-spacing="1" ${attrs}>${esc(s)}</text>`
  switch (pos) {
    case "sides": {
      const half = Math.ceil(year.length / 2)
      const dx = b.w * 0.36
      return [at(mx - dx, my + 2, year.slice(0, half)), at(mx + dx, my + 2, year.slice(half))]
    }
    case "top":
      return [at(mx, b.y + b.h * 0.13, year)]
    case "bottom":
      return [at(mx, b.y + b.h * 0.8, year)]
    case "left":
      return [at(b.x + b.w * 0.13, my, year, -90)]
    case "right":
      return [at(b.x + b.w * 0.87, my, year, 90)]
    default:
      return [at(mx, my, year)]
  }
}

/** Star centres for `n` stars of radius `R`, arcing along the chosen edge of the shield. */
function starSpots(
  n: number,
  pos: CrestPos,
  R: number,
  b: Box,
  topEdge: number,
  bottomEdge: number
): Pt[] {
  const gap = R * 2.2
  const spots: Pt[] = []
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2
    const bow = Math.abs(off) * R * 0.33
    const cx = b.x + b.w / 2
    const cy = b.y + b.h * 0.45
    if (pos === "bottom") spots.push([cx + off * gap, bottomEdge + R + 3 - bow])
    else if (pos === "left") spots.push([b.x - R - 4 + bow, cy + off * gap])
    else if (pos === "right") spots.push([b.x + b.w + R + 4 - bow, cy + off * gap])
    else spots.push([cx + off * gap, topEdge - R - 1.5 + bow])
  }
  return spots
}

function ribbon(
  name: string,
  { ey, c }: RibbonFrame,
  scale: number,
  fill: string,
  field: string,
  outline: string,
  font: string
): string {
  const label = [...name.toUpperCase()].slice(0, 22).join("")
  const ink = bestContrast(fill, [field, outline, "#ffffff"])
  const tailFill = mix(fill, outline, 0.3)
  const fold = mix(fill, outline, 0.6)
  const fontSize = 15 * scale
  // Bold capitals run about 0.72em wide; past the band's length, squeeze to fit.
  const fit =
    label.length * fontSize * 0.72 > 150 ? ` textLength="150" lengthAdjust="spacingAndGlyphs"` : ""
  const y = (d: number) => r(ey + d)
  return (
    `<g stroke="${outline}" stroke-width="2" stroke-linejoin="round">` +
    `<polygon fill="${tailFill}" points="-14,${y(12)} 18,${y(6)} 18,${y(32)} -14,${y(38)} -5,${y(25)}"/>` +
    `<polygon fill="${tailFill}" points="214,${y(12)} 182,${y(6)} 182,${y(32)} 214,${y(38)} 205,${y(25)}"/>` +
    `<polygon fill="${fold}" points="10,${y(26)} 18,${y(32)} 18,${y(22)}"/>` +
    `<polygon fill="${fold}" points="190,${y(26)} 182,${y(32)} 182,${y(22)}"/>` +
    `<path fill="${fill}" d="M10,${y(0)} Q100,${y(c)} 190,${y(0)} L190,${y(26)} Q100,${y(26 + c)} 10,${y(26)} Z"/>` +
    `</g>` +
    `<path id="rb" d="M16,${y(13)} Q100,${y(13 + c)} 184,${y(13)}" fill="none"/>` +
    `<text font-family="${font}" font-weight="800" font-size="${r(fontSize)}" fill="${ink}" dominant-baseline="central"${fit}>` +
    `<textPath href="#rb" startOffset="50%" text-anchor="middle">${esc(label)}</textPath></text>`
  )
}

/** The crest as an <img>-ready data URL, the form a team's `image` field stores. */
export function renderCrestDataUrl(spec: CrestSpec, text: CrestText): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(renderCrest(spec, text))
}
