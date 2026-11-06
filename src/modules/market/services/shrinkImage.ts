import type { Team } from "@/modules/teams/types"
import { isDrawnCrest } from "@/modules/teams/utils/imageUtils"
import { IMAGE_SHRINK, MARKET_LIMITS } from "../constants"

/** Decodes `src`, centre-crops to a square and re-encodes it small and lossy. */
function shrink(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // A remote picture must allow canvas reads, or `toDataURL` throws below.
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const { size, quality } = IMAGE_SHRINK
        const side = Math.min(img.naturalWidth, img.naturalHeight)
        if (!side) return resolve(null)
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) return resolve(null)
        const sx = (img.naturalWidth - side) / 2
        const sy = (img.naturalHeight - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        // WebP keeps transparency at a fraction of PNG's size; browsers that
        // cannot encode it silently return PNG, so fall back to JPEG then.
        let out = canvas.toDataURL("image/webp", quality)
        if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", quality)
        resolve(out.length <= MARKET_LIMITS.maxImageChars ? out : null)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Low-quality copies of the teams' own pictures, keyed by team id. Teams with
 * a crest recipe, a flag, no picture, or a picture that cannot be read (a remote
 * URL without CORS) are simply left out.
 */
export async function shrinkTeamImages(teams: readonly Team[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  await Promise.all(
    teams.map(async (team) => {
      if (!team.image || team.crest || isDrawnCrest(team.image)) return
      const small = await shrink(team.image)
      if (small) out.set(team.id, small)
    })
  )
  return out
}
