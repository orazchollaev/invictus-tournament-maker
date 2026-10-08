import type { FaceConfig } from "@/lib/faces"

export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD"

export interface Player {
  id: string
  teamId: string
  name: string
  position: PlayerPosition
  power: number // 1-99
  number?: number // shirt number, 1-99
  image?: string // custom photo: remote URL or data-URL
  face?: FaceConfig // drawn face (facesjs); shown when there is no photo
}

export const PLAYER_POSITIONS: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]
