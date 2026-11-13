<script setup lang="ts">
import { computed, ref, type Component } from "vue"
import { useRouter } from "vue-router"
import { Trophy, Users, UserRound, History, Settings } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useNavActive } from "@/composables/useNavActive"

const { t } = useI18n()
const router = useRouter()
const { isNavActive } = useNavActive()

const items: { to: string; also?: string[]; icon: Component; label: () => string }[] = [
  { to: "/tournaments", icon: Trophy, label: () => t("nav.tournaments") },
  { to: "/teams", icon: Users, label: () => t("nav.teams") },
  { to: "/players", icon: UserRound, label: () => t("nav.players") },
  { to: "/history", icon: History, label: () => t("nav.history") },
  { to: "/settings", also: ["/market"], icon: Settings, label: () => t("nav.settings") },
]

const navEl = ref<HTMLElement | null>(null)
const activeIndex = computed(() =>
  items.findIndex((i) => isNavActive(i.to) || i.also?.some(isNavActive))
)
/** Fractional tab position while a finger drags the glass lens; null at rest. */
const dragPos = ref<number | null>(null)
const dragging = ref(false)
/** Horizontal speed squashes and stretches the lens like a drop of liquid. */
const stretch = ref(0)
let startX = 0
let lastX = 0
let lastT = 0
let pressed = false
let suppressClick = false

const pos = computed(() => dragPos.value ?? Math.max(0, activeIndex.value))
const shownIndex = computed(() =>
  dragPos.value === null ? activeIndex.value : Math.round(dragPos.value)
)

function posFromX(clientX: number) {
  const el = navEl.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const w = (rect.width - 8) / items.length
  const f = (clientX - rect.left - 4) / w - 0.5
  return Math.min(items.length - 1, Math.max(0, f))
}

function onPointerDown(e: PointerEvent) {
  pressed = true
  dragging.value = false
  startX = e.clientX
  lastX = e.clientX
  lastT = e.timeStamp
}

/** Icons under the lens swell as if seen through a magnifying bubble. */
function iconScale(i: number) {
  const peak = dragging.value ? 0.45 : 0.14
  return 1 + peak * Math.max(0, 1 - Math.abs(pos.value - i))
}

function onPointerMove(e: PointerEvent) {
  if (!pressed) return
  if (!dragging.value) {
    if (Math.abs(e.clientX - startX) < 6) return
    dragging.value = true
    navEl.value?.setPointerCapture(e.pointerId)
  }
  const dt = Math.max(1, e.timeStamp - lastT)
  const v = Math.abs(e.clientX - lastX) / dt
  stretch.value = stretch.value * 0.6 + Math.min(0.3, v * 0.14) * 0.4
  lastX = e.clientX
  lastT = e.timeStamp
  dragPos.value = posFromX(e.clientX)
}

function endDrag() {
  pressed = false
  if (!dragging.value) return
  const idx = Math.round(dragPos.value ?? activeIndex.value)
  dragging.value = false
  dragPos.value = null
  stretch.value = 0
  suppressClick = true
  setTimeout(() => (suppressClick = false), 0)
  const target = items[idx]
  if (target && idx !== activeIndex.value) router.push(target.to)
}

function onClickCapture(e: MouseEvent) {
  if (suppressClick) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <nav
    ref="navEl"
    class="mobile-nav"
    :class="{ 'is-dragging': dragging }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @click.capture="onClickCapture"
  >
    <span
      v-if="activeIndex >= 0 || dragging"
      class="mobile-nav-lens"
      :style="{
        '--i': pos,
        '--n': items.length,
        '--sx': dragging ? 1.22 + stretch : 1,
        '--sy': dragging ? 1.3 - stretch * 0.5 : 1,
      }"
      aria-hidden="true"
    />
    <RouterLink
      v-for="(item, i) in items"
      :key="item.to"
      :to="item.to"
      :aria-label="item.label()"
      :title="item.label()"
      class="mobile-nav-item"
      :class="{ 'router-link-active': i === shownIndex }"
      draggable="false"
    >
      <component
        :is="item.icon"
        :size="20"
        class="mobile-nav-icon"
        :style="{ transform: `scale(${iconScale(i)})` }"
      />
    </RouterLink>
  </nav>
</template>

<style scoped>
@media all {
  /* iOS 26 style liquid glass: a blurred, saturated, translucent capsule with
     a bright specular rim. A glass lens sits under the active icon and can be
     dragged across the bar; it springs to the nearest tab on release. */
  .mobile-nav {
    display: flex;
    position: fixed;
    left: calc(var(--safe-left) + var(--sp-3));
    right: calc(var(--safe-right) + var(--sp-3));
    bottom: calc(var(--safe-bottom) + var(--mobile-nav-gap));
    z-index: var(--z-mobile-nav);
    height: var(--mobile-nav-height);
    padding: 4px;
    border: 0.5px solid color-mix(in srgb, var(--text) 12%, transparent);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--surface) 55%, transparent);
    -webkit-backdrop-filter: blur(22px) saturate(180%);
    backdrop-filter: blur(22px) saturate(180%);
    box-shadow:
      0 8px 28px rgba(0, 0, 0, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -1px 0 rgba(255, 255, 255, 0.08);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .mobile-nav-lens {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--n));
    transform: translateX(calc(var(--i) * 100%)) scale(var(--sx, 1), var(--sy, 1));
    border-radius: var(--radius-pill);
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.12), transparent 55%),
      color-mix(in srgb, var(--text) 6%, transparent);
    -webkit-backdrop-filter: saturate(1.6) blur(2px);
    backdrop-filter: saturate(1.6) blur(2px);
    border: 0.5px solid color-mix(in srgb, var(--text) 14%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      inset 0 -1px 3px rgba(255, 255, 255, 0.06),
      0 3px 12px rgba(0, 0, 0, 0.16);
    transition:
      transform 560ms cubic-bezier(0.3, 1.9, 0.45, 1),
      box-shadow 240ms ease;
    pointer-events: none;
  }

  .mobile-nav.is-dragging .mobile-nav-lens {
    transition:
      transform 90ms ease-out,
      box-shadow 240ms ease;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.34),
      inset 0 -1px 4px rgba(255, 255, 255, 0.08),
      0 8px 22px rgba(0, 0, 0, 0.24);
  }

  .mobile-nav-item {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    color: var(--text-muted);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: color var(--dur-fast) var(--ease);
  }

  .mobile-nav-item:hover {
    text-decoration: none;
  }

  .mobile-nav-item.router-link-active {
    color: var(--accent);
  }

  .mobile-nav-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    stroke-width: 1.9;
    pointer-events: none;
    transition: transform 560ms cubic-bezier(0.3, 1.9, 0.45, 1);
  }

  [data-theme="dark"] .mobile-nav {
    background: color-mix(in srgb, var(--surface) 45%, transparent);
    box-shadow:
      0 8px 28px rgba(0, 0, 0, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.12),
      inset 0 -1px 0 rgba(255, 255, 255, 0.04);
  }

  [data-theme="dark"] .mobile-nav-lens {
    background:
      radial-gradient(120% 90% at 50% 0%, rgba(255, 255, 255, 0.07), transparent 55%),
      color-mix(in srgb, var(--text) 7%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.16),
      0 3px 12px rgba(0, 0, 0, 0.4);
  }

  .mobile-nav.is-dragging .mobile-nav-icon {
    transition: transform 90ms ease-out;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-lens,
  .mobile-nav-icon {
    transition: none !important;
  }
}
</style>
