import type { MusicTrack } from "./types"

/**
 * The track that ships with the app.
 *
 * The file itself is dropped in by hand — see public/music/. Its absence is
 * not an error: `useMusicPlayer` treats a track that will not load as one
 * that is simply not there, and moves on to whatever the user has uploaded.
 */
export const BUILT_IN_TRACK_ID = "builtin"
export const BUILT_IN_TRACK_URL = "music/theme.mp3"

export const BUILT_IN_TRACK: MusicTrack = {
  id: BUILT_IN_TRACK_ID,
  name: "Invictus Theme",
  source: "builtin",
  addedAt: 0,
}

/** Big enough for a long ambient loop, small enough not to bloat the database. */
export const MAX_TRACK_BYTES = 20 * 1024 * 1024

/** What the file picker accepts, and what an added file is checked against. */
export const ACCEPTED_AUDIO = "audio/*"

/** Quiet by default: this is something to play under a game, not over it. */
export const DEFAULT_VOLUME = 35
