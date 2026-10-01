<script setup lang="ts">
import { Trophy, LayoutGrid, List, Swords, Shuffle, Workflow, type LucideIcon } from "@lucide/vue"
import type { TournamentFormat } from "@/modules/tournament/types"
import { SWISS_MIN_TEAMS } from "@/engine"

const props = defineProps<{ selectedCount: number }>()

const format = defineModel<TournamentFormat>("format", { required: true })
const playoffEnabled = defineModel<boolean>("playoffEnabled", { required: true })
const groupCount = defineModel<number>("groupCount", { required: true })
const qualifiersPerGroup = defineModel<number>("qualifiersPerGroup", { required: true })

interface FormatOption {
  key: string
  icon: LucideIcon
  minTeams: number
  isOn: () => boolean
  select: () => void
}

const options: FormatOption[] = [
  {
    key: "bracket",
    icon: Trophy,
    minTeams: 0,
    isOn: () => format.value === "bracket",
    select: () => setFormat("bracket"),
  },
  {
    key: "groupsKo",
    icon: LayoutGrid,
    minTeams: 4,
    isOn: () => format.value === "group+bracket",
    select: () => setFormat("group+bracket"),
  },
  {
    key: "league",
    icon: List,
    minTeams: 2,
    isOn: () => format.value === "league" && !playoffEnabled.value,
    select: () => setLeague(false),
  },
  {
    key: "leagueKo",
    icon: Swords,
    minTeams: 2,
    isOn: () => format.value === "league" && playoffEnabled.value,
    select: () => setLeague(true),
  },
  {
    key: "swiss",
    icon: Shuffle,
    minTeams: SWISS_MIN_TEAMS,
    isOn: () => format.value === "swiss",
    select: () => setFormat("swiss"),
  },
  {
    key: "custom",
    icon: Workflow,
    minTeams: 2,
    isOn: () => format.value === "custom",
    select: () => setFormat("custom"),
  },
]

function setFormat(f: TournamentFormat) {
  format.value = f
  // A Swiss phase always ends in a knockout stage, or it would have no winner.
  if (f === "swiss") playoffEnabled.value = true
  else if (f !== "league") playoffEnabled.value = false
  if (f === "group+bracket") {
    const maxGroups = Math.floor(props.selectedCount / 2)
    groupCount.value = Math.min(4, maxGroups)
    const maxQpg = groupCount.value > 0 ? Math.floor(props.selectedCount / groupCount.value) : 2
    qualifiersPerGroup.value = Math.min(2, maxQpg)
  }
}

function setLeague(withPlayoff: boolean) {
  format.value = "league"
  playoffEnabled.value = withPlayoff
}
</script>

<template>
  <div class="form-card">
    <div class="form-section-title">
      {{ $t("tournament.create.format") }}
    </div>

    <div class="ctp-format-row" role="radiogroup" :aria-label="$t('tournament.create.format')">
      <button
        v-for="opt in options"
        :key="opt.key"
        type="button"
        role="radio"
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': opt.isOn() }"
        :aria-checked="opt.isOn()"
        :disabled="selectedCount < opt.minTeams"
        @click="opt.select()"
      >
        <span class="ctp-format-icon">
          <component :is="opt.icon" :size="20" />
        </span>

        <span class="ctp-format-title">
          {{ $t(`tournament.create.formats.${opt.key}`) }}
        </span>

        <span class="ctp-format-desc">
          {{ $t(`tournament.create.formats.${opt.key}Desc`) }}
        </span>
      </button>
    </div>
  </div>
</template>

<style src="./create.css"></style>
