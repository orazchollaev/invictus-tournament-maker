<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import BtnGroup from "@/components/BtnGroup.vue"
import type { LegMode, PlayoffSeedMode } from "@/modules/tournament/types"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket" | "league"

const props = defineProps<{
  format: TournamentFormat
  selectedCount: number
}>()

const drawType = defineModel<DrawType>("drawType", { required: true })
const playoffSeedMode = defineModel<PlayoffSeedMode>("playoffSeedMode", { required: true })
const hasThirdPlace = defineModel<boolean>("hasThirdPlace", { required: true })
const groupLegMode = defineModel<LegMode>("groupLegMode", { required: true })
const knockoutLegMode = defineModel<LegMode>("knockoutLegMode", { required: true })
const finalLegMode = defineModel<LegMode>("finalLegMode", { required: true })

const { t } = useI18n()
const { legOptions, multiLegOptions } = useLegOptions()

const drawOptions = computed(() => [
  { value: "random", label: t("common.random") },
  { value: "seeded", label: t("common.seeded") },
  { value: "manual", label: t("common.manual") },
])

const playoffOptions = computed(() => [
  { value: "cross", label: t("tournament.create.cross") },
  { value: "no-same-group", label: t("tournament.create.noRematch") },
  { value: "random", label: t("common.random") },
  { value: "manual", label: t("common.manual") },
])
</script>

<template>
  <!-- Draw Method -->
  <div class="ctp-card">
    <div class="ctp-section-title">{{ t("tournament.create.drawMethod") }}</div>
    <div class="ctp-draw-rows">
      <div class="ctp-draw-row">
        <span v-if="format === 'group+bracket'" class="ctp-row-label">
          {{ t("tournament.create.groupStage") }}
        </span>
        <BtnGroup v-model="drawType" :options="drawOptions" />
      </div>
      <div v-if="format === 'group+bracket'" class="ctp-draw-row">
        <span class="ctp-row-label">{{ t("tournament.settingsPage.playoffSeeding.title") }}</span>
        <BtnGroup v-model="playoffSeedMode" :options="playoffOptions" />
      </div>
    </div>
    <div class="ctp-hint-box">
      {{
        t("tournament.create.drawHint", {
          random: t("common.random"),
          seeded: t("common.seeded"),
          manual: t("common.manual"),
        })
      }}
      <template v-if="format === 'group+bracket'">
        <br />
        {{
          t("tournament.create.playoffHint", {
            cross: t("tournament.create.cross"),
            noRematch: t("tournament.create.noRematch"),
            random: t("common.random"),
          })
        }}
      </template>
    </div>
  </div>

  <!-- 3rd Place Option -->
  <div v-if="selectedCount >= 4" class="ctp-card">
    <div class="ctp-section-title">Options</div>
    <label class="ctp-toggle-row">
      <input v-model="hasThirdPlace" type="checkbox" />
      <span class="ctp-toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
      <span class="ctp-toggle-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
    </label>
  </div>

  <!-- Legs per Match -->
  <div class="ctp-card">
    <div class="ctp-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
    <div class="ctp-leg-rows">
      <div v-if="format === 'group+bracket'" class="ctp-leg-row">
        <span class="ctp-row-label">{{ t("tournament.create.groupStage") }}</span>
        <BtnGroup v-model="groupLegMode" :options="multiLegOptions" />
      </div>
      <div class="ctp-leg-row">
        <span class="ctp-row-label">
          {{ t("tournament.settingsPage.legsPerMatch.knockoutRounds") }}
        </span>
        <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
      </div>
      <div class="ctp-leg-row">
        <span class="ctp-row-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
        <BtnGroup v-model="finalLegMode" :options="legOptions" />
      </div>
    </div>
  </div>
</template>

<style src="./ctp.css"></style>
