<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronDown } from "@lucide/vue"
import { AppChip, AppIcon } from "@/components/ui"
import TeamSelector from "../shared/TeamSelector.vue"
import type { Team } from "@/modules/teams/types"

defineProps<{ availableTeams: Team[]; selected: string[] }>()
defineEmits<{ "update:selected": [ids: string[]] }>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <div class="dc-team-panel">
    <button class="dc-team-toggle" @click="open = !open">
      <span class="dc-team-toggle-label">{{ t("drawCeremony.manageTeams") }}</span>
      <AppChip>{{ selected.length }}</AppChip>
      <AppIcon
        :icon="ChevronDown"
        size="sm"
        class="dc-team-toggle-icon"
        :class="{ 'dc-team-toggle-icon--open': open }"
      />
    </button>

    <div v-if="open" class="dc-team-edit">
      <TeamSelector
        :teams="availableTeams"
        :selected="selected"
        @update:selected="(ids) => $emit('update:selected', ids)"
      />
    </div>
  </div>
</template>

<style scoped>
.dc-team-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.dc-team-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border: none;
  cursor: pointer;
  text-align: start;
  transition: background var(--dur-fast) var(--ease);
}
.dc-team-toggle:hover {
  background: color-mix(in srgb, var(--border-light) 60%, var(--bg));
}

.dc-team-toggle-label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex: 1;
}

.dc-team-toggle-icon {
  color: var(--text-muted);
  transition: transform var(--dur) var(--ease);
  flex-shrink: 0;
}
.dc-team-toggle-icon--open {
  transform: rotate(180deg);
}

.dc-team-edit {
  border-top: 1px solid var(--border-light);
  padding: var(--sp-3);
}
</style>
