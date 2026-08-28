<script setup lang="ts">
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import { AppModal } from "@/components/ui"
import TeamSelector from "./TeamSelector.vue"

defineProps<{
  teams: Team[]
  selected: string[]
  showPower?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{ "update:selected": [ids: string[]] }>()
const open = defineModel<boolean>("open", { required: true })
const { t } = useI18n()
</script>

<template>
  <AppModal v-if="open" :title="t('teamSelector.title')" width="500px" flush @close="open = false">
    <TeamSelector
      class="tsfm-selector"
      :teams="teams"
      :selected="selected"
      :show-power="showPower"
      :disabled="disabled"
      fullscreen
      @update:selected="emit('update:selected', $event)"
    />
  </AppModal>
</template>

<style scoped>
.tsfm-selector {
  height: 100%;
  padding: var(--sp-3);
}

@media (max-width: 600px) {
  .tsfm-selector {
    padding: 0;
  }
}
</style>
