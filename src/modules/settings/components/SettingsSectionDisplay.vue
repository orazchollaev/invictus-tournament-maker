<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { BracketStyle } from "../store"
import { useI18n } from "vue-i18n"
import BtnGroup from "@/components/BtnGroup.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const bracketStyleOptions = computed<{ value: BracketStyle; label: string }[]>(() => [
  { value: "double-sided", label: t("settings.display.bracketStyle.doubleSided") },
  { value: "classic", label: t("settings.display.bracketStyle.classic") },
  { value: "auto", label: t("settings.display.bracketStyle.auto") },
])

const onOffOptions = computed(() => [
  { value: "on", label: t("common.on") },
  { value: "off", label: t("common.off") },
])

const showHideOptions = computed(() => [
  { value: "show", label: t("common.show") },
  { value: "hide", label: t("common.hide") },
])

const showTeamAbbrVal = computed({
  get: () => (settings.showTeamAbbr ? "show" : "hide"),
  set: (v: string) => {
    settings.showTeamAbbr = v === "show"
  },
})

const confettiOnWinVal = computed({
  get: () => (settings.confettiOnWin ? "on" : "off"),
  set: (v: string) => {
    settings.confettiOnWin = v === "on"
  },
})

const soundOnWinVal = computed({
  get: () => (settings.soundOnWin ? "on" : "off"),
  set: (v: string) => {
    settings.soundOnWin = v === "on"
  },
})

const bracketHoverVal = computed({
  get: () => (settings.bracketHighlightOnHover ? "on" : "off"),
  set: (v: string) => {
    settings.bracketHighlightOnHover = v === "on"
  },
})

const bracketConnectorColorsVal = computed({
  get: () => (settings.bracketConnectorColors ? "on" : "off"),
  set: (v: string) => {
    settings.bracketConnectorColors = v === "on"
  },
})
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.display.title") }}</h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.teamAbbr.label") }}</div>
          <div class="setting-desc">
            {{ t("settings.display.teamAbbr.desc", { example: "BRA" }) }}
          </div>
        </div>
        <BtnGroup v-model="showTeamAbbrVal" :options="showHideOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketStyle.label") }}</div>
          <div class="setting-desc">
            <strong>{{ t("settings.display.bracketStyle.doubleSided") }}</strong>
            — teams on both sides ·
            <strong>{{ t("settings.display.bracketStyle.classic") }}</strong>
            — single left-to-right ·
            <strong>{{ t("settings.display.bracketStyle.auto") }}</strong>
            — Double-Sided for 17+ teams
          </div>
        </div>
        <BtnGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.confetti.label") }}</div>
          <div class="setting-desc">{{ t("settings.display.confetti.desc") }}</div>
        </div>
        <BtnGroup v-model="confettiOnWinVal" :options="onOffOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.sound.label") }}</div>
          <div class="setting-desc">{{ t("settings.display.sound.desc") }}</div>
        </div>
        <BtnGroup v-model="soundOnWinVal" :options="onOffOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketHover.label") }}</div>
          <div class="setting-desc">{{ t("settings.display.bracketHover.desc") }}</div>
        </div>
        <BtnGroup v-model="bracketHoverVal" :options="onOffOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketConnectorColors.label") }}</div>
          <div class="setting-desc">{{ t("settings.display.bracketConnectorColors.desc") }}</div>
        </div>
        <BtnGroup v-model="bracketConnectorColorsVal" :options="onOffOptions" />
      </div>
    </div>
  </div>
</template>
