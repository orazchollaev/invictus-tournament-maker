<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Swords } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const legOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
])
</script>

<template>
  <div class="section-box">
    <h2>
      <Swords :size="15" class="section-icon" />
      {{ t("settings.matchDefaults.title") }}
    </h2>
    <div class="section-body">
      <p class="section-intro">{{ t("settings.matchDefaults.intro") }}</p>
      <div class="setting-group">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.matchDefaults.groupStage.label") }}</div>
            <SettingDesc>
              <strong>{{ t("common.single") }}</strong>
              —
              {{
                t("settings.matchDefaults.groupStage.desc", { single: "", double: "" })
                  .split("·")[0]
                  .trim()
                  .replace(/^—?\s*/, "")
              }}
              ·
              <strong>{{ t("common.double") }}</strong>
              —
              {{
                t("settings.matchDefaults.groupStage.desc", { single: "", double: "" })
                  .split("·")[1]
                  ?.trim()
                  .replace(/^—?\s*/, "")
              }}
            </SettingDesc>
          </div>
          <BtnGroup v-model="settings.groupLegMode" :options="legOptions" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">
              {{ t("settings.matchDefaults.knockoutRounds.label") }}
            </div>
            <SettingDesc>
              <strong>{{ t("common.single") }}</strong>
              —
              {{
                t("settings.matchDefaults.knockoutRounds.desc", { single: "", double: "" })
                  .split("·")[0]
                  .trim()
                  .replace(/^—?\s*/, "")
              }}
              ·
              <strong>{{ t("common.double") }}</strong>
              —
              {{
                t("settings.matchDefaults.knockoutRounds.desc", { single: "", double: "" })
                  .split("·")[1]
                  ?.trim()
                  .replace(/^—?\s*/, "")
              }}
            </SettingDesc>
          </div>
          <BtnGroup v-model="settings.knockoutLegMode" :options="legOptions" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.matchDefaults.final.label") }}</div>
            <SettingDesc>{{ t("settings.matchDefaults.final.desc") }}</SettingDesc>
          </div>
          <BtnGroup v-model="settings.finalLegMode" :options="legOptions" />
        </div>
      </div>
    </div>
  </div>
</template>
