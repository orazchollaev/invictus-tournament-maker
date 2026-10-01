<script setup lang="ts">
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import { Check } from "@lucide/vue"
import { AppButton, AppModal } from "@/components/ui"
import TeamSelector from "./TeamSelector.vue"

withDefaults(
  defineProps<{
    teams: Team[]
    selected: string[]
    showPower?: boolean
    disabled?: boolean
  }>(),
  // Mirror TeamSelector's default; an absent boolean prop would otherwise be cast to false.
  { showPower: true, disabled: false }
)

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

    <template #footer>
      <AppButton variant="filled" block @click="open = false">
        <Check :size="16" />
        {{ t("common.teams", { n: selected.length }) }}
      </AppButton>
    </template>
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
