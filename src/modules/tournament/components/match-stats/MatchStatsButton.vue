<script setup lang="ts">
/**
 * Opens the match report from wherever a played match is listed.
 *
 * The report used to live only behind the score modal's footer, which meant
 * you had to reopen a match you had just saved to discover it existed. This
 * is self-contained — it owns its own modal — so a fixture row, a group
 * table or a bracket card adds the entry point with one line and no state.
 *
 * Renders nothing at all for a match that has no report, so callers never
 * have to guard it themselves.
 */
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChartColumn } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import MatchStatsModal from "./MatchStatsModal.vue"

withDefaults(
  defineProps<{
    homeTeam: Team | null | undefined
    awayTeam: Team | null | undefined
    result: MatchResult | null | undefined
    subtitle?: string
    size?: "xs" | "sm"
  }>(),
  { size: "sm" }
)

const { t } = useI18n()
const open = ref(false)
</script>

<template>
  <button
    v-if="result?.stats"
    type="button"
    class="stats-btn"
    :class="`stats-btn--${size}`"
    :title="t('matchStats.title')"
    :aria-label="t('matchStats.title')"
    @click.stop="open = true"
  >
    <ChartColumn :size="size === 'xs' ? 11 : 13" />
  </button>

  <MatchStatsModal
    v-if="open && result"
    :home-team="homeTeam"
    :away-team="awayTeam"
    :result="result"
    :subtitle="subtitle"
    @close="open = false"
  />
</template>

<style scoped>
.stats-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: var(--accent-subtle);
  color: var(--accent);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.stats-btn--sm {
  width: 22px;
  height: 22px;
}
.stats-btn--xs {
  width: 18px;
  height: 18px;
}

.stats-btn:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: var(--accent);
}

.stats-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (prefers-reduced-motion: reduce) {
  .stats-btn {
    transition: none;
  }
}
</style>
