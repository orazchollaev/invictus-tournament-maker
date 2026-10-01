<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import {
  TeamSelectorButton,
  TeamSelectorFullscreenModal,
} from "@/modules/tournament/components/shared"
import type { Team } from "@/modules/teams/types"

defineProps<{ availableTeams: Team[]; selected: string[] }>()
defineEmits<{ "update:selected": [ids: string[]] }>()

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <TeamSelectorButton
    :teams="availableTeams"
    :selected="selected"
    :label="t('drawCeremony.manageTeams')"
    @click="open = true"
  />

  <TeamSelectorFullscreenModal
    v-model:open="open"
    :teams="availableTeams"
    :selected="selected"
    @update:selected="(ids) => $emit('update:selected', ids)"
  />
</template>
