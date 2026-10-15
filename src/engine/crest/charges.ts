import { ARMORIA_CHARGES } from "./armoriaCharges"
import { r } from "./shields"

export type ChargeGroup = "football" | "stars" | "crosses" | "symbols" | "objects"

export interface Charge {
  group: ChargeGroup
  /** Markup centred on (100,100), about 80 units across. */
  svg: string
}

function ngon(cx: number, cy: number, radius: number, n: number, rot = -90): string {
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180
    pts.push(`${r(cx + Math.cos(a) * radius)},${r(cy + Math.sin(a) * radius)}`)
  }
  return pts.join(" ")
}

function ball(): string {
  let seams = ""
  let patches = ""
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + 72 * i) * Math.PI) / 180
    const x1 = 100 + Math.cos(a) * 14
    const y1 = 100 + Math.sin(a) * 14
    const x2 = 100 + Math.cos(a) * 27
    const y2 = 100 + Math.sin(a) * 27
    seams += `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"/>`
    const px = 100 + Math.cos(a) * 37
    const py = 100 + Math.sin(a) * 37
    patches += `<polygon class="pseudostroke" points="${ngon(px, py, 11, 5, -90 + 72 * i + 180)}"/>`
  }
  return (
    `<g stroke-width="2"><clipPath id="crest-ball"><circle cx="100" cy="100" r="40"/></clipPath>` +
    `<circle cx="100" cy="100" r="40"/>` +
    `<g clip-path="url(#crest-ball)">${patches}</g>` +
    `<polygon class="pseudostroke" points="${ngon(100, 100, 14, 5)}"/>${seams}` +
    `<circle cx="100" cy="100" r="40" fill="none"/></g>`
  )
}

/** Hand-drawn for this app, same licence as the rest of the code. */
const OWN_CHARGES: Record<string, Charge> = {
  ball: { group: "football", svg: ball() },
  trophy: {
    group: "football",
    svg:
      `<g stroke-width="2">` +
      `<path fill-rule="evenodd" d="M62,80 a12,12 0 1 0 24,0 a12,12 0 1 0 -24,0 Z M68,80 a6,6 0 1 0 12,0 a6,6 0 1 0 -12,0 Z"/>` +
      `<path fill-rule="evenodd" d="M114,80 a12,12 0 1 0 24,0 a12,12 0 1 0 -24,0 Z M120,80 a6,6 0 1 0 12,0 a6,6 0 1 0 -12,0 Z"/>` +
      `<path d="M74,62 H126 V80 C126,102 114,112 100,114 C86,112 74,102 74,80 Z"/>` +
      `<rect x="95" y="114" width="10" height="12"/>` +
      `<rect class="secondary" x="84" y="126" width="32" height="7"/>` +
      `<rect x="78" y="133" width="44" height="9"/></g>`,
  },
  crown: {
    group: "football",
    svg:
      `<g stroke-width="2">` +
      `<polygon points="62,120 56,74 80,98 100,62 120,98 144,74 138,120"/>` +
      `<circle cx="56" cy="72" r="6"/><circle cx="100" cy="60" r="6"/><circle cx="144" cy="72" r="6"/>` +
      `<rect x="62" y="118" width="76" height="16"/>` +
      `<circle class="secondary" cx="80" cy="126" r="4"/><circle class="secondary" cx="100" cy="126" r="4"/><circle class="secondary" cx="120" cy="126" r="4"/></g>`,
  },
  bolt: {
    group: "football",
    svg: `<g stroke-width="2"><polygon points="112,56 70,108 96,108 84,146 132,88 105,88 122,56"/></g>`,
  },
  tower: {
    group: "football",
    svg:
      `<g stroke-width="2">` +
      `<path d="M74,142 V86 H68 V62 H80 V72 H92 V62 H108 V72 H120 V62 H132 V86 H126 V142 Z"/>` +
      `<path class="pseudostroke" d="M91,142 V122 a9,9 0 0 1 18,0 V142 Z"/>` +
      `<rect class="pseudostroke" x="95" y="92" width="10" height="14" rx="5"/></g>`,
  },
  star: {
    group: "football",
    svg: `<g stroke-width="2"><polygon points="${starPoints(100, 100, 44, 18)}"/></g>`,
  },
}

export function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? inner : outer
    const a = ((-90 + 36 * i) * Math.PI) / 180
    pts.push(`${r(cx + Math.cos(a) * rad)},${r(cy + Math.sin(a) * rad)}`)
  }
  return pts.join(" ")
}

export const CHARGES: Record<string, Charge> = {
  ...OWN_CHARGES,
  ...(ARMORIA_CHARGES as Record<string, Charge>),
}

export const CHARGE_GROUPS: ChargeGroup[] = ["football", "stars", "crosses", "symbols", "objects"]

export function chargesInGroup(group: ChargeGroup): string[] {
  return Object.keys(CHARGES).filter((id) => CHARGES[id].group === group)
}
