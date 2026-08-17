export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD"

export interface Player {
  id: string
  teamId: string
  name: string
  position: PlayerPosition
  power: number // 1-99
}
