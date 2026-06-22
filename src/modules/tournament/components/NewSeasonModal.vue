<script setup lang="ts">
import { ref, computed } from "vue"
import { History, Shuffle, Plus, Minus, ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import AppModal from "@/components/AppModal.vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{
  tournament: Tournament
  allTeams: Team[]
  availableTeams: Team[]
}>()

const emit = defineEmits<{
  useOldDraw: []
  startDraw: [teamIds: string[]]
  cancel: []
}>()

const { t } = useI18n()

const appModal = ref<InstanceType<typeof AppModal>>()

type Step = "choice" | "manage"
const step = ref<Step>("choice")
const localTeamIds = ref<string[]>([...props.tournament.teamIds])

const currentTeams = computed(
  () =>
    localTeamIds.value
      .map((id) => props.allTeams.find((tm) => tm.id === id))
      .filter(Boolean) as Team[]
)

// Use allTeams so removed-from-tournament teams show up here
const freeTeams = computed(() => {
  const localSet = new Set(localTeamIds.value)
  return props.allTeams.filter((tm) => !localSet.has(tm.id))
})

function addTeam(id: string) {
  if (!localTeamIds.value.includes(id)) localTeamIds.value.push(id)
}

function removeTeam(id: string) {
  localTeamIds.value = localTeamIds.value.filter((x) => x !== id)
}

function confirmUseOldDraw() {
  appModal.value?.close()
  setTimeout(() => emit("useOldDraw"), 220)
}

function confirmStartDraw() {
  appModal.value?.close()
  setTimeout(() => emit("startDraw", [...localTeamIds.value]), 220)
}

function confirmCancel() {
  appModal.value?.close()
  setTimeout(() => emit("cancel"), 220)
}
</script>

<template>
  <AppModal ref="appModal" @close="emit('cancel')">
    <template #title>
      {{ t("tournament.newSeason") }} — {{ tournament.name }}
      <span class="nsm-season">S{{ tournament.season + 1 }}</span>
    </template>

    <!-- Step 1: choice -->
    <div v-if="step === 'choice'" class="nsm-choices">
      <button class="nsm-option" @click="confirmUseOldDraw">
        <div class="nsm-option-icon-wrap">
          <History :size="18" />
        </div>
        <div class="nsm-option-text">
          <span class="nsm-option-label">{{ t("tournament.newSeasonModal.useOldDraw") }}</span>
          <span class="nsm-option-desc">
            {{ t("tournament.newSeasonModal.useOldDrawDesc", { n: tournament.season }) }}
          </span>
        </div>
      </button>

      <button class="nsm-option" @click="step = 'manage'">
        <div class="nsm-option-icon-wrap">
          <Shuffle :size="18" />
        </div>
        <div class="nsm-option-text">
          <span class="nsm-option-label">{{ t("tournament.newSeasonModal.newDraw") }}</span>
          <span class="nsm-option-desc">{{ t("tournament.newSeasonModal.newDrawDesc") }}</span>
        </div>
      </button>
    </div>

    <!-- Step 2: manage teams -->
    <div v-else class="nsm-manage">
      <button class="nsm-back" @click="step = 'choice'">
        <ArrowLeft :size="13" />
        {{ t("common.back") }}
      </button>

      <!-- Current teams -->
      <div class="nsm-section-header">
        <span class="nsm-section-title">{{ t("tournament.newSeasonModal.currentTeams") }}</span>
        <span class="nsm-count-badge">{{ currentTeams.length }}</span>
      </div>
      <div class="nsm-team-list">
        <TransitionGroup name="team-item" tag="div" class="nsm-team-list-inner">
          <div v-for="tm in currentTeams" :key="tm.id" class="nsm-team-row">
            <span class="nsm-dot" :style="{ background: tm.color }" />
            <span class="nsm-team-name">{{ tm.name }}</span>
            <button
              class="nsm-action-btn nsm-remove-btn"
              :disabled="currentTeams.length <= 2"
              :title="t('common.remove')"
              @click="removeTeam(tm.id)"
            >
              <Minus :size="12" />
            </button>
          </div>
          <div v-if="currentTeams.length === 0" key="__empty_current" class="nsm-empty">
            {{ t("tournament.newSeasonModal.noTeams") }}
          </div>
        </TransitionGroup>
      </div>

      <!-- Available teams -->
      <div class="nsm-section-header nsm-section-header--avail">
        <span class="nsm-section-title">{{ t("tournament.newSeasonModal.availableTeams") }}</span>
        <span class="nsm-count-badge">{{ freeTeams.length }}</span>
      </div>
      <div class="nsm-team-list">
        <TransitionGroup name="team-item" tag="div" class="nsm-team-list-inner">
          <div v-for="tm in freeTeams" :key="tm.id" class="nsm-team-row nsm-team-row--free">
            <span class="nsm-dot" :style="{ background: tm.color }" />
            <span class="nsm-team-name">{{ tm.name }}</span>
            <button class="nsm-action-btn nsm-add-btn" @click="addTeam(tm.id)">
              <Plus :size="12" />
            </button>
          </div>
          <div v-if="freeTeams.length === 0" key="__empty_free" class="nsm-empty">
            {{ t("tournament.newSeasonModal.noAvailable") }}
          </div>
        </TransitionGroup>
      </div>
    </div>

    <template v-if="step === 'manage'" #footer>
      <button
        class="primary nsm-draw-btn"
        :disabled="localTeamIds.length < 2"
        @click="confirmStartDraw"
      >
        <Shuffle :size="13" />
        {{ t("drawCeremony.startDraw") }}
        <span class="nsm-badge">{{ t("common.teams", { n: localTeamIds.length }) }}</span>
      </button>
      <button class="nsm-cancel-btn" @click="confirmCancel">{{ t("common.cancel") }}</button>
    </template>
  </AppModal>
</template>

<style scoped>
.nsm-season {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 6px;
}

/* ── Choice step ── */
.nsm-choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nsm-option {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 14px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.nsm-option:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
}

.nsm-option:hover .nsm-option-icon-wrap {
  color: var(--accent);
}

.nsm-option-icon-wrap {
  color: var(--text-muted);
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--border) 50%, transparent);
  border-radius: var(--radius);
  transition: color 0.15s;
}

.nsm-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nsm-option-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.nsm-option-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* ── Manage step ── */
.nsm-manage {
  display: flex;
  flex-direction: column;
}

.nsm-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0 0 14px;
  transition: color 0.12s;
}

.nsm-back:hover {
  color: var(--text);
}

.nsm-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.nsm-section-header--avail {
  margin-top: 16px;
}

.nsm-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.nsm-count-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--border) 60%, transparent);
  border-radius: 10px;
  padding: 1px 7px;
  font-family: var(--font-ui);
}

/* ── Team lists ── */
.nsm-team-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.nsm-team-list-inner {
  position: relative;
  display: flex;
  flex-direction: column;
}

.nsm-team-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.nsm-team-row:last-child {
  border-bottom: none;
}

.nsm-team-row--free {
  background: color-mix(in srgb, var(--surface) 60%, var(--bg));
}

.nsm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.nsm-team-name {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nsm-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s,
    opacity 0.12s;
}

.nsm-remove-btn {
  color: var(--text-muted);
}

.nsm-remove-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #e53e3e 12%, transparent);
  border-color: #e53e3e;
  color: #e53e3e;
}

.nsm-remove-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.nsm-add-btn {
  color: var(--text-muted);
}

.nsm-add-btn:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.nsm-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 10px 12px;
  font-style: italic;
}

/* ── TransitionGroup animations ── */
.team-item-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.team-item-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
  position: absolute;
  width: 100%;
}

.team-item-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.team-item-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.team-item-move {
  transition: transform 0.2s ease;
}

/* ── Footer ── */
.nsm-draw-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.nsm-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.22);
  border-radius: var(--radius);
  padding: 0 8px;
  font-size: 12px;
}

.nsm-cancel-btn {
  font-size: 13px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 6px 14px;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.nsm-cancel-btn:hover {
  color: var(--text);
  border-color: var(--border);
}
</style>
