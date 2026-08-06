/**
 * Team colours are the one colour in the app the user owns, so the UI leans
 * on them structurally — the winner tint on a match card, the identity bar in
 * a standings row, the strand colour in the bracket. That only works if the
 * colour is treated as untrusted input: it can be pure white, pure black, or
 * anything in between, and it still has to stay legible on both themes.
 *
 * Two rules cover every case:
 *   - text/icons drawn *on* a team fill pick their ink from the fill        → teamInk
 *   - a team fill drawn *on* a surface gets a hairline ring so a near-white
 *     kit does not vanish into a white card                                 → COLOR_RING
 */

/** WCAG relative luminance of a `#rrggbb` string. Returns null if unparseable. */
export function relativeLuminance(hex: string): number | null {
  const h = hex.trim().replace("#", "")
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Ink for text sitting directly on `hex`. The 0.45 threshold is above the
 * usual 0.5 midpoint on purpose: mid-tone kit colours (a medium red, a royal
 * blue) read better with white on them than with near-black.
 */
export function teamInk(hex: string | null | undefined): string {
  const l = hex ? relativeLuminance(hex) : null
  if (l === null) return "#ffffff"
  return l > 0.45 ? "#111827" : "#ffffff"
}

/**
 * Hairline ring for a team-colour fill. Drawn inset so it costs no layout,
 * and semi-transparent black so it darkens a white kit without muddying a
 * dark one. Matches the ring TeamBadge already puts on its dot.
 */
export const COLOR_RING = "inset 0 0 0 1px rgba(0, 0, 0, 0.18)"

/** Fallback for an unassigned slot — a TBD row still needs a bar to line up with. */
export const NO_TEAM_COLOR = "transparent"
