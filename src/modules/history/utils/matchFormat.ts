import type { Match } from "@/modules/tournament/types"

/**
 * Renders a final's scoreline winner-first, e.g. "3–1" or "1–1 (p: 4–2)".
 *
 * Two-legged ties are aggregated first. Note the leg-2 flip: in leg 2 the
 * original `homeId` plays away, so `leg2Result.away` are *its* goals and
 * `leg2Result.penAway` are *its* penalties.
 */
export function buildScore(fm: Match, winnerId: string | null): string {
  if (!fm.result) return "?"
  const winnerIsHome = fm.homeId === winnerId

  if (fm.leg2Result !== undefined && fm.leg2Result !== null) {
    const aggHome = fm.result.home + fm.leg2Result.away
    const aggAway = fm.result.away + fm.leg2Result.home
    const [w, l] = winnerIsHome ? [aggHome, aggAway] : [aggAway, aggHome]
    let pen = ""
    if (fm.leg2Result.penHome !== undefined && fm.leg2Result.penAway !== undefined) {
      const [pw, pl] = winnerIsHome
        ? [fm.leg2Result.penAway, fm.leg2Result.penHome]
        : [fm.leg2Result.penHome, fm.leg2Result.penAway]
      pen = ` (p: ${pw}–${pl})`
    }
    return `${w}–${l}${pen}`
  }

  const [w, l] = winnerIsHome ? [fm.result.home, fm.result.away] : [fm.result.away, fm.result.home]

  let pen = ""
  if (fm.result.penHome !== undefined && fm.result.penAway !== undefined) {
    const [pw, pl] = winnerIsHome
      ? [fm.result.penHome, fm.result.penAway]
      : [fm.result.penAway, fm.result.penHome]
    pen = ` (p: ${pw}–${pl})`
  }
  return `${w}–${l}${pen}`
}
