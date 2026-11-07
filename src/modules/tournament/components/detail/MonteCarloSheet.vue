<script setup lang="ts">
/**
 * Runs the 10,000× Monte Carlo prediction for a tournament and shows its
 * progress. Opened from the detail page's ⋯ menu; the run starts as soon as
 * the sheet mounts and is cancelled if the sheet closes before it finishes.
 */
import { onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { BarChart2 } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useTeamsStore } from "@/modules/teams/store"
import type { Tournament } from "@/modules/tournament/types"
import { useMonteCarlo } from "@/modules/tournament/composables/useMonteCarlo"
import { cacheSimResult } from "@/modules/tournament/utils/simulationCache"
import { AppButton, AppIcon, AppSheet } from "@/components/ui"
import { showInterstitialAd } from "@/lib/admob"
import { adConfig } from "@/lib/remoteConfig"

const props = defineProps<{ tournament: Tournament }>()
const emit = defineEmits<{ close: [] }>()

// AdMob unit "Simulation End Interstitial".
const SIMULATION_END_AD_UNIT_ID = "ca-app-pub-5867331300737777/2783871508"
const RUNS = 10_000

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const { isRunning, progress, run, cancel } = useMonteCarlo()

const done = ref(false)

onMounted(async () => {
  const result = await run(props.tournament, teamsStore.teams, RUNS)
  if (result) {
    cacheSimResult(props.tournament.id, props.tournament, result)
    done.value = true
  }
})

function close() {
  cancel()
  emit("close")
}

function viewResults() {
  emit("close")
  router.push(`/tournaments/${props.tournament.id}/simulation`)
  // A finished 10,000-run simulation is a natural break: best effort, never blocks.
  if (adConfig.ad_simulation_end) void showInterstitialAd(SIMULATION_END_AD_UNIT_ID)
}
</script>

<template>
  <AppSheet
    :title="t('tournament.settingsPage.simulation.title')"
    :dismiss-on-outside-click="!isRunning"
    width="380px"
    @close="close"
  >
    <div class="mc-body">
      <template v-if="!done">
        <p class="mc-text">
          {{ t("tournament.settingsPage.simulation.simulating", { name: tournament.name }) }}
        </p>
        <div class="mc-track">
          <div class="mc-fill" :style="{ width: progress + '%' }" />
        </div>
        <div class="mc-percent">{{ progress }}%</div>
      </template>
      <p v-else class="mc-text mc-text--done">
        {{ t("tournament.settingsPage.simulation.done") }}
      </p>
    </div>

    <template #footer>
      <div class="mc-footer">
        <AppButton v-if="!done" @click="close">{{ t("common.cancel") }}</AppButton>
        <template v-else>
          <AppButton @click="close">{{ t("common.close") }}</AppButton>
          <AppButton variant="filled" @click="viewResults">
            <AppIcon :icon="BarChart2" size="sm" />
            {{ t("tournament.settingsPage.simulation.viewResults") }}
          </AppButton>
        </template>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped>
.mc-body {
  padding: var(--sp-4);
}

.mc-text {
  margin: 0 0 var(--sp-4);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.mc-text--done {
  margin: 0;
  font-size: var(--fs-base);
  font-weight: 500;
  color: var(--text);
}

.mc-track {
  width: 100%;
  height: 8px;
  margin-bottom: var(--sp-2);
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--fill-1);
}
.mc-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--accent);
  transition: width var(--dur-fast) var(--ease);
}

.mc-percent {
  font-size: var(--fs-sm);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  text-align: end;
}

.mc-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4) var(--sp-4);
}

@media (prefers-reduced-motion: reduce) {
  .mc-fill {
    transition: none;
  }
}
</style>
