<script setup lang="ts">
import { useTournamentStore } from "@/modules/tournament/store"
import { useRouter } from "vue-router"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTournamentStore()
const router = useRouter()

const props = defineProps<{
  tournamentId: string
}>()

async function handleReset() {
  if (
    !(await showConfirm(t("tournament.settingsPage.dangerZone.resetConfirm"), {
      confirmLabel: t("tournament.settingsPage.dangerZone.resetConfirmLabel"),
      dangerous: true,
    }))
  )
    return
  store.resetResults(props.tournamentId)
}

async function handleDelete() {
  if (
    !(await showConfirm(t("tournament.settingsPage.dangerZone.deleteConfirm"), {
      confirmLabel: t("tournament.settingsPage.dangerZone.deleteConfirmLabel"),
      dangerous: true,
    }))
  )
    return
  store.remove(props.tournamentId)
  router.push("/tournaments")
}
</script>

<template>
  <div class="form-card form-card--danger">
    <div class="form-section-title form-section-title--danger">
      {{ t("tournament.settingsPage.dangerZone.title") }}
    </div>
    <div class="danger-list">
      <div class="danger-item">
        <div class="danger-info">
          <div class="danger-label">{{ t("tournament.settingsPage.dangerZone.resetLabel") }}</div>
          <div class="danger-desc">{{ t("tournament.settingsPage.dangerZone.resetDesc") }}</div>
        </div>
        <button class="danger" @click="handleReset">{{ t("common.reset") }}</button>
      </div>
      <div class="danger-item">
        <div class="danger-info">
          <div class="danger-label">{{ t("tournament.settingsPage.dangerZone.deleteLabel") }}</div>
          <div class="danger-desc">{{ t("tournament.settingsPage.dangerZone.deleteDesc") }}</div>
        </div>
        <button class="danger" @click="handleDelete">{{ t("common.delete") }}</button>
      </div>
    </div>
  </div>
</template>

<style src="./tournament-settings.css"></style>
<style scoped>
.form-card--danger {
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  background: color-mix(in srgb, var(--danger) 3%, var(--surface));
}
.form-section-title--danger {
  color: var(--danger);
}
.danger-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.danger-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent);
  background: color-mix(in srgb, var(--danger) 4%, var(--surface));
  border-radius: var(--radius);
}
.danger-info {
  flex: 1;
}
.danger-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
}
.danger-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
