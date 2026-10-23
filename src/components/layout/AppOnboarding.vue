<script setup lang="ts">
/**
 * First-launch walkthrough: three short slides, swipeable, then out of the way
 * for good (settings.onboardingSeen). Deliberately not a route, so there is
 * nothing to deep-link into and the back button leaves the app like on any
 * root page.
 *
 * Each slide shows a small animation of the thing it describes. The animation
 * starts when its slide becomes the active one, not when it mounts — the swipe
 * view mounts the neighbours early, so mounting would play them off screen.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppSwipeView } from "@/components/ui"
import { useSettingsStore } from "@/modules/settings/store"
import { OnboardingBracket, OnboardingSquad, OnboardingTable } from "./onboarding"

const { t } = useI18n()
const settings = useSettingsStore()

const VISUALS = { build: OnboardingBracket, squad: OnboardingSquad, play: OnboardingTable } as const
const SLIDES = ["build", "squad", "play"] as const
type Slide = (typeof SLIDES)[number]

const current = ref<Slide>("build")
const index = computed(() => SLIDES.indexOf(current.value))
const isLast = computed(() => index.value === SLIDES.length - 1)

function finish() {
  settings.onboardingSeen = true
}

function next() {
  if (isLast.value) finish()
  else current.value = SLIDES[index.value + 1]
}
</script>

<template>
  <div class="ob" role="dialog" aria-modal="true" :aria-label="t('onboarding.label')">
    <div class="ob-top">
      <img src="/logo/invictus-logo.webp" alt="Invictus" class="ob-logo" />
      <AppButton
        variant="text"
        size="sm"
        class="ob-skip"
        :class="{ 'ob-skip--hidden': isLast }"
        :tabindex="isLast ? -1 : 0"
        @click="finish"
      >
        {{ t("onboarding.skip") }}
      </AppButton>
    </div>

    <div class="ob-stage">
      <AppSwipeView v-model="current" :tabs="SLIDES">
        <template #default="{ tab }">
          <div class="ob-slide" :class="{ 'ob-slide--on': tab === current }">
            <div class="ob-hero">
              <component :is="VISUALS[tab]" :active="tab === current" />
            </div>
            <div class="ob-copy">
              <h1 class="ob-title">{{ t(`onboarding.${tab}.title`) }}</h1>
              <p class="ob-desc">{{ t(`onboarding.${tab}.desc`) }}</p>
            </div>
          </div>
        </template>
      </AppSwipeView>
    </div>

    <div class="ob-bottom">
      <div class="ob-dots" aria-hidden="true">
        <span
          v-for="s in SLIDES"
          :key="s"
          class="ob-dot"
          :class="{ 'ob-dot--on': s === current }"
        />
      </div>
      <AppButton variant="filled" size="md" block @click="next">
        {{ isLast ? t("onboarding.start") : t("onboarding.next") }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.ob {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  padding: calc(var(--safe-top) + var(--sp-4)) var(--sp-5) calc(var(--safe-bottom) + var(--sp-5));
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
}

/* Two soft glows behind the content: the app's accent from the top, gold from
   below, so the screen has depth instead of a flat page. */
.ob::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(
      ellipse 80% 45% at 50% 0%,
      color-mix(in srgb, var(--accent) 22%, transparent),
      transparent 70%
    ),
    radial-gradient(
      ellipse 70% 35% at 50% 100%,
      color-mix(in srgb, var(--gold) 14%, transparent),
      transparent 70%
    );
  pointer-events: none;
}

.ob-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.ob-logo {
  height: 36px;
  width: auto;
  object-fit: contain;
  border-radius: 4px;
}

.ob-skip--hidden {
  visibility: hidden;
}

.ob-stage {
  flex: 1;
  min-height: 0;
}

.ob-slide {
  height: 100%;
  width: min(360px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-6);
  text-align: center;
}

.ob-hero {
  width: 100%;
  height: clamp(190px, 32vh, 250px);
  padding: var(--sp-4);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--surface) 85%, transparent);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--text) 10%, transparent);
}

.ob-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  opacity: 0;
  translate: 0 12px;
}
.ob-slide--on .ob-copy {
  animation: copy-in 0.5s var(--ease) 0.1s forwards;
}

.ob-title {
  font-family: var(--font);
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
}

.ob-desc {
  font-size: var(--fs-md);
  line-height: 1.5;
  color: var(--text-muted);
}

@keyframes copy-in {
  to {
    opacity: 1;
    translate: 0 0;
  }
}

.ob-bottom {
  width: min(360px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.ob-dots {
  display: flex;
  justify-content: center;
  gap: var(--sp-2);
}

.ob-dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  transition:
    width var(--dur) var(--ease),
    background var(--dur) var(--ease);
}

.ob-dot--on {
  width: 18px;
  background: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .ob-slide--on .ob-copy {
    animation-duration: 0.01s;
    animation-delay: 0s;
  }
}
</style>
