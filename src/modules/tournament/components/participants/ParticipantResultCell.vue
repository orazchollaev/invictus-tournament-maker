<script setup lang="ts">
import { computed } from "vue"
import { eliminationLabel, leaguePlaceTag, ordinalSuffix } from "./formatters"
import type { ParticipantRow } from "./types"

const props = defineProps<{ row: ParticipantRow }>()

const TAGGED_PLACES = 4

const podiumLabel = computed(() => {
  const r = props.row
  if (r.isSecondPlace) return "2nd Place"
  if (r.isThirdPlace) return "3rd Place"
  if (r.isFourthPlace) return "4th Place"
  return null
})
</script>

<template>
  <span
    v-if="row.isWinner"
    class="place-tag place-tag--solid"
    :style="{ background: row.team.color }"
  >
    1st Place
  </span>

  <template v-else-if="row.leaguePosition !== null && row.leaguePosition > 1">
    <span v-if="row.tierLabel && row.posInTier !== null" class="tier-pos">
      <span class="tier-name-tag">{{ row.tierLabel }}</span>
      {{ ordinalSuffix(row.posInTier) }} Place
    </span>
    <span
      v-else-if="row.leaguePosition <= TAGGED_PLACES"
      class="place-tag"
      :style="{
        borderColor: leaguePlaceTag(row.leaguePosition).color,
        color: leaguePlaceTag(row.leaguePosition).color,
      }"
    >
      {{ leaguePlaceTag(row.leaguePosition).label }}
    </span>
    <span v-else class="muted-text">{{ ordinalSuffix(row.leaguePosition) }} Place</span>
  </template>

  <span
    v-else-if="podiumLabel"
    class="place-tag"
    :style="{ borderColor: row.team.color, color: row.team.color }"
  >
    {{ podiumLabel }}
  </span>

  <span v-else-if="row.eliminatedRound !== null" class="muted-text">
    {{ eliminationLabel(row) }}
  </span>

  <span v-else class="muted-text">—</span>
</template>

<style scoped>
.place-tag {
  display: inline-block;
  padding: 1px var(--sp-2);
  border-radius: var(--radius);
  font-size: var(--fs-sm);
  font-weight: 600;
  background: transparent;
  border: 1px solid;
}

/* The champion's tag is filled with the team colour instead of outlined. */
.place-tag--solid {
  border-color: transparent;
  font-weight: 400;
  color: var(--on-accent);
}

.muted-text {
  color: var(--text-muted);
  font-size: var(--fs-sm);
}

.tier-pos {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.tier-name-tag {
  font-size: var(--fs-xs);
  font-weight: 600;
  padding: 1px var(--sp-1);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--border-light) 80%, transparent);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}
</style>
