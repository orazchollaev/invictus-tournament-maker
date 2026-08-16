<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Check, FastForward, History, Pause, Play } from "@lucide/vue"
import { AppButton, AppIcon, BtnGroup } from "@/components/ui"
import type { CeremonyPhase, CeremonySpeed } from "../../composables/useDrawCeremony"

defineProps<{
  phase: CeremonyPhase
  canStart: boolean
  paused: boolean
  /** Only offered when the tournament has a previous season to reuse. */
  hasPreviousDraw: boolean
}>()

const emit = defineEmits<{
  start: []
  cancel: []
  useOldDraw: []
  skip: []
  togglePause: []
  complete: []
}>()

const speed = defineModel<CeremonySpeed>("speed", { required: true })

const { t } = useI18n()

const speedOptions = computed(() => [
  { value: "normal", label: t("drawCeremony.speedNormal") },
  { value: "fast", label: t("drawCeremony.speedFast") },
])
</script>

<template>
  <footer class="dc-footer">
    <template v-if="phase === 'pots'">
      <AppButton variant="filled" :disabled="!canStart" @click="emit('start')">
        <AppIcon :icon="Play" />
        {{ t("drawCeremony.startDraw") }}
      </AppButton>
      <AppButton @click="emit('cancel')">{{ t("common.cancel") }}</AppButton>
      <AppButton v-if="hasPreviousDraw" class="dc-push-right" @click="emit('useOldDraw')">
        <AppIcon :icon="History" size="sm" />
        {{ t("drawCeremony.useOldDraw") }}
      </AppButton>
    </template>

    <template v-else-if="phase === 'drawing'">
      <AppButton @click="emit('skip')">
        <AppIcon :icon="FastForward" />
        {{ t("drawCeremony.skipDraw") }}
      </AppButton>
      <AppButton @click="emit('togglePause')">
        <AppIcon :icon="paused ? Play : Pause" />
        {{ paused ? t("drawCeremony.resumeDraw") : t("drawCeremony.pauseDraw") }}
      </AppButton>
      <div class="dc-speed dc-push-right">
        <span class="dc-speed-label">{{ t("drawCeremony.speed") }}</span>
        <BtnGroup
          :model-value="speed"
          size="xs"
          :options="speedOptions"
          @update:model-value="(v) => (speed = v as CeremonySpeed)"
        />
      </div>
    </template>

    <template v-else>
      <AppButton variant="filled" @click="$emit('complete')">
        <AppIcon :icon="Check" />
        {{ t("drawCeremony.continue") }}
      </AppButton>
    </template>
  </footer>
</template>

<style scoped>
.dc-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-light);
  background: var(--bg);
  flex-shrink: 0;
}

/* Pushes the trailing control away from the primary actions. */
.dc-push-right {
  margin-left: auto;
}

.dc-speed {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.dc-speed-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  margin-right: 2px;
}

@media (max-width: 600px) {
  .dc-footer {
    flex-wrap: wrap-reverse;
    padding-bottom: calc(var(--sp-3) + var(--safe-bottom));
  }
  .dc-push-right {
    margin-left: 0;
    width: 100%;
  }
}
</style>
