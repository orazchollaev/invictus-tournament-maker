<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import BracketDoubleSide from "./BracketDoubleSide.vue"
import BracketClassic from "./BracketClassic.vue"
import FixtureView from "./FixtureView.vue"
import {
  BracketFullscreenModal,
  BracketSimToolbar,
  BracketZoomControls,
  BracketZoomHint,
} from "./bracket"
import { AppButton, AppIcon, SubTabBar } from "@/components/ui"
import { useTournamentStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import { useGradualSim } from "../composables/useGradualSim"
import { useBracketActions } from "../composables/useBracketActions"
import { useBracketExport, canNativeShare } from "../composables/useBracketExport"
import { useBracketViewport } from "../composables/useBracketViewport"
import { useBracketZoomHint } from "../composables/useBracketZoomHint"
import { useHaptic } from "@/composables/useHaptic"
import { useSwipe } from "@/composables/useSwipe"
import { Download, Maximize2, Share2 } from "@lucide/vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  title?: string
}>()

const { t } = useI18n()
const store = useTournamentStore()
const settings = useSettingsStore()
const { runSequential } = useGradualSim()
const { tap: hapticTap } = useHaptic()

const bracketActions = useBracketActions(() => props.tournament.id)

// ── Gradual simulation ────────────────────────────────────────
async function simRoundGradual(ri: number) {
  const round = props.tournament.rounds[ri]
  if (!round) return
  const cbs = round.matches
    .map((m, mi) => ({ m, mi }))
    // Pending single-leg match, or a double-leg one with leg 1 already
    // played (manually or otherwise) but leg 2 still open.
    .filter(({ m }) => m.homeId && m.awayId && (!m.result || m.leg2Result === null))
    .map(
      ({ mi }) =>
        () =>
          store.simulateBracketMatch(props.tournament.id, ri, mi)
    )
  await runSequential(cbs)
}

async function simAllGradual() {
  hapticTap()
  for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
    await simRoundGradual(ri)
  }
  const tp = props.tournament.thirdPlaceMatch
  const tpPending = tp && (!tp.result || tp.leg2Result === null)
  if (props.tournament.hasThirdPlace && tp && tp.homeId && tp.awayId && tpPending) {
    store.simulateThirdPlace(props.tournament.id)
  }
}

const thirdPlaceMatch = computed(() =>
  props.tournament.hasThirdPlace ? (props.tournament.thirdPlaceMatch ?? null) : null
)

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

const bracketView = ref<"bracket" | "fixtures">("bracket")
const showFullBracket = ref(false)

const mobileTabsRef = ref<HTMLElement | null>(null)
const fixtureWrapperRef = ref<HTMLElement | null>(null)

const swipeTabs = useSwipe(mobileTabsRef, {
  onSwipeLeft: () => (bracketView.value = "fixtures"),
  onSwipeRight: () => (bracketView.value = "bracket"),
})
const swipeFixtures = useSwipe(fixtureWrapperRef, {
  onSwipeRight: () => (bracketView.value = "bracket"),
})

// The pan layer is centered by CSS (bracket-viewport.css), so a raw pan(0,0)
// drops the viewport on whatever round happens to sit in the middle of a wide
// bracket — usually neither the first round nor the final. Fit-to-screen on
// first mount and every time the Bracket tab is switched back into so it
// always opens showing the whole thing instead of a random middle slice.
watch(bracketView, (v) => {
  if (v === "bracket") nextTick(fitScreen)
})

onMounted(() => {
  swipeTabs.mount()
  swipeFixtures.mount()
  nextTick(fitScreen)
})
onUnmounted(() => {
  swipeTabs.unmount()
  swipeFixtures.unmount()
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
      <SubTabBar
        :options="[
          { value: 'bracket', label: 'Bracket' },
          { value: 'fixtures', label: 'Fixtures' },
        ]"
        :model-value="bracketView"
        @update:model-value="(v) => (bracketView = v as 'bracket' | 'fixtures')"
      />

      <div class="bracket-header-right">
        <AppButton
          v-if="bracketView === 'bracket'"
          variant="outlined"
          size="xs"
          :disabled="isExporting"
          @click="exportPng"
        >
          <AppIcon :icon="canNativeShare ? Share2 : Download" size="sm" />
          <span class="btn-label">
            {{ isExporting ? "…" : canNativeShare ? t("common.share") : "Export PNG" }}
          </span>
        </AppButton>

        <BracketZoomControls
          v-if="bracketView === 'bracket'"
          :zoom="zoom"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @fit="fitScreen"
        />

        <AppButton variant="outlined" size="xs" @click="showFullBracket = true">
          <AppIcon :icon="Maximize2" size="sm" />
          <span class="btn-label">Full View</span>
        </AppButton>
      </div>
    </div>

    <div class="bracket-body">
      <BracketSimToolbar
        :rounds="tournament.rounds"
        :third-place-match="thirdPlaceMatch"
        @sim-all="simAllGradual"
        @sim-round="simRoundGradual"
        @sim-third-place="bracketActions.onSimThirdPlace"
      />

      <div
        v-if="bracketView === 'bracket'"
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

      <div v-else ref="fixtureWrapperRef">
        <FixtureView
          class="fixture-wrapper"
          :tournament="tournament"
          :teams="teams"
          v-bind="bracketActions"
        />
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

<style scoped src="./bracket/bracket-viewport.css"></style>

<style scoped>
.bracket-panel {
  min-width: 0;
}
.bracket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 0;
  padding-right: 0;
  background: transparent;
}

.bracket-header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.bracket-body {
  padding: var(--sp-2) 0;
}

.bracket-wrapper {
  height: clamp(360px, 68vh, 780px);
  min-height: 280px;
}

.fixture-wrapper {
}

@media (max-width: 640px) {
  :deep(.zoom-controls),
  .btn-label {
    display: none;
  }

  .bracket-wrapper {
    height: clamp(300px, 60vh, 600px);
  }
}
</style>
