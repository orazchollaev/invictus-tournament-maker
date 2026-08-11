<script setup lang="ts">
import { Trophy, LayoutGrid, List, Swords } from "@lucide/vue"

type TournamentFormat = "bracket" | "group+bracket" | "league"

const props = defineProps<{ selectedCount: number }>()

const format = defineModel<TournamentFormat>("format", { required: true })
const playoffEnabled = defineModel<boolean>("playoffEnabled", { required: true })
const groupCount = defineModel<number>("groupCount", { required: true })
const qualifiersPerGroup = defineModel<number>("qualifiersPerGroup", { required: true })

function setFormat(f: TournamentFormat) {
  format.value = f
  if (f !== "league") playoffEnabled.value = false
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
        :class="{ 'ctp-format-card--on': format === 'league' && !playoffEnabled }"
        :disabled="selectedCount < 2"
        @click="setLeague(false)"
      >
        <List :size="28" class="ctp-format-icon" />

        <span class="ctp-format-title">
          {{ $t("tournament.create.formats.league") }}
        </span>

        <span class="ctp-format-desc">
          {{ $t("tournament.create.formats.leagueDesc") }}
        </span>
      </button>

      <button
        class="ctp-format-card"
        :class="{ 'ctp-format-card--on': format === 'league' && playoffEnabled }"
        :disabled="selectedCount < 2"
        @click="setLeague(true)"
      >
        <Swords :size="28" class="ctp-format-icon" />

        <span class="ctp-format-title">
          {{ $t("tournament.create.formats.leagueKo") }}
        </span>

        <span class="ctp-format-desc">
          {{ $t("tournament.create.formats.leagueKoDesc") }}
        </span>
      </button>
    </div>
  </div>
</template>

<style src="./create-tournament.css"></style>
