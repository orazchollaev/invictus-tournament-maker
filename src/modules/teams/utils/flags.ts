// src/modules/settings/composables/useDataManagement.ts.

const raws = import.meta.glob("../../../node_modules/circle-flags/flags/*.svg", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>

const loaders: Record<string, () => Promise<string>> = {}
for (const path in raws) {
  const code = path.split("/").pop()!.replace(".svg", "").toLowerCase()
  loaders[code] = raws[path]
}

const svgCache = new Map<string, string>()

export async function flagSvg(code: string): Promise<string | undefined> {
  const key = code.toLowerCase()
  if (svgCache.has(key)) return svgCache.get(key)

  const loader = loaders[key]
  if (!loader) return undefined

  try {
    const svg = await loader()
    svgCache.set(key, svg)
    return svg
  } catch (e) {
    console.error(`Failed to load flag: ${code}`, e)
    return undefined
  }
}

export async function flagDataUrl(code: string): Promise<string | undefined> {
  const svg = await flagSvg(code)
  return svg ? "data:image/svg+xml;utf8," + encodeURIComponent(svg) : undefined
}

export function hasFlag(code: string | undefined | null): boolean {
  return !!code && code.toLowerCase() in loaders
}

const colorCache = new Map<string, string | undefined>()

/**
 * Extract the flag's dominant ("primary") color by rasterizing the SVG to a
 * small canvas and histogramming pixels inside the circular mask. Attribute
 * heuristics (first full-canvas rect) are unreliable — e.g. Japan's first full
 * rect is its white background, not the red disc — so we sample real pixels.
 */
export async function flagPrimaryColor(code: string): Promise<string | undefined> {
  const key = code.toLowerCase()
  if (colorCache.has(key)) return colorCache.get(key)

  const url = await flagDataUrl(key)
  if (!url) {
    colorCache.set(key, undefined)
    return undefined
  }

  const color = await rasterizeAndPick(url)
  colorCache.set(key, color)
  return color
}

function rasterizeAndPick(url: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const N = 32
      const canvas = document.createElement("canvas")
      canvas.width = N
      canvas.height = N
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) return resolve(undefined)
      ctx.drawImage(img, 0, 0, N, N)

      let data: Uint8ClampedArray
      try {
        data = ctx.getImageData(0, 0, N, N).data
      } catch {
        return resolve(undefined)
      }

      // Per bucket: `score` is the saturation/neutrality-weighted vote used to
      // pick the winner; `n`, `r`, `g`, `b` are raw pixel count + channel sums
      // used to average the winner into a clean hex.
      type Bucket = { score: number; n: number; r: number; g: number; b: number }
      const counts = new Map<number, Bucket>()
      const cx = (N - 1) / 2
      const cy = (N - 1) / 2
      const radius = N / 2

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const dx = x - cx
          const dy = y - cy
          if (dx * dx + dy * dy > radius * radius) continue // outside circle

          const i = (y * N + x) * 4
          if (data[i + 3] < 200) continue // transparent

          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          // Down-weight near-white/near-black so they only win if the flag
          // truly is mostly that; boost saturated colors.
          let weight = 1
          if (min > 235)
            weight = 0.15 // near-white
          else if (max < 25)
            weight = 0.2 // near-black
          else weight += (max - min) / 255

          const bucket = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
          const entry = counts.get(bucket)
          if (entry) {
            entry.score += weight
            entry.n += 1
            entry.r += r
            entry.g += g
            entry.b += b
          } else {
            counts.set(bucket, { score: weight, n: 1, r, g, b })
          }
        }
      }

      let best: Bucket | undefined
      for (const entry of counts.values()) {
        if (!best || entry.score > best.score) best = entry
      }
      if (!best) return resolve(undefined)

      const r = Math.round(best.r / best.n)
      const g = Math.round(best.g / best.n)
      const b = Math.round(best.b / best.n)
      resolve(toHex(r, g, b))
    }
    img.onerror = () => resolve(undefined)
    img.src = url
  })
}

function toHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}
