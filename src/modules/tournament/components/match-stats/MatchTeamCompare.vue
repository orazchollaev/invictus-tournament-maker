<script setup lang="ts">
/** The five comparison rows under the scoreline. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppStatBar } from "@/components/ui"
import type { TeamMatchStats } from "../../types"

const props = defineProps<{
  stats: TeamMatchStats
  homeColor: string
  awayColor: string
}>()

const { t } = useI18n()

const rows = computed(() => [
  {
    key: "possession",
    label: t("matchStats.possession"),
    home: props.stats.possession,
    away: 100 - props.stats.possession,
    unit: "%",
  },
  {
    key: "shots",
    label: t("matchStats.shots"),
    home: props.stats.shots[0],
    away: props.stats.shots[1],
    unit: "",
  },
  {
    key: "onTarget",
    label: t("matchStats.onTarget"),
    home: props.stats.onTarget[0],
    away: props.stats.onTarget[1],
    unit: "",
  },
  {
    key: "corners",
    label: t("matchStats.corners"),
    home: props.stats.corners[0],
    away: props.stats.corners[1],
    unit: "",
  },
  {
    key: "fouls",
    label: t("matchStats.fouls"),
    home: props.stats.fouls[0],
    away: props.stats.fouls[1],
    unit: "",
  },
])
</script>

<template>
  <div class="compare">
    <AppStatBar
      v-for="row in rows"
      :key="row.key"
      :label="row.label"
      :home="row.home"
      :away="row.away"
      :unit="row.unit"
      :home-color="homeColor"
      :away-color="awayColor"
    />
  </div>
</template>

<style scoped>
.compare {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
</style>
