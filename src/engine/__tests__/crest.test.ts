import { describe, expect, it } from "vitest"
import {
  CHARGES,
  CREST_PATTERNS,
  CREST_POSITIONS,
  CREST_SHAPES,
  CREST_SIZES,
  monogramText,
  placement,
  randomCrest,
  renderCrest,
  renderCrestDataUrl,
  type CrestSpec,
} from "../crest"
import { ARMORIA_CHARGES } from "../crest/armoriaCharges"
import { contrast } from "../crest/color"
import { fitShield } from "../crest/shields"
import { makeRng } from "../utils"

const text = { name: "Invictus FC", abbr: "INV" }

function spec(patch: Partial<CrestSpec> = {}): CrestSpec {
  return {
    v: 1,
    shape: "heater",
    pattern: "plain",
    colors: { field: "#c8102e", pattern: "#ffffff", emblem: "#f2c94c" },
    emblem: { kind: "charge", id: "ball" },
    stars: 0,
    ribbon: false,
    font: "sans",
    trim: false,
    ...patch,
  }
}

describe("crest shields", () => {
  it("fits every shape inside the shared frame", () => {
    for (const shape of CREST_SHAPES) {
      const { box } = fitShield(shape)
      expect(box.x).toBeGreaterThanOrEqual(21.9)
      expect(box.x + box.w).toBeLessThanOrEqual(178.1)
      expect(box.y).toBeGreaterThanOrEqual(19.9)
      expect(box.y + box.h).toBeLessThanOrEqual(200.1)
      expect(box.x + box.w / 2).toBeCloseTo(100, 5)
    }
  })
})

describe("crest charges", () => {
  // Armoria's detailed charges are CC BY-NC-SA. Only CC0 ones may ship, and
  // the generator refuses anything else — this guards a hand edit.
  it("ships no Armoria charge outside the CC0 groups", () => {
    for (const charge of Object.values(ARMORIA_CHARGES)) {
      expect(["stars", "crosses", "symbols", "objects"]).toContain(charge.group)
    }
    expect(CHARGES.lionRampant).toBeUndefined()
    expect(CHARGES.eagle).toBeUndefined()
  })
})

describe("renderCrest", () => {
  it("draws a well-formed svg for every shape and pattern", () => {
    for (const shape of CREST_SHAPES) {
      for (const pattern of CREST_PATTERNS) {
        const svg = renderCrest(spec({ shape, pattern }), text)
        expect(svg.startsWith("<svg")).toBe(true)
        expect(svg.endsWith("</svg>")).toBe(true)
        expect(svg).not.toContain("NaN")
        expect(svg).not.toContain("undefined")
      }
    }
  })

  it("draws every charge", () => {
    for (const id of Object.keys(CHARGES)) {
      const svg = renderCrest(spec({ emblem: { kind: "charge", id } }), text)
      expect(svg).toContain(CHARGES[id].svg)
    }
  })

  it("puts the team name on the ribbon, escaped", () => {
    const svg = renderCrest(spec({ ribbon: true }), { name: `A&B <"Utd">`, abbr: "AB" })
    expect(svg).toContain("A&#38;B &#60;&#34;UTD&#34;&#62;")
    expect(svg).not.toContain('<"UTD')
  })

  it("leaves the ribbon off when the team has no name yet", () => {
    const svg = renderCrest(spec({ ribbon: true }), { name: "  ", abbr: "" })
    expect(svg).not.toContain("textPath")
  })

  it("draws the requested number of stars, capped at five", () => {
    const stars = (n: number) =>
      renderCrest(spec({ stars: n }), text).match(/<polygon points="[^"]*" fill="#f2c94c"/g)
        ?.length ?? 0
    expect(stars(0)).toBe(0)
    expect(stars(3)).toBe(3)
    expect(stars(9)).toBe(5)
  })

  it("splits the founding year either side of the emblem", () => {
    const svg = renderCrest(spec({ year: "19a07" }), text)
    expect(svg).toContain(">19</text>")
    expect(svg).toContain(">07</text>")
  })

  it("sets the year under a monogram, which is too wide to flank", () => {
    const svg = renderCrest(spec({ emblem: { kind: "monogram" }, year: "1907" }), text)
    expect(svg).toContain(">1907</text>")
    expect(svg).not.toContain(">19</text>")
  })

  it("encodes as an svg data url", () => {
    expect(renderCrestDataUrl(spec(), text).startsWith("data:image/svg+xml;utf8,%3Csvg")).toBe(true)
  })
})

describe("crest layout", () => {
  const viewBoxOf = (svg: string) =>
    /viewBox="([^"]+)"/.exec(svg)![1].split(" ").map(Number) as [number, number, number, number]

  it("draws every position and size of every part", () => {
    for (const part of Object.keys(CREST_POSITIONS) as (keyof typeof CREST_POSITIONS)[]) {
      for (const pos of CREST_POSITIONS[part]) {
        for (const size of CREST_SIZES) {
          const svg = renderCrest(
            spec({ stars: 3, ribbon: true, year: "1905", layout: { [part]: { pos, size } } }),
            text
          )
          expect(svg.endsWith("</svg>")).toBe(true)
          expect(svg).not.toContain("NaN")
        }
      }
    }
  })

  it("falls back to defaults for unset or invalid placements", () => {
    expect(placement(spec(), "emblem")).toEqual({ pos: "center", size: "md" })
    expect(placement(spec({ layout: { ribbon: { pos: "left" } } }), "ribbon").pos).toBe("bottom")
    expect(placement(spec({ emblem: { kind: "monogram" } }), "year").pos).toBe("bottom")
    expect(placement(spec(), "year").pos).toBe("sides")
  })

  it("scales a part with its size", () => {
    const font = (size: "sm" | "md" | "lg") =>
      Number(
        /font-size="([\d.]+)"/.exec(
          renderCrest(spec({ emblem: { kind: "monogram" }, layout: { emblem: { size } } }), text)
        )![1]
      )
    expect(font("sm")).toBeLessThan(font("md"))
    expect(font("lg")).toBeGreaterThan(font("md"))
  })

  it("widens the view for stars beside the shield", () => {
    const plain = viewBoxOf(renderCrest(spec({ stars: 3 }), text))
    const left = viewBoxOf(
      renderCrest(spec({ stars: 3, layout: { stars: { pos: "left" } } }), text)
    )
    expect(left[0]).toBeLessThan(plain[0])
  })
})

describe("monogramText", () => {
  it("uses the abbreviation unless the crest overrides it", () => {
    expect(monogramText(spec({ emblem: { kind: "monogram" } }), text)).toBe("INV")
    expect(monogramText(spec({ emblem: { kind: "monogram", text: "gsfc1" } }), text)).toBe("GSFC")
  })
})

describe("randomCrest", () => {
  it("is reproducible for a seed", () => {
    expect(randomCrest(makeRng(42))).toEqual(randomCrest(makeRng(42)))
  })

  it("only picks things that exist", () => {
    const rng = makeRng(7)
    for (let i = 0; i < 300; i++) {
      const c = randomCrest(rng)
      expect(CREST_SHAPES).toContain(c.shape)
      expect(CREST_PATTERNS).toContain(c.pattern)
      if (c.emblem.kind === "charge") expect(CHARGES[c.emblem.id]).toBeDefined()
      expect(c.stars).toBeGreaterThanOrEqual(0)
      expect(c.stars).toBeLessThanOrEqual(5)
    }
  })

  it("keeps the emblem readable on the field", () => {
    const rng = makeRng(3)
    for (let i = 0; i < 300; i++) {
      const { field, emblem } = randomCrest(rng).colors
      expect(contrast(field, emblem)).toBeGreaterThanOrEqual(1.8)
    }
  })

  it("builds around a given team colour", () => {
    const c = randomCrest(makeRng(1), "#0b3d91")
    expect(c.colors.field).toBe("#0b3d91")
  })
})
