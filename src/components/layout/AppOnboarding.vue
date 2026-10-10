<script setup lang="ts">
/**
 * First-launch walkthrough: three short slides, swipeable, then out of the way
 * for good (settings.onboardingSeen). Deliberately not a route, so there is
 * nothing to deep-link into and the back button leaves the app like on any
 * root page.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Play, Trophy, Users } from "@lucide/vue"
import { AppButton, AppIcon, AppSwipeView } from "@/components/ui"
import { useSettingsStore } from "@/modules/settings/store"

const { t } = useI18n()
const settings = useSettingsStore()

const ICONS = { build: Trophy, squad: Users, play: Play } as const
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
          <div class="ob-slide">
            <span class="ob-badge"><AppIcon :icon="ICONS[tab]" size="xl" /></span>
            <h1 class="ob-title">{{ t(`onboarding.${tab}.title`) }}</h1>
            <p class="ob-desc">{{ t(`onboarding.${tab}.desc`) }}</p>
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
  gap: var(--sp-4);
  text-align: center;
}

.ob-badge {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-subtle);
  color: var(--accent);
  margin-bottom: var(--sp-2);
}

.ob-title {
  font-family: var(--font);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
}

.ob-desc {
  font-size: var(--fs-md);
  line-height: 1.5;
  color: var(--text-muted);
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
</style>
