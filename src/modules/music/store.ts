import { defineStore } from "pinia"
import { ref } from "vue"
import { uid } from "@/engine"
import type { MusicTrack } from "./types"
import { BUILT_IN_TRACK, BUILT_IN_TRACK_ID, DEFAULT_VOLUME } from "./constants"
import { deleteTrackBlob, saveTrackBlob } from "./services/trackStorage"

/**
 * What the player is set to, and what it can play.
 *
 * Metadata only. The audio itself is one IndexedDB record per track — see
 * services/trackStorage.ts — because everything this store holds goes through
 * `JSON.stringify` on every change.
 */
export const useMusicStore = defineStore("music", () => {
  const enabled = ref(false)
  const volume = ref(DEFAULT_VOLUME)
  /** Play one track over and over, rather than moving on to the next. */
  const loop = ref(true)
  const shuffle = ref(false)
  const currentTrackId = ref<string>(BUILT_IN_TRACK_ID)
  /** Uploads only. The built-in track is prepended by `allTracks`. */
  const uploads = ref<MusicTrack[]>([])

  /** Everything the player can reach, built-in first. */
  function allTracks(): MusicTrack[] {
    return [BUILT_IN_TRACK, ...uploads.value]
  }

  async function addUpload(file: File): Promise<MusicTrack> {
    const track: MusicTrack = {
      id: uid(),
      name: file.name.replace(/\.[^.]+$/, ""),
      source: "upload",
      size: file.size,
      addedAt: Date.now(),
    }
    await saveTrackBlob(track.id, file)
    uploads.value.push(track)
    currentTrackId.value = track.id
    return track
  }

  async function removeUpload(id: string): Promise<void> {
    uploads.value = uploads.value.filter((track) => track.id !== id)
    await deleteTrackBlob(id)
    if (currentTrackId.value === id) {
      currentTrackId.value = uploads.value[0]?.id ?? BUILT_IN_TRACK_ID
    }
  }

  function rename(id: string, name: string): void {
    const track = uploads.value.find((item) => item.id === id)
    if (track && name.trim()) track.name = name.trim()
  }

  function resetAll() {
    enabled.value = false
    volume.value = DEFAULT_VOLUME
    loop.value = true
    shuffle.value = false
    currentTrackId.value = BUILT_IN_TRACK_ID
  }

  return {
    enabled,
    volume,
    loop,
    shuffle,
    currentTrackId,
    uploads,
    allTracks,
    addUpload,
    removeUpload,
    rename,
    resetAll,
  }
})
