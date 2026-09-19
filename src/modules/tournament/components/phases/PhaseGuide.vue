<script setup lang="ts">
/**
 * The walkthrough that opens with the blueprint editor the first time.
 *
 * Every other screen in the app is a form: a field, a stepper, a pick from a
 * list. This one asks the user to drag a wire between two boxes, which nothing
 * else in the app has taught them, so it says so plainly once and then gets out
 * of the way. Dismissing it is remembered (settings.phasesGuideSeen); the header
 * keeps a way back in.
 */
import { useI18n } from "vue-i18n"
import { MousePointerClick, Plus, Flag, Route } from "@lucide/vue"
import { AppButton } from "@/components/ui"

const emit = defineEmits<{ dismiss: [] }>()

const { t } = useI18n()

/** Four steps, in the order the user has to do them. */
const STEPS = [
  { icon: Plus, key: "add" },
  { icon: Route, key: "connect" },
  { icon: MousePointerClick, key: "configure" },
  { icon: Flag, key: "final" },
] as const
</script>

<template>
  <div class="phase-guide">
    <p class="phase-guide-lead">{{ t("tournament.phases.guide.lead") }}</p>

    <ol class="phase-guide-steps">
      <li v-for="(step, i) in STEPS" :key="step.key" class="phase-guide-step">
        <span class="phase-guide-num">{{ i + 1 }}</span>
        <component :is="step.icon" :size="15" class="phase-guide-icon" />
        <span class="phase-guide-text">
          {{ t(`tournament.phases.guide.${step.key}`) }}
        </span>
      </li>
    </ol>

    <p class="phase-guide-example">{{ t("tournament.phases.guide.example") }}</p>

    <AppButton size="xs" variant="filled" @click="emit('dismiss')">
      {{ t("tournament.phases.guide.dismiss") }}
    </AppButton>
  </div>
</template>

<style scoped src="./phases.css"></style>
