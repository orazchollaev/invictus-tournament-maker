<script setup lang="ts">
/**
 * The full match report: scoreline, comparison bars, the minute rail, and
 * both team sheets. Opened from the score modal, and layered above it so
 * closing this returns to editing the score rather than to the fixture.
 *
 * The scoreline is fixed at the top — it is the context every section is
 * read against — and everything below it is tabbed. Stacked, the four
 * sections ran long enough that the team sheets were three scrolls down;
 * tabs put each one a tap away without moving the score off screen.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChartColumn, Goal, ListOrdered, Users } from "@lucide/vue"
import { AppModal, SubTabBar } from "@/components/ui"
import { useModal } from "@/composables/useModal"
import { TeamBadge } from "@/modules/teams/components"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "@/modules/tournament/types"
import MatchTeamCompare from "./MatchTeamCompare.vue"
import MatchTimeline from "./MatchTimeline.vue"
import MatchPlayerTable from "./MatchPlayerTable.vue"
import MatchShootout from "./MatchShootout.vue"

const props = defineProps<{
  homeTeam: Team | null | undefined
  awayTeam: Team | null | undefined
  result: MatchResult
  subtitle?: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const modal = ref<InstanceType<typeof AppModal> | null>(null)
useModal(() => modal.value?.close())

const stats = computed(() => props.result.stats ?? null)

const hasShootout = computed(
  () => props.result.penHome !== undefined && props.result.penAway !== undefined
)

const homeColor = computed(() => props.homeTeam?.color ?? "var(--accent)")
const awayColor = computed(() => props.awayTeam?.color ?? "var(--text-muted)")

const homeLines = computed(() => stats.value?.lines.filter((l) => l.side === "home") ?? [])
const awayLines = computed(() => stats.value?.lines.filter((l) => l.side === "away") ?? [])

/**
 * Best rating on the pitch. Only awarded to a named player — an unfilled
 * slot cannot be man of the match — and only when someone actually played
 * well, so a 0-0 between two poor sides crowns nobody.
 */
const MOTM_THRESHOLD = 7
const manOfTheMatch = computed(() => {
  const candidates = (stats.value?.lines ?? []).filter(
    (l) => l.playerId !== null && l.rating >= MOTM_THRESHOLD
  )
  if (!candidates.length) return null
  return candidates.reduce((best, line) => (line.rating > best.rating ? line : best))
})

type ReportTab = "timeline" | "stats" | "shootout" | "lineups"

/** The shootout tab only exists for a tie that went to penalties. */
const tabs = computed(() => {
  const list = [
    { value: "timeline", label: t("matchStats.timeline"), icon: ListOrdered },
    { value: "stats", label: t("matchStats.comparison"), icon: ChartColumn },
  ]
  if (stats.value?.shootout?.length) {
    list.push({ value: "shootout", label: t("matchStats.shootoutShort"), icon: Goal })
  }
  list.push({ value: "lineups", label: t("matchStats.lineups"), icon: Users })
  return list
})

// Opens on the timeline: the first question a match report answers is what
// happened, not how the possession split.
const activeTab = ref<ReportTab>("timeline")
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('matchStats.title')"
    width="min(760px, 100vw)"
    :z-index="1030"
    @close="emit('close')"
  >
    <div class="report">
      <!-- Scoreline. The one loud element: everything below it is quiet. -->
      <header class="score" :style="{ '--home': homeColor, '--away': awayColor }">
        <div class="score-side">
          <TeamBadge :team="homeTeam" :size="26" />
        </div>
        <div class="score-mid">
          <p class="score-line">
            <span>{{ result.home }}</span>
            <span class="score-dash">–</span>
            <span>{{ result.away }}</span>
          </p>
          <p v-if="result.ft" class="score-pens">
            {{ t("matchStats.aetFull", { home: result.ft.home, away: result.ft.away }) }}
          </p>
          <p v-if="hasShootout" class="score-pens">
            {{ t("matchStats.shootout", { home: result.penHome, away: result.penAway }) }}
          </p>
          <p v-if="subtitle" class="score-sub">{{ subtitle }}</p>
        </div>
        <div class="score-side score-side--away">
          <TeamBadge :team="awayTeam" :size="26" reverse />
        </div>
      </header>

      <template v-if="stats">
        <SubTabBar
          :options="tabs"
          :model-value="activeTab"
          @update:model-value="(v) => (activeTab = v as ReportTab)"
        />

        <section class="panel">
          <MatchTimeline v-if="activeTab === 'timeline'" :events="stats.events" />

          <MatchTeamCompare
            v-else-if="activeTab === 'stats'"
            :stats="stats.team"
            :home-color="homeColor"
            :away-color="awayColor"
          />

          <MatchShootout
            v-else-if="activeTab === 'shootout' && stats.shootout"
            :kicks="stats.shootout"
            :home-color="homeColor"
            :away-color="awayColor"
          />

          <div v-else class="sheets">
            <MatchPlayerTable
              :lines="homeLines"
              :team-name="homeTeam?.name ?? t('matchStats.home')"
              :team-color="homeColor"
              :man-of-the-match="manOfTheMatch?.playerId ?? null"
            />
            <MatchPlayerTable
              :lines="awayLines"
              :team-name="awayTeam?.name ?? t('matchStats.away')"
              :team-color="awayColor"
              :man-of-the-match="manOfTheMatch?.playerId ?? null"
            />
          </div>
        </section>
      </template>

      <p v-else class="legacy">{{ t("matchStats.legacyNotice") }}</p>
    </div>
  </AppModal>
</template>

<style scoped>
.report {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.panel {
  padding-top: var(--sp-2);
}

/* ── Scoreline ─────────────────────────────────────────────────── */
/* Stays put while the panels change under it, so the result is in view
   whichever section is open. */
.score {
  position: sticky;
  top: 0;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--home) 10%, var(--surface)),
    var(--surface) 45%,
    var(--surface) 55%,
    color-mix(in srgb, var(--away) 10%, var(--surface))
  );
}

.score-side {
  font-size: var(--fs-md) !important;
  min-width: 0;
}
.score-side--away {
  display: flex;
  justify-content: flex-end;
  width: fit-content;
  margin-left: auto;
}

.score-mid {
  text-align: center;
}

.score-line {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--sp-2);
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-2xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.score-dash {
  color: var(--text-muted);
  font-weight: 400;
}

.score-pens,
.score-sub {
  margin: var(--sp-1) 0 0;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  white-space: nowrap;
}
.score-pens {
  font-family: var(--font-mono);
  color: var(--accent-2);
}

.sheets {
  display: grid;
  gap: var(--sp-5);
}

.legacy {
  margin: 0;
  padding: var(--sp-5) var(--sp-3);
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

@media (min-width: 640px) {
  .sheets {
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-4);
  }
}
</style>
