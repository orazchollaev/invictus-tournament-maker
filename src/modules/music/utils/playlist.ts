// modules/music/utils/playlist.ts
//
// Which track comes next. Pure, so the ordering rules can be tested without
// an <audio> element anywhere in sight.
import type { MusicTrack } from "../types"

/** The track after `currentId`, wrapping at the end. */
export function nextTrackId(tracks: MusicTrack[], currentId: string | null): string | null {
  return step(tracks, currentId, 1)
}

/** The track before `currentId`, wrapping at the start. */
export function previousTrackId(tracks: MusicTrack[], currentId: string | null): string | null {
  return step(tracks, currentId, -1)
}

function step(tracks: MusicTrack[], currentId: string | null, by: 1 | -1): string | null {
  if (!tracks.length) return null
  const index = tracks.findIndex((track) => track.id === currentId)
  if (index < 0) return tracks[0].id
  return tracks[(index + by + tracks.length) % tracks.length].id
}

/**
 * A shuffled play order that never repeats a track until every other one has
 * had a turn, and never opens on the track that was just playing — the one
 * thing a plain shuffle does that sounds like a bug.
 */
export function shuffleOrder(
  tracks: MusicTrack[],
  currentId: string | null,
  rng: () => number = Math.random
): string[] {
  const ids = tracks.map((track) => track.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  if (ids.length > 1 && ids[0] === currentId) {
    ;[ids[0], ids[1]] = [ids[1], ids[0]]
  }
  return ids
}

/** The track a stored id should resolve to, falling back to the first available. */
export function resolveTrack(tracks: MusicTrack[], id: string | null): MusicTrack | null {
  if (!tracks.length) return null
  return tracks.find((track) => track.id === id) ?? tracks[0]
}
