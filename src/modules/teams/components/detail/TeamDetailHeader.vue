<script setup lang="ts">
/**
 * Top row of the team page, on the same AppPageHeader as every other detail
 * page: back · crest · name over its power rating · compare.
 */
import { computed } from "vue"
import { Swords } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppIcon, AppPageHeader, AppStarRating } from "@/components/ui"
import { TeamCrest } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{ team: Team }>()
defineEmits<{ back: []; compare: [] }>()

const { t } = useI18n()

// Cosmetic only — power (1-99) stays the source of truth for simulation.
const powerStars = computed(() => Math.round((props.team.power / 99) * 10) / 2)
</script>

<template>
  <AppPageHeader :title="team.name" @back="$emit('back')">
    <template #lead>
      <TeamCrest :team="team" :size="32" />
    </template>

    <template #subtitle>
      {{ t("teams.detail.powerRating") }}:
      <strong>{{ team.power }}</strong>
      <AppStarRating :value="powerStars" :size="11" />
    </template>

    <template #actions>
      <AppButton
        icon-only
        :title="t('teams.compare.button')"
        :aria-label="t('teams.compare.button')"
        @click="$emit('compare')"
      >
        <AppIcon :icon="Swords" size="md" />
      </AppButton>
    </template>
  </AppPageHeader>
</template>
