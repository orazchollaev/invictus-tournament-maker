<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import BracketDoubleSide from "./BracketDoubleSide.vue"
import BracketClassic from "./BracketClassic.vue"
import BracketFullscreenModal from "./BracketFullscreenModal.vue"
import BracketZoomControls from "./BracketZoomControls.vue"
import BracketZoomHint from "./BracketZoomHint.vue"
import { AppButton, AppIcon } from "@/components/ui"
import { useSettingsStore } from "@/modules/settings/store"
import { useBracketActions } from "@/modules/tournament/composables/useBracketActions"
import { useBracketExport, canNativeShare } from "@/modules/tournament/composables/useBracketExport"
import { useBracketViewport } from "@/modules/tournament/composables/useBracketViewport"
import { useBracketZoomHint } from "@/modules/tournament/composables/useBracketZoomHint"
import { Download, Maximize2, Share2 } from "@lucide/vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  title?: string
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const bracketActions = useBracketActions(() => props.tournament.id)

const isMobileViewport = typeof window !== "undefined" && window.innerWidth <= 640

const activeBracket = computed(() => {
  const style = settings.bracketStyle
  if (style === "double-sided") return BracketDoubleSide
  if (style === "classic") return BracketClassic
  if (isMobileViewport) return BracketClassic
  const knockoutTeams = (props.tournament.rounds[0]?.matches.length ?? 0) * 2
  return knockoutTeams >= 17 ? BracketDoubleSide : BracketClassic
})

const zoomHint = useBracketZoomHint()

const showFullBracket = ref(false)

// The viewport is sized off the screen now, so a rotation changes how much
// room the bracket has and the old fit no longer matches it.
function refit() {
  nextTick(fitScreen)
}

onMounted(() => {
  nextTick(fitScreen)
  window.addEventListener("resize", refit)
})
onUnmounted(() => {
  window.removeEventListener("resize", refit)
})

const {
  wrapperRef,
  innerRef,
  zoom,
  isDragging,
  isZooming,
  transform,
  layerStyle,
  onMouseDown,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  zoomIn,
  zoomOut,
  fitScreen,
  reset,
  snapshot,
} = useBracketViewport({
  forceWillChange: () => settings.bracketQuality === "low",
})

const { isExporting, exportPng } = useBracketExport({
  root: innerRef,
  filename: () => `${props.tournament.name}-S${props.tournament.season}.png`,
  title: () => props.tournament.name,
  freezeView: () => {
    const restore = snapshot()
    reset()
    return restore
  },
})
</script>

<template>
  <div class="bracket-panel">
    <div class="bracket-header">
      <div class="bracket-header-right">
        <AppButton variant="outlined" size="xs" :disabled="isExporting" @click="exportPng">
          <AppIcon :icon="canNativeShare ? Share2 : Download" size="sm" />
          <span class="btn-label">
            {{ isExporting ? "…" : canNativeShare ? t("common.share") : "Export PNG" }}
          </span>
        </AppButton>

        <BracketZoomControls :zoom="zoom" @zoom-in="zoomIn" @zoom-out="zoomOut" @fit="fitScreen" />

        <AppButton variant="outlined" size="xs" @click="showFullBracket = true">
          <AppIcon :icon="Maximize2" size="sm" />
          <span class="btn-label">{{ t("teamSelector.fullView") }}</span>
        </AppButton>
      </div>
    </div>

    <div class="bracket-body">
      <div
        :ref="(el) => (wrapperRef = el as HTMLElement | null)"
        class="bracket-viewport bracket-wrapper swiper-no-swiping"
        :class="{ dragging: isDragging }"
        @mousedown="onMouseDown"
        @wheel.prevent="onWheel"
        @touchstart.passive="
          (e) => {
            zoomHint.dismiss()
            onTouchStart(e)
          }
        "
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          :ref="(el) => (innerRef = el as HTMLElement | null)"
          class="bracket-pan-layer"
          :class="{ zooming: isZooming, dragging: isDragging }"
          :style="{ transform, ...layerStyle }"
        >
          <component
            :is="activeBracket"
            :tournament="tournament"
            :teams="teams"
            :is-exporting="isExporting"
            v-bind="bracketActions"
          />
        </div>

        <BracketZoomHint :show="zoomHint.show.value" @dismiss="zoomHint.dismiss" />
      </div>
    </div>
  </div>

  <BracketFullscreenModal v-model:open="showFullBracket" :title="`${tournament.name} — Knockout`">
    <component
      :is="activeBracket"
      :tournament="tournament"
      :teams="teams"
      v-bind="bracketActions"
    />
  </BracketFullscreenModal>
</template>

<style scoped src="./bracket-viewport.css"></style>

<style scoped>
/* The tab panel hands down a fixed height; the viewport takes whatever the
   header and the sim toolbar leave, so the bracket sits centred in it. */
.bracket-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}
.bracket-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-inline-start: 0;
  padding-inline-end: 0;
  background: transparent;
}

.bracket-header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.bracket-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: var(--sp-2) 0;
}

.bracket-header,
.bracket-body > :not(.bracket-wrapper) {
  flex-shrink: 0;
}

.bracket-wrapper {
  flex: 1;
  min-height: 0;
}

@media (max-width: 600px) {
  :deep(.zoom-controls),
  .btn-label {
    display: none;
  }
}
</style>
