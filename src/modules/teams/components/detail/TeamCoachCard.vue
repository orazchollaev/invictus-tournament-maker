<script setup lang="ts">
/** The touchline, on TeamDetailPage: who is in charge, the shape he plays and
 * how he sets the side up. Two chips and a rating — the coach is meant to be
 * read at a glance, not studied. */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppIcon, AppSectionHeader } from "@/components/ui"
import { ClipboardList, Pencil, Plus } from "@lucide/vue"
import { useTeamsStore } from "@/modules/teams/store"
import CoachFormModal from "../CoachFormModal.vue"

const props = defineProps<{ teamId: string }>()

const { t } = useI18n()
const store = useTeamsStore()

const team = computed(() => store.teams.find((tm) => tm.id === props.teamId))
const coach = computed(() => team.value?.coach)

const showForm = ref(false)
</script>

<template>
  <div v-if="team" class="section">
    <AppSectionHeader :title="t('coach.title')">
      <template #actions>
        <AppButton variant="text" size="xs" @click="showForm = true">
          <AppIcon :icon="coach ? Pencil : Plus" size="xs" />
          {{ coach ? t("common.edit") : t("coach.appoint") }}
        </AppButton>
      </template>
    </AppSectionHeader>

    <div v-if="coach" class="coach-row">
      <AppIcon :icon="ClipboardList" size="sm" class="coach-icon" />
      <span class="coach-name">{{ coach.name }}</span>
      <AppChip square size="xs" :title="t('coach.form.formation')">{{ coach.formation }}</AppChip>
      <AppChip square size="xs" variant="accent" :title="t('coach.form.style')">
        {{ t(`coach.styles.${coach.style}`) }}
      </AppChip>
      <AppChip square size="xs">{{ coach.power }}</AppChip>
    </div>
    <p v-else class="empty-inline">{{ t("coach.empty") }}</p>

    <CoachFormModal v-if="showForm" :team="team" @close="showForm = false" />
  </div>
</template>

<style scoped>
.coach-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
}

.coach-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.coach-name {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
