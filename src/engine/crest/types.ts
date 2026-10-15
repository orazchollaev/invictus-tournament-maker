import type { SHIELD_PATHS } from "./shieldPaths"

export type CrestShape = keyof typeof SHIELD_PATHS

export type CrestPattern =
  | "plain"
  | "halves"
  | "perFess"
  | "perBend"
  | "quarterly"
  | "stripes"
  | "hoops"
  | "pale"
  | "sash"
  | "cross"
  | "saltire"
  | "chevron"
  | "chief"
  | "bordure"
  | "checky"
  | "gyronny"
  | "pile"

export type CrestEmblem =
  | { kind: "none" }
  | { kind: "charge"; id: string }
  /** Letters drawn on the field. Without `text`, the team's abbreviation. */
  | { kind: "monogram"; text?: string }

export type CrestFont = "sans" | "serif"

export type CrestSize = "sm" | "md" | "lg"

/** `sides` splits the year either side of the emblem; the rest are plain anchors. */
export type CrestPos = "center" | "top" | "bottom" | "left" | "right" | "sides"

export interface CrestPlacement {
  pos: CrestPos
  size: CrestSize
}

export type CrestPart = "emblem" | "year" | "stars" | "ribbon"

/**
 * Everything needed to redraw a crest. Stored on the team next to the rendered
 * image so the builder can reopen it; the image alone is what every other
 * screen shows.
 */
export interface CrestSpec {
  v: 1
  shape: CrestShape
  pattern: CrestPattern
  colors: {
    field: string
    pattern: string
    emblem: string
  }
  emblem: CrestEmblem
  /** 0-5 stars over the shield. */
  stars: number
  /** Team name on a banner across the foot of the shield. */
  ribbon: boolean
  /** Founding year, split either side of the emblem. Up to 4 digits. */
  year?: string
  font: CrestFont
  /** Thin inner border in the emblem colour. */
  trim: boolean
  /** Where each part sits and how big. Missing entries use the defaults — crests saved before this existed have none. */
  layout?: Partial<Record<CrestPart, Partial<CrestPlacement>>>
}

/** Team-derived text a crest can carry; kept out of the spec so a rename follows through. */
export interface CrestText {
  name: string
  abbr: string
}
