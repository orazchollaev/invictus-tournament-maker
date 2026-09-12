// The one audio element, and everything that decides what it is playing.
//
// A module-level singleton rather than per-component state — the same shape
// as composables/useDialog.ts — because the player has to survive every
// navigation and there must never be two of them fighting over the volume.
import { computed, ref, watch } from "vue"
import { useMusicStore } from "../store"
import { BUILT_IN_TRACK_ID, BUILT_IN_TRACK_URL } from "../constants"
import { loadTrackBlob } from "../services/trackStorage"
import { nextTrackId, resolveTrack, shuffleOrder } from "../utils/playlist"

let audio: HTMLAudioElement | null = null
let objectUrl: string | null = null
/** A shuffled running order, consumed one track at a time. */
let order: string[] = []

const playing = ref(false)
/**
 * True when the browser refused to start without a gesture. Not an error the
 * user needs to see — the first tap anywhere starts the music instead.
 */
const blocked = ref(false)
/** Set when the chosen track will not load at all (the built-in file is absent). */
const missing = ref(false)

let unblockListener: (() => void) | null = null

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = "auto"
  }
  return audio
}

function releaseUrl() {
  if (!objectUrl) return
  URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

/** Wait for one real interaction, then try again. Registered at most once. */
function retryOnGesture(attempt: () => void) {
  if (unblockListener) return
  const handler = () => {
    unblockListener?.()
    unblockListener = null
    attempt()
  }
  document.addEventListener("pointerdown", handler, { once: true })
  document.addEventListener("keydown", handler, { once: true })
  unblockListener = () => {
    document.removeEventListener("pointerdown", handler)
    document.removeEventListener("keydown", handler)
  }
}

export function useMusicPlayer() {
  const store = useMusicStore()

  const track = computed(() => resolveTrack(store.allTracks(), store.currentTrackId))

  async function sourceFor(id: string): Promise<string | null> {
    if (id === BUILT_IN_TRACK_ID) return BUILT_IN_TRACK_URL
    const blob = await loadTrackBlob(id)
    if (!blob) return null
    releaseUrl()
    objectUrl = URL.createObjectURL(blob)
    return objectUrl
  }

  async function load(): Promise<void> {
    const current = track.value
    if (!current) {
      stop()
      return
    }
    const src = await sourceFor(current.id)
    if (!src) {
      missing.value = true
      // A built-in file that was never added should not stop the uploads from
      // playing; anything else available takes over.
      const fallback = nextTrackId(store.allTracks(), current.id)
      if (fallback && fallback !== current.id) store.currentTrackId = fallback
      return
    }
    missing.value = false
    const el = element()
    el.src = src
    el.loop = store.loop
    el.volume = store.volume / 100
  }

  function play(): void {
    const el = element()
    el.volume = store.volume / 100
    el.loop = store.loop
    el.play()
      .then(() => {
        playing.value = true
        blocked.value = false
      })
      .catch(() => {
        // Autoplay policy, almost always. Nothing is broken; it just needs a
        // tap first, which the listener below waits for.
        playing.value = false
        blocked.value = true
        retryOnGesture(play)
      })
  }

  function stop(): void {
    playing.value = false
    audio?.pause()
  }

  /** The track finished and looping is off: move on. */
  function advance(): void {
    const tracks = store.allTracks()
    if (tracks.length <= 1) return

    if (store.shuffle) {
      if (!order.length) order = shuffleOrder(tracks, store.currentTrackId)
      const nextId = order.shift()
      if (nextId) store.currentTrackId = nextId
      return
    }

    const nextId = nextTrackId(tracks, store.currentTrackId)
    if (nextId) store.currentTrackId = nextId
  }

  /**
   * Wire the element up and keep it in step with the settings. Called once,
   * by the controller mounted in App.vue.
   */
  function init(): void {
    const el = element()
    el.addEventListener("ended", () => {
      if (store.loop) return
      advance()
    })

    watch(
      () => store.volume,
      (value) => {
        el.volume = value / 100
      },
      { immediate: true }
    )

    watch(
      () => store.loop,
      (value) => {
        el.loop = value
      },
      { immediate: true }
    )

    watch(
      [() => store.enabled, () => store.currentTrackId],
      async ([on]) => {
        if (!on) {
          stop()
          return
        }
        await load()
        if (store.enabled && !missing.value) play()
      },
      { immediate: true }
    )

    // A track being added or removed can leave the chosen one pointing at
    // nothing; resolveTrack falls back, and this puts the choice back in step.
    watch(
      () => store.uploads.length,
      () => {
        const current = track.value
        if (current && current.id !== store.currentTrackId) store.currentTrackId = current.id
        order = []
      }
    )
  }

  function dispose(): void {
    stop()
    unblockListener?.()
    unblockListener = null
    releaseUrl()
    audio = null
  }

  return { track, playing, blocked, missing, init, play, stop, advance, dispose }
}
