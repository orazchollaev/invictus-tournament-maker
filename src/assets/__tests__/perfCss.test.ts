// Regression guard for Android WebView paint cost. A performance trace showed
// ~3.6s of Rendering+Painting in 20s of play, traced to blurred translucent
// layers over scrolling content and a never-ending header repaint. These are
// cheap to reintroduce by accident, so the rule is checked at the source.
import { describe, expect, it } from "vitest"

const sources = import.meta.glob(["../../**/*.vue", "../../**/*.css"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

describe("paint-cost guard", () => {
  it("scans a meaningful number of files", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
  })

  it("uses no backdrop-filter blur anywhere", () => {
    const offenders = Object.entries(sources)
      .filter(([, src]) => /backdrop-filter:\s*(?!none)/.test(src))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })

  it("keeps the sticky header's brand name static", () => {
    const header = Object.entries(sources).find(([p]) => p.endsWith("layout/AppHeader.vue"))?.[1]
    expect(header).toBeDefined()
    expect(header).not.toMatch(/animation:\s*shine/)
    expect(header).not.toMatch(/@keyframes\s+shine/)
    expect(header).not.toMatch(/filter:\s*drop-shadow/)
  })
})
