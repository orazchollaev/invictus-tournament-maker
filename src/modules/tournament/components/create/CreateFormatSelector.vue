<script setup lang="ts">
import { computed, watch } from "vue"
import { Trophy, LayoutGrid, List } from "@lucide/vue"
import AppStepper from "@/components/AppStepper.vue"

type TournamentFormat = "bracket" | "group+bracket" | "league"

const props = defineProps<{ selectedCount: number }>()

const format = defineModel<TournamentFormat>("format", { required: true })
const groupCount = defineModel<number>("groupCount", { required: true })
const qualifiersPerGroup = defineModel<number>("qualifiersPerGroup", { required: true })
const wildcardCount = defineModel<number>("wildcardCount", { required: true })

const minGroups = 2
const minQpg = 1
const maxGroups = computed(() => Math.floor(props.selectedCount / 2))
const maxQpg = computed(() =>
  groupCount.value > 0 ? Math.floor(props.selectedCount / groupCount.value) : 2
)
const maxWildcards = computed(() => {
  const minGroupSize = Math.floor(props.selectedCount / groupCount.value)
  return qualifiersPerGroup.value < minGroupSize ? groupCount.value : 0
})
const teamsPerGroup = computed(() =>
  groupCount.value > 0 ? Math.ceil(props.selectedCount / groupCount.value) : 0
)

watch(maxGroups, (max) => {
  groupCount.value = Math.max(minGroups, Math.min(groupCount.value, max))
})
watch(maxQpg, (max) => {
  qualifiersPerGroup.value = Math.max(minQpg, Math.min(qualifiersPerGroup.value, max))
})
watch(maxWildcards, (max) => {
  wildcardCount.value = Math.min(wildcardCount.value, max)
})

function setFormat(f: TournamentFormat) {
  format.value = f
  if (f === "group+bracket") {
    groupCount.value = Math.min(4, maxGroups.value)
    qualifiersPerGroup.value = Math.min(2, maxQpg.value)
  }
}
</script>

<template>
  <div class="ctp-card">
    <div class="ctp-section-title">
      {{ $t("tournament.create.format") }}
    </div>

    <div class="ctp-format-row">
      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'bracket' }"
        @click="setFormat('bracket')"
      >
        <Trophy :size="28" class="ctp-format-icon" />

        <span class="ctp-format-title">
          {{ $t("tournament.create.formats.bracket") }}
        </span>

        <span class="ctp-format-desc">
          {{ $t("tournament.create.formats.bracketDesc") }}
        </span>
      </button>

      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'group+bracket' }"
        :disabled="selectedCount < 4"
        @click="setFormat('group+bracket')"
      >
        <LayoutGrid :size="28" class="ctp-format-icon" />

        <span class="ctp-format-title">
          {{ $t("tournament.create.formats.groupsKo") }}
        </span>

        <span class="ctp-format-desc">
          {{ $t("tournament.create.formats.groupsKoDesc") }}
        </span>
      </button>

      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'league' }"
        :disabled="selectedCount < 2"
        @click="setFormat('league')"
      >
        <List :size="28" class="ctp-format-icon" />

        <span class="ctp-format-title">
          {{ $t("tournament.create.formats.league") }}
        </span>

        <span class="ctp-format-desc">
          {{ $t("tournament.create.formats.leagueDesc") }}
        </span>
      </button>
    </div>

    <div v-if="format === 'group+bracket'" class="ctp-gc-block">
      <AppStepper
        v-model="groupCount"
        :label="$t('tournament.create.groups')"
        :min="minGroups"
        :max="maxGroups"
        :hint="$t('tournament.create.teamsPerGroup', { n: teamsPerGroup })"
      />

      <AppStepper
        v-model="qualifiersPerGroup"
        :label="$t('tournament.create.advance')"
        :min="minQpg"
        :max="maxQpg"
        :hint="`${$t('tournament.create.perGroup')} → ${
          qualifiersPerGroup * groupCount
        } ${$t('tournament.create.reachKnockout')}`"
      />

      <AppStepper
        v-if="maxWildcards > 0"
        v-model="wildcardCount"
        :label="$t('tournament.create.wildcards')"
        :min="0"
        :max="maxWildcards"
        :hint="`→ ${qualifiersPerGroup * groupCount + wildcardCount} ${$t('tournament.create.total')}`"
      />
    </div>
  </div>
</template>

<style src="./ctp.css"></style>
