<script setup lang="ts">
/**
 * Career totals across every tournament and season. Keepers get their own
 * two cells — saves and goals conceded say nothing about a striker, and an
 * empty column says even less.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppCard } from "@/components/ui"
import PlayerRatingChip from "../PlayerRatingChip.vue"
import type { CareerTotals } from "@/modules/players/composables/usePlayerCareer"
import type { PlayerPosition } from "@/modules/players/types"

const props = withDefaults(
  defineProps<{
    totals: CareerTotals
    position: PlayerPosition
    /** No matches on record yet — show the shape, explain the zeros. */
    empty?: boolean
  }>(),
  { empty: false }
)

const { t } = useI18n()

const cells = computed(() => {
  const base = [
    { key: "apps", label: t("playerDetail.apps"), value: String(props.totals.apps) },
    {
      key: "goals",
      label: t("playerDetail.goals"),
      value: String(props.totals.goals),
      accent: true,
    },
    { key: "assists", label: t("playerDetail.assists"), value: String(props.totals.assists) },
    { key: "yellow", label: t("playerDetail.yellowCards"), value: String(props.totals.yellow) },
    { key: "red", label: t("playerDetail.redCards"), value: String(props.totals.red) },
  ]

  if (props.position === "GK") {
    base.push(
      { key: "saves", label: t("playerDetail.saves"), value: String(props.totals.saves) },
      { key: "conceded", label: t("playerDetail.conceded"), value: String(props.totals.conceded) }
    )
  }

  base.push({
    key: "cleanSheets",
    label: t("playerDetail.cleanSheets"),
    value: String(props.totals.cleanSheets),
  })

  return base
})
</script>

<template>
  <AppCard padding="md" :title="t('playerDetail.careerTitle')">
    <div class="career" :class="{ 'career--empty': empty }">
      <p v-if="empty" class="empty-note">{{ t("playerDetail.emptyDesc") }}</p>
      <!-- Ratings are the headline: one number that reads the whole career. -->
      <div class="rating-row">
        <div class="rating-block">
          <span class="rating-label">{{ t("playerDetail.avgRating") }}</span>
          <PlayerRatingChip :rating="totals.rating" size="md" />
        </div>
        <div class="rating-block">
          <span class="rating-label">{{ t("playerDetail.bestRating") }}</span>
          <PlayerRatingChip :rating="totals.bestRating" size="md" />
        </div>
      </div>

      <div class="grid">
        <div v-for="cell in cells" :key="cell.key" class="cell" :data-key="cell.key">
          <span class="value" :class="{ 'value--accent': cell.accent }">{{ cell.value }}</span>
          <span class="label">{{ cell.label }}</span>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.empty-note {
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius);
  background: var(--bg);
  border: 1px dashed var(--border);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* Zeros are real information, but they should not read as a live record. */
.career--empty .grid,
.career--empty .rating-row {
  opacity: 0.55;
}

.career {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.rating-row {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex-wrap: wrap;
}

.rating-block {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.rating-label {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 84px;
  padding: var(--sp-3) var(--sp-4);
  border-inline-end: 1px solid var(--border-light);
}
.cell:last-child {
  border-inline-end: none;
}

.value {
  font-family: var(--font-mono);
  font-size: var(--fs-lg);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.value--accent {
  color: var(--accent);
}
.cell[data-key="yellow"] .value {
  color: var(--warning);
}
.cell[data-key="red"] .value {
  color: var(--danger);
}

.label {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
