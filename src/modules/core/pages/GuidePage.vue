<script setup lang="ts">
import { useRouter } from "vue-router"
import { ArrowLeft, Users, Trophy, Play, BarChart3, History, Settings } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const router = useRouter()

const STEPS = [
  { key: "teams", icon: Users },
  { key: "create", icon: Trophy },
  { key: "play", icon: Play },
  { key: "simulate", icon: BarChart3 },
  { key: "seasons", icon: History },
  { key: "settings", icon: Settings },
] as const
</script>

<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="14" />
        {{ t("common.back") }}
      </button>
      <h2>{{ t("guide.title") }}</h2>
    </div>

    <p class="intro">{{ t("guide.intro") }}</p>

    <ol class="steps">
      <li v-for="(step, i) in STEPS" :key="step.key" class="step">
        <div class="step-num">{{ i + 1 }}</div>
        <div class="step-body">
          <div class="step-title">
            <component :is="step.icon" :size="16" class="step-icon" />
            {{ t(`guide.steps.${step.key}.title`) }}
          </div>
          <p class="step-desc">{{ t(`guide.steps.${step.key}.desc`) }}</p>
        </div>
      </li>
    </ol>

    <p class="outro">{{ t("guide.outro") }}</p>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.page-header h2 {
  margin: 0;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}
.back-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.intro {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0 0 20px;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.step {
  display: flex;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 16px;
}
.step-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
}
.step-body {
  min-width: 0;
}
.step-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}
.step-icon {
  flex-shrink: 0;
  color: var(--accent);
}
.step-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
}

.outro {
  margin: 20px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
