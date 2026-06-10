<script setup lang="ts">
import { computed, watch } from "vue"
import { Trophy, LayoutGrid, List } from "@lucide/vue"

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
    <div class="ctp-section-title">Tournament Format</div>
    <div class="ctp-format-row">
      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'bracket' }"
        @click="setFormat('bracket')"
      >
        <Trophy :size="28" class="ctp-format-icon" />
        <span class="ctp-format-title">Knockout Bracket</span>
        <span class="ctp-format-desc">Lose once and you're out</span>
      </button>
      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'group+bracket' }"
        :disabled="selectedCount < 4"
        @click="setFormat('group+bracket')"
      >
        <LayoutGrid :size="28" class="ctp-format-icon" />
        <span class="ctp-format-title">Groups + Knockout</span>
        <span class="ctp-format-desc">Group stage, then top teams advance</span>
      </button>
      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'league' }"
        :disabled="selectedCount < 2"
        @click="setFormat('league')"
      >
        <List :size="28" class="ctp-format-icon" />
        <span class="ctp-format-title">League</span>
        <span class="ctp-format-desc">Everyone plays everyone, most points wins</span>
      </button>
    </div>

    <!-- Group count + qualifiers -->
    <div v-if="format === 'group+bracket'" class="ctp-gc-block">
      <div class="ctp-gc-row">
        <span class="ctp-gc-label">Number of Groups</span>
        <div class="ctp-gc-stepper">
          <button
            :disabled="groupCount <= minGroups"
            @click="groupCount = Math.max(minGroups, groupCount - 1)"
          >
            −
          </button>
          <span class="ctp-gc-val">{{ groupCount }}</span>
          <button
            :disabled="groupCount >= maxGroups"
            @click="groupCount = Math.min(maxGroups, groupCount + 1)"
          >
            +
          </button>
        </div>
        <span class="ctp-gc-hint">~{{ teamsPerGroup }} teams per group</span>
      </div>
      <div class="ctp-gc-row">
        <span class="ctp-gc-label">Teams that advance</span>
        <div class="ctp-gc-stepper">
          <button
            :disabled="qualifiersPerGroup <= minQpg"
            @click="qualifiersPerGroup = Math.max(minQpg, qualifiersPerGroup - 1)"
          >
            −
          </button>
          <span class="ctp-gc-val">{{ qualifiersPerGroup }}</span>
          <button
            :disabled="qualifiersPerGroup >= maxQpg"
            @click="qualifiersPerGroup = Math.min(maxQpg, qualifiersPerGroup + 1)"
          >
            +
          </button>
        </div>
        <span class="ctp-gc-hint">
          per group →
          <strong>{{ qualifiersPerGroup * groupCount }}</strong>
          reach knockout
        </span>
      </div>
      <div v-if="maxWildcards > 0" class="ctp-gc-row">
        <span class="ctp-gc-label">Best runner-up wildcards</span>
        <div class="ctp-gc-stepper">
          <button
            :disabled="wildcardCount <= 0"
            @click="wildcardCount = Math.max(0, wildcardCount - 1)"
          >
            −
          </button>
          <span class="ctp-gc-val">{{ wildcardCount }}</span>
          <button
            :disabled="wildcardCount >= maxWildcards"
            @click="wildcardCount = Math.min(maxWildcards, wildcardCount + 1)"
          >
            +
          </button>
        </div>
        <span class="ctp-gc-hint">
          →
          <strong>{{ qualifiersPerGroup * groupCount + wildcardCount }}</strong>
          total
        </span>
      </div>
    </div>
  </div>
</template>

<style src="./ctp.css"></style>
