export interface Team {
  id: string
  name: string
  abbr?: string // optional, max 7 chars; auto-generated from name if absent
  color: string
  power: number // 1-100
}
