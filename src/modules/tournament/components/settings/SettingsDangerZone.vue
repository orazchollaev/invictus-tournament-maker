<script setup lang="ts">
import { useTournamentStore } from "@/modules/tournament/store"
import { useRouter } from "vue-router"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"
import { RotateCcw, Trash2, TriangleAlert } from "@lucide/vue"
import { AppButton, AppCard, AppIcon } from "@/components/ui"

const props = defineProps<{
  tournamentId: string
}>()
const { t } = useI18n()
const store = useTournamentStore()
const router = useRouter()

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
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="TriangleAlert" size="md" class="danger-icon" />
      {{ t("tournament.settingsPage.dangerZone.title") }}
    </template>

    <div class="danger-row">
      <div class="danger-info">
        <div class="danger-label">{{ t("tournament.settingsPage.dangerZone.resetLabel") }}</div>
        <div class="danger-desc">{{ t("tournament.settingsPage.dangerZone.resetDesc") }}</div>
      </div>
      <AppButton size="sm" @click="handleReset">
        <AppIcon :icon="RotateCcw" size="sm" />
        {{ t("common.reset") }}
      </AppButton>
    </div>

    <div class="danger-row">
      <div class="danger-info">
        <div class="danger-label">{{ t("tournament.settingsPage.dangerZone.deleteLabel") }}</div>
        <div class="danger-desc">{{ t("tournament.settingsPage.dangerZone.deleteDesc") }}</div>
      </div>
      <AppButton size="sm" variant="danger" @click="handleDelete">
        <AppIcon :icon="Trash2" size="sm" />
        {{ t("common.delete") }}
      </AppButton>
    </div>
  </AppCard>
</template>

<style scoped>
.danger-icon {
  color: var(--danger);
}

.danger-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
  border-bottom: 1px solid var(--border-light);
}
.danger-row:first-child {
  padding-top: 0;
}
.danger-row:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.danger-info {
  flex: 1;
  min-width: 0;
}

.danger-label {
  font-size: var(--fs-base);
  font-weight: 600;
}

.danger-desc {
  margin-top: 2px;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
