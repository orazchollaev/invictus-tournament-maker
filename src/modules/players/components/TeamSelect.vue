<script setup lang="ts">
/**
 * Team picker: AppSelect with search turned on, drawing each row as a
 * TeamBadge instead of a plain label.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppSelect } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"

const props = withDefaults(
  defineProps<{
    teams: Team[]
    placeholder?: string
    /** Prepends an "All teams" pseudo-option (sentinel value `"all"`). */
    allowAll?: boolean
  }>(),
  { allowAll: false }
)

const model = defineModel<string>({ required: true })
const { t } = useI18n()

interface TeamOption {
  value: string
  label: string
  /** Null on the "All teams" row, which has no badge to draw. */
  team: Team | null
}

const options = computed<TeamOption[]>(() => {
  const rows = props.teams.map((tm) => ({ value: tm.id, label: tm.name, team: tm }))
  return props.allowAll
    ? [{ value: "all", label: t("players.filter.allTeams"), team: null }, ...rows]
    : rows
})
</script>

<template>
  <AppSelect
    v-model="model"
    :options="options"
    :placeholder="placeholder"
    searchable
    :search-placeholder="t('players.filter.searchPlaceholder')"
    :empty-text="t('players.filter.noResults')"
  >
    <template #value="{ option }">
      <span v-if="option" class="tsel-value">
        <TeamBadge v-if="option.team" :team="option.team" :size="14" />
        <template v-else>{{ option.label }}</template>
      </span>
    </template>

    <template #option="{ option }">
      <TeamBadge v-if="option.team" :team="option.team" :size="14" />
      <template v-else>{{ option.label }}</template>
    </template>
  </AppSelect>
</template>

<style scoped>
/* TeamBadge sizes its name span down for compact list rows — reset it here
   so the selected value reads at the same size/weight as any other field. */
.tsel-value :deep(.name) {
  font-size: inherit;
  font-weight: inherit;
}
</style>
