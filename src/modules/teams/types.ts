export interface Team {
  id: string
  name: string
  abbr?: string // optional, max 7 chars; auto-generated from name if absent
  color: string
  flag?: string // ISO 3166-1 alpha-2 country code, optional
  power: number // 1-100
}

// Minimal team-shaped display data (e.g. a stat row not backed by a live Team record)
export interface TeamLike {
  name: string
  color: string
  abbr?: string
  flag?: string
}
