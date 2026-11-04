import type { CrestPart, CrestPlacement, CrestSpec } from "@/engine/crest/types"

// A shared crest is untrusted input that ends up inside SVG markup, so it is
// rebuilt field by field from what passes these checks. Colours go into
// attributes unescaped by the renderer, hence the strict hex test. Ids that are
// well-formed but unknown (a shape or charge this build lacks) are fine: the
// renderer falls back to its defaults for those.

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const ID = /^[a-z0-9_-]{1,40}$/i
const PARTS: CrestPart[] = ["emblem", "year", "stars", "ribbon"]
const POSITIONS = ["center", "top", "bottom", "left", "right", "sides"]
const SIZES = ["sm", "md", "lg"]

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

function parseLayout(raw: unknown): CrestSpec["layout"] | null {
  if (raw === undefined) return undefined
  if (!isObject(raw)) return null
  const out: NonNullable<CrestSpec["layout"]> = {}
  for (const [part, value] of Object.entries(raw)) {
    if (!PARTS.includes(part as CrestPart) || !isObject(value)) return null
    const entry: Partial<CrestPlacement> = {}
    if (value.pos !== undefined) {
      if (!POSITIONS.includes(value.pos as string)) return null
      entry.pos = value.pos as CrestPlacement["pos"]
    }
    if (value.size !== undefined) {
      if (!SIZES.includes(value.size as string)) return null
      entry.size = value.size as CrestPlacement["size"]
    }
    out[part as CrestPart] = entry
  }
  return out
}

function parseEmblem(raw: unknown): CrestSpec["emblem"] | null {
  if (!isObject(raw)) return null
  if (raw.kind === "none") return { kind: "none" }
  if (raw.kind === "charge") {
    return typeof raw.id === "string" && ID.test(raw.id) ? { kind: "charge", id: raw.id } : null
  }
  if (raw.kind === "monogram") {
    if (raw.text === undefined) return { kind: "monogram" }
    // The renderer escapes it and keeps 4 characters; this only bounds the input.
    return typeof raw.text === "string" && raw.text.length <= 8
      ? { kind: "monogram", text: raw.text }
      : null
  }
  return null
}

/** A clean copy of a crest spec, or null when it cannot be trusted. */
export function parseCrest(raw: unknown): CrestSpec | null {
  if (!isObject(raw) || raw.v !== 1) return null
  if (typeof raw.shape !== "string" || !ID.test(raw.shape)) return null
  if (typeof raw.pattern !== "string" || !ID.test(raw.pattern)) return null

  const colors = raw.colors
  if (!isObject(colors)) return null
  const { field, pattern, emblem: emblemColor } = colors
  if (![field, pattern, emblemColor].every((c) => typeof c === "string" && HEX.test(c))) {
    return null
  }

  const emblem = parseEmblem(raw.emblem)
  if (!emblem) return null

  const stars = raw.stars
  if (typeof stars !== "number" || !Number.isInteger(stars) || stars < 0 || stars > 5) return null
  if (typeof raw.ribbon !== "boolean" || typeof raw.trim !== "boolean") return null
  if (raw.font !== "sans" && raw.font !== "serif") return null
  if (raw.year !== undefined && (typeof raw.year !== "string" || !/^\d{0,4}$/.test(raw.year))) {
    return null
  }

  const layout = parseLayout(raw.layout)
  if (layout === null) return null

  const spec: CrestSpec = {
    v: 1,
    shape: raw.shape as CrestSpec["shape"],
    pattern: raw.pattern as CrestSpec["pattern"],
    colors: { field: field as string, pattern: pattern as string, emblem: emblemColor as string },
    emblem,
    stars,
    ribbon: raw.ribbon,
    font: raw.font,
    trim: raw.trim,
  }
  if (raw.year !== undefined) spec.year = raw.year as string
  if (layout) spec.layout = layout
  return spec
}
