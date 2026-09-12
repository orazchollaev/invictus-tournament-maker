// modules/music/services/trackStorage.ts
//
// Where uploaded music actually lives.
//
// One IndexedDB record per track, exactly like tournament/services/
// persistence.ts and for the same reason: the store is serialised with
// JSON.stringify on every mutation, and a twenty-megabyte audio file has no
// business going through that. The store keeps the metadata; the bytes live
// here and are looked up by id.
import { del, get, set } from "idb-keyval"
import { MAX_TRACK_BYTES } from "../constants"

const TRACK_PREFIX = "music:track:"

function trackKey(id: string): string {
  return `${TRACK_PREFIX}${id}`
}

export type TrackRejection = "type" | "size"

/** Why a file cannot be added, or null when it can. */
export function rejectionFor(file: File): TrackRejection | null {
  if (!file.type.startsWith("audio/")) return "type"
  if (file.size > MAX_TRACK_BYTES) return "size"
  return null
}

export async function saveTrackBlob(id: string, file: Blob): Promise<void> {
  await set(trackKey(id), file)
}

export async function loadTrackBlob(id: string): Promise<Blob | null> {
  try {
    return (await get<Blob>(trackKey(id))) ?? null
  } catch {
    return null
  }
}

export async function deleteTrackBlob(id: string): Promise<void> {
  try {
    await del(trackKey(id))
  } catch {
    // A track the user has already removed from the list is gone either way.
  }
}
