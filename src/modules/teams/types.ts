export interface Team {
  id: string
  name: string
  abbr?: string // optional, max 7 chars; auto-generated from name if absent
  color: string
  flag?: string // ISO 3166-1 alpha-2 country code, optional
  image?: string // custom crest: remote URL or data-URL, mutually exclusive with flag
  power: number // 1-100
  /**
   * The manager on the touchline. Optional forever: a team without one plays
   * exactly as it did before coaches existed — see engine/tactics.ts, where
   * every helper returns a neutral profile for an absent coach.
   */
  coach?: Coach
}

// ─── Coach ───────────────────────────────────────────────────────
// The shape a side lines up in. Names are the ones a fan would use; the
// positional skeleton each maps to lives in engine/tactics.ts.
export type Formation =
  "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "3-4-3" | "5-3-2" | "5-4-1" | "4-5-1"

/** How the side is told to play, independent of the shape it lines up in. */
export type PlayStyle = "attacking" | "balanced" | "defensive"

export interface Coach {
  name: string
  formation: Formation
  style: PlayStyle
  power: number // 1-99
}

// Minimal team-shaped display data (e.g. a stat row not backed by a live Team record)
export interface TeamLike {
  name: string
  color: string
  abbr?: string
  flag?: string
  image?: string
}
