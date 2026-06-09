<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import type { Tournament } from "@/modules/tournament/types"
import { Play, BarChart2 } from "@lucide/vue"
import { useMonteCarlo } from "@/modules/tournament/composables/useMonteCarlo"
import { cacheSimResult } from "@/modules/tournament/composables/simulationCache"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()

const props = defineProps<{
  tournamentId: string
  tournament: Tournament
}>()

const {
  isRunning: simRunning,
  progress: simProgress,
  run: runSim,
  cancel: cancelSim,
} = useMonteCarlo()

const showSimModal = ref(false)
const simDone = ref(false)

async function handleSimulate() {
  showSimModal.value = true
  simDone.value = false
  const result = await runSim(props.tournament, teamsStore.teams, 10_000)
  if (result) {
    cacheSimResult(props.tournamentId, result)
    simDone.value = true
  }
}

function handleCancelSim() {
  cancelSim()
  showSimModal.value = false
  simDone.value = false
}

function goToSimResults() {
  showSimModal.value = false
  router.push(`/tournaments/${props.tournamentId}/simulation`)
}
</script>

<template>
  <div class="tsp-card tsp-card--sim">
    <div class="tsp-card-header">
      <div class="tsp-section-title tsp-section-title--sim">
        {{ t("tournament.settingsPage.simulation.title") }}
      </div>
    </div>
    <div class="tsp-sim-row">
      <div class="tsp-sim-desc">{{ t("tournament.settingsPage.simulation.desc") }}</div>
      <button class="primary tsp-sim-btn" @click="handleSimulate">
        <Play :size="13" />
        {{ t("tournament.settingsPage.simulation.run") }}
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showSimModal" class="sim-overlay" @click.self="!simRunning && handleCancelSim()">
      <div class="sim-modal">
        <div class="sim-modal-header">
          <BarChart2 :size="18" class="sim-modal-icon" />
          <span class="sim-modal-title">{{ t("tournament.settingsPage.simulation.title") }}</span>
        </div>

        <template v-if="!simDone">
          <p class="sim-modal-sub">
            {{ t("tournament.settingsPage.simulation.simulating", { name: tournament.name }) }}
          </p>
          <div class="sim-progress-track">
            <div class="sim-progress-fill" :style="{ width: simProgress + '%' }" />
          </div>
          <div class="sim-progress-label">{{ simProgress }}%</div>
          <button class="sim-cancel-btn" @click="handleCancelSim">{{ t("common.cancel") }}</button>
        </template>

        <template v-else>
          <p class="sim-modal-sub sim-done-msg">
            {{ t("tournament.settingsPage.simulation.done") }}
          </p>
          <div class="sim-done-actions">
            <button class="primary" @click="goToSimResults">
              <BarChart2 :size="14" />
              {{ t("tournament.settingsPage.simulation.viewResults") }}
            </button>
            <button @click="handleCancelSim">{{ t("common.close") }}</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style src="./tsp.css"></style>
<style scoped>
.tsp-card--sim {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--border-light));
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}
.tsp-section-title--sim {
  color: var(--accent);
}
.tsp-sim-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.tsp-sim-desc {
  flex: 1;
  font-size: 12px;
  color: var(--text-muted);
  min-width: 160px;
}
.tsp-sim-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  white-space: nowrap;
  padding: 8px 16px;
  flex-shrink: 0;
}

.sim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.sim-modal {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 28px 28px 24px;
  width: min(380px, calc(100vw - 32px));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.sim-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.sim-modal-icon {
  color: var(--accent);
}
.sim-modal-title {
  font-size: 16px;
  font-weight: 700;
}
.sim-modal-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 16px;
}
.sim-progress-track {
  width: 100%;
  height: 8px;
  background: var(--bg);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 8px;
}
.sim-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius);
  transition: width 0.15s ease;
}
.sim-progress-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-align: right;
  margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}
.sim-cancel-btn {
  font-size: 13px;
  color: var(--text-muted);
  padding: 6px 14px;
}
.sim-done-msg {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}
.sim-done-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.sim-done-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
}
</style>
