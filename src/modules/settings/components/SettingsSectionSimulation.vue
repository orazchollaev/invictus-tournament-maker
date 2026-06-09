<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import BtnGroup from "@/components/BtnGroup.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const onOffOptions = computed(() => [
  { value: "on", label: t("common.on") },
  { value: "off", label: t("common.off") },
])

const formFactorVal = computed({
  get: () => (settings.formFactorEnabled ? "on" : "off"),
  set: (v: string) => {
    settings.formFactorEnabled = v === "on"
  },
})

const homeAdvantageLabel = computed(() => {
  const v = settings.homeAdvantage
  if (v === 0) return t("settings.simulation.homeAdvantage.neutral")
  if (v <= 4) return t("settings.simulation.homeAdvantage.slight")
  if (v <= 8) return t("settings.simulation.homeAdvantage.moderate")
  if (v <= 14) return t("settings.simulation.homeAdvantage.strong")
  return t("settings.simulation.homeAdvantage.dominant")
})

const surpriseFactorLabel = computed(() => {
  const v = settings.surpriseFactor
  if (v === 0) return t("settings.simulation.surpriseFactor.predictable")
  if (v === 100) return t("settings.simulation.surpriseFactor.pureLuck")
  if (v < 40) return t("settings.simulation.surpriseFactor.mostlySkill")
  if (v > 60) return t("settings.simulation.surpriseFactor.upsetHeavy")
  return t("settings.simulation.surpriseFactor.balanced")
})
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.simulation.title") }}</h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.simulation.homeAdvantage.label") }}</div>
          <div class="setting-desc">
            {{
              t("settings.simulation.homeAdvantage.desc", { zero: "0", default: "6", max: "20" })
            }}
          </div>
        </div>
        <div class="stepper-control">
          <span class="stepper-badge">{{ homeAdvantageLabel }}</span>
          <button
            class="stepper-btn"
            :disabled="settings.homeAdvantage <= 0"
            @click="settings.homeAdvantage = Math.max(0, settings.homeAdvantage - 1)"
          >
            −
          </button>
          <input
            v-model.number="settings.homeAdvantage"
            type="number"
            min="0"
            max="20"
            step="1"
            class="stepper-value"
            @change="settings.homeAdvantage = Math.max(0, Math.min(20, settings.homeAdvantage))"
          />
          <button
            class="stepper-btn"
            :disabled="settings.homeAdvantage >= 20"
            @click="settings.homeAdvantage = Math.min(20, settings.homeAdvantage + 1)"
          >
            +
          </button>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.simulation.surpriseFactor.label") }}</div>
          <div class="setting-desc">
            {{ t("settings.simulation.surpriseFactor.desc", { zero: "0", max: "100" }) }}
          </div>
        </div>
        <div class="stepper-control">
          <span class="stepper-badge">{{ surpriseFactorLabel }}</span>
          <button
            class="stepper-btn"
            :disabled="settings.surpriseFactor <= 0"
            @click="settings.surpriseFactor = Math.max(0, settings.surpriseFactor - 5)"
          >
            −
          </button>
          <input
            v-model.number="settings.surpriseFactor"
            type="number"
            min="0"
            max="100"
            step="5"
            class="stepper-value"
            @change="settings.surpriseFactor = Math.max(0, Math.min(100, settings.surpriseFactor))"
          />
          <button
            class="stepper-btn"
            :disabled="settings.surpriseFactor >= 100"
            @click="settings.surpriseFactor = Math.min(100, settings.surpriseFactor + 5)"
          >
            +
          </button>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.simulation.formFactor.label") }}</div>
          <div class="setting-desc">
            {{ t("settings.simulation.formFactor.desc", { plus: "+10", minus: "−10" }) }}
          </div>
        </div>
        <BtnGroup v-model="formFactorVal" :options="onOffOptions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stepper-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.stepper-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  padding: 2px 8px;
  border-radius: var(--radius);
  white-space: nowrap;
}
.stepper-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stepper-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  width: 44px;
  text-align: center;
  padding: 0 4px;
  -moz-appearance: textfield;
}
.stepper-value::-webkit-outer-spin-button,
.stepper-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
