/** A track the player can loop. */
export interface MusicTrack {
  id: string
  name: string
  /**
   * "builtin" plays from a URL shipped with the app; "upload" plays from a
   * blob the user added, stored in IndexedDB under its own record.
   */
  source: "builtin" | "upload"
  /** Bytes. Absent for the built-in track, which is not stored by us. */
  size?: number
  addedAt: number
}
