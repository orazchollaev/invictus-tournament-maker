<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import confetti from "canvas-confetti"
import { X, Play, FastForward, Check } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import type { CeremonyContext, Pot } from "@/engine"
import { useSettingsStore } from "@/modules/settings/store"
import { useDrawCeremony } from "../../composables/useDrawCeremony"
import PotEditor from "./PotEditor.vue"
import DrawStage from "./DrawStage.vue"

const props = defineProps<{
  title: string
  context: CeremonyContext
  teams: Team[]
  initialPots?: Pot[]
}>()

const emit = defineEmits<{ complete: [orderedIds: string[]]; cancel: [] }>()

const { t } = useI18n()
const settings = useSettingsStore()

const {
  pots,
  phase,
  speed,
  sequence,
  revealed,
  current,
  errors,
  canStart,
  progress,
  orderedIds,
  resetPots,
  start,
  skip,
} = useDrawCeremony(props.context, props.initialPots)

watch(phase, (p) => {
  if (p === "done" && settings.confettiOnWin) {
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, zIndex: 9999 })
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && phase.value !== "drawing") emit("cancel")
}

onMounted(() => {
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onKey)
})
onUnmounted(() => {
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onKey)
})

function complete() {
  emit("complete", [...orderedIds.value])
}
</script>

<template>
  <div class="dc-backdrop">
    <div class="dc-panel" role="dialog" aria-modal="true">
      <header class="dc-header">
        <span class="dc-title">{{ title }}</span>
        <button class="dc-close" :aria-label="t('common.cancel')" @click="emit('cancel')">
          <X :size="15" />
        </button>
      </header>

      <div class="dc-body">
        <PotEditor
          v-if="phase === 'pots'"
          :pots="pots"
          :teams="teams"
          :errors="errors"
          @reset="resetPots"
        />
        <template v-else>
          <div class="dc-progress">
            <div class="dc-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
          </div>
          <DrawStage :revealed="revealed" :current="current" :sequence="sequence" :teams="teams" />
        </template>
      </div>

      <footer class="dc-footer">
        <template v-if="phase === 'pots'">
          <button class="primary" :disabled="!canStart" @click="start">
            <Play :size="14" />
            {{ t("drawCeremony.startDraw") }}
          </button>
          <button @click="emit('cancel')">{{ t("common.cancel") }}</button>
        </template>

        <template v-else-if="phase === 'drawing'">
          <button @click="skip">
            <FastForward :size="14" />
            {{ t("drawCeremony.skipDraw") }}
          </button>
          <div class="dc-speed">
            <span class="dc-speed-label">{{ t("drawCeremony.speed") }}</span>
            <button
              class="dc-speed-btn"
              :class="{ active: speed === 'normal' }"
              @click="speed = 'normal'"
            >
              {{ t("drawCeremony.speedNormal") }}
            </button>
            <button
              class="dc-speed-btn"
              :class="{ active: speed === 'fast' }"
              @click="speed = 'fast'"
            >
              {{ t("drawCeremony.speedFast") }}
            </button>
          </div>
        </template>

        <template v-else>
          <button class="primary" @click="complete">
            <Check :size="14" />
            {{ t("drawCeremony.continue") }}
          </button>
        </template>
      </footer>
    </div>
  </div>
</template>

<style scoped>
@keyframes dc-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dc-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(20, 22, 28, 0.62);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: dc-backdrop-in 0.18s ease both;
}
.dc-panel {
  width: min(720px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  padding-top: env(safe-area-inset-top);
  animation: dc-panel-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.dc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.dc-title {
  font-family: var(--font);
  font-size: 15px;
  font-weight: 600;
}
.dc-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
}
.dc-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}
.dc-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}
.dc-progress {
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
.dc-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}
.dc-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-light);
  background: var(--bg);
  flex-shrink: 0;
}
.dc-speed {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.dc-speed-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: 2px;
}
.dc-speed-btn {
  font-size: 11px;
  padding: 3px 9px;
}
.dc-speed-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent-hover);
}

@media (max-width: 640px) {
  .dc-backdrop {
    padding: 0;
  }
  .dc-panel {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
    border: none;
  }
}
</style>
