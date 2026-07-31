import { watchEffect, onUnmounted, type Ref } from "vue"
import type { Team } from "../types"

const FADE_MS = 500

/**
 * Washes the page background with the team's colour while its detail page
 * is open.
 *
 * It appends a fixed element to <body> rather than rendering one in the
 * page because the page itself scrolls and is clipped by its own
 * stacking context; the tint has to sit behind everything.
 */
export function useTeamColorOverlay(team: Ref<Team | undefined>) {
  let overlay: HTMLDivElement | null = null

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement("div")
      overlay.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:0;transition:opacity ${FADE_MS}ms ease;`
      document.body.appendChild(overlay)
    }
    return overlay
  }

  watchEffect(() => {
    if (!team.value) return
    const el = ensureOverlay()
    el.style.backgroundImage = `radial-gradient(circle, color-mix(in srgb, ${team.value.color} 16%, transparent), transparent)`
    requestAnimationFrame(() => {
      if (overlay) overlay.style.opacity = "1"
    })
  })

  onUnmounted(() => {
    if (!overlay) return
    const el = overlay
    overlay = null
    el.style.opacity = "0"
    setTimeout(() => el.remove(), FADE_MS)
  })
}
