<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { ArrowLeft, ArrowLeftRight, Swords } from "@lucide/vue"
import { resolvePower } from "@/engine"
import { useTeamsStore } from "../store"
import { useTournamentStore } from "@/modules/tournament/store"
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppIcon,
  AppSectionHeader,
  AppSelect,
} from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import { CompareStatRow } from "../components/compare"
import { TeamMatchList } from "../components/detail"
import { useHeadToHead } from "../composables/useHeadToHead"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

// The pair lives in the query so the page survives a refresh and the back button
// returns to the same comparison.
function queryId(key: "a" | "b") {
  const v = route.query[key]
  return typeof v === "string" ? v : ""
}
const aId = computed({
  get: () => queryId("a"),
  set: (a) => router.replace({ query: { ...route.query, a } }),
})
const bId = computed({
  get: () => queryId("b"),
  set: (b) => router.replace({ query: { ...route.query, b } }),
})

const teamA = computed(() => teamsStore.teams.find((x) => x.id === aId.value))
const teamB = computed(() => teamsStore.teams.find((x) => x.id === bId.value))

const { statsA, statsB, meetings, summary } = useHeadToHead(
  computed(() => tournamentStore.tournaments),
  aId,
  bId
)

// A team cannot face itself, so each picker hides the other's choice.
function optionsExcluding(otherId: string) {
  return teamsStore.teams
    .filter((x) => x.id !== otherId)
    .map((x) => ({ value: x.id, label: x.name, team: x }))
    .sort((p, q) => p.label.localeCompare(q.label))
}
const optionsA = computed(() => optionsExcluding(bId.value))
const optionsB = computed(() => optionsExcluding(aId.value))

function swap() {
  router.replace({ query: { ...route.query, a: bId.value, b: aId.value } })
}

// Fixed per side, not the team colours: two blue teams must still read as two sides.
const colorA = "var(--accent)"
const colorB = "color-mix(in srgb, var(--text) 40%, transparent)"

function titles(id: string) {
  return tournamentStore.tournaments.filter((x) => x.winnerId === id).length
}

// Segments of the head-to-head bar; a zero-width segment is simply not drawn.
const split = computed(() => {
  const n = summary.value.played
  const pct = (v: number) => (n > 0 ? (v / n) * 100 : 0)
  return { a: pct(summary.value.winsA), d: pct(summary.value.draws), b: pct(summary.value.winsB) }
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        <AppButton icon-only size="sm" :aria-label="t('common.back')" @click="router.back()">
          <AppIcon :icon="ArrowLeft" size="sm" />
        </AppButton>
        {{ t("teams.compare.title") }}
      </h2>
    </div>

    <AppCard v-if="teamsStore.teams.length < 2" padding="md">
      <AppEmptyState :icon="Swords" :description="t('teams.compare.needTwoTeams')" />
    </AppCard>

    <div v-else class="stack">
      <AppCard padding="sm">
        <div class="pickers">
          <AppSelect
            v-model="aId"
            :options="optionsA"
            searchable
            :placeholder="t('teams.compare.pickTeam')"
            :search-placeholder="t('teams.searchPlaceholder')"
            :empty-text="t('teams.compare.noTeams')"
          >
            <template #option="{ option }">
              <TeamBadge :team="option.team" :size="16" />
            </template>
            <template #value="{ option }">
              <TeamBadge v-if="option" :team="option.team" :size="16" />
            </template>
          </AppSelect>
          <AppButton
            icon-only
            :disabled="!aId && !bId"
            :aria-label="t('teams.compare.swap')"
            :title="t('teams.compare.swap')"
            @click="swap"
          >
            <AppIcon :icon="ArrowLeftRight" size="sm" />
          </AppButton>
          <AppSelect
            v-model="bId"
            :options="optionsB"
            searchable
            :placeholder="t('teams.compare.pickTeam')"
            :search-placeholder="t('teams.searchPlaceholder')"
            :empty-text="t('teams.compare.noTeams')"
          >
            <template #option="{ option }">
              <TeamBadge :team="option.team" :size="16" />
            </template>
            <template #value="{ option }">
              <TeamBadge v-if="option" :team="option.team" :size="16" />
            </template>
          </AppSelect>
        </div>
      </AppCard>

      <AppCard v-if="!teamA || !teamB" padding="md">
        <AppEmptyState :icon="Swords" :description="t('teams.compare.pickBoth')" />
      </AppCard>

      <template v-else>
        <AppCard padding="md" class="hero">
          <div class="hero-teams">
            <TeamBadge :team="teamA" :size="28" class="hero-team" />
            <span class="hero-vs">{{ t("teams.compare.vs") }}</span>
            <TeamBadge :team="teamB" :size="28" reverse class="hero-team" />
          </div>

          <template v-if="summary.played">
            <div class="hero-score">
              <span class="hero-num" :style="{ color: colorA }">{{ summary.winsA }}</span>
              <span class="hero-num hero-num--draw">{{ summary.draws }}</span>
              <span class="hero-num" :style="{ color: colorB }">{{ summary.winsB }}</span>
            </div>
            <div class="hero-captions">
              <span>{{ t("teams.detail.wins") }}</span>
              <span>{{ t("teams.detail.draws") }}</span>
              <span>{{ t("teams.detail.wins") }}</span>
            </div>
            <div class="split-bar">
              <span v-if="split.a" :style="{ width: split.a + '%', background: colorA }" />
              <span v-if="split.d" :style="{ width: split.d + '%', background: 'var(--draw)' }" />
              <span v-if="split.b" :style="{ width: split.b + '%', background: colorB }" />
            </div>
            <p class="hero-goals">
              {{ t("teams.compare.goals", { a: summary.goalsA, b: summary.goalsB }) }}
              ·
              {{ t("teams.detail.matchCount", { n: summary.played }) }}
            </p>
          </template>
          <p v-else class="hero-never">{{ t("teams.compare.neverMet") }}</p>
        </AppCard>

        <div class="section">
          <AppSectionHeader :title="t('teams.compare.overall')" />
          <CompareStatRow
            :label="t('teams.detail.powerRating')"
            :a="resolvePower(teamA)"
            :b="resolvePower(teamB)"
            :color-a="colorA"
            :color-b="colorB"
          />
          <CompareStatRow
            :label="t('teams.detail.titles')"
            :a="titles(teamA.id)"
            :b="titles(teamB.id)"
            :color-a="colorA"
            :color-b="colorB"
          />
          <CompareStatRow
            :label="t('teams.detail.played')"
            :a="statsA.played"
            :b="statsB.played"
            :color-a="colorA"
            :color-b="colorB"
          />
          <CompareStatRow
            :label="t('teams.detail.winRate')"
            :a="statsA.winRate"
            :b="statsB.winRate"
            suffix="%"
            :color-a="colorA"
            :color-b="colorB"
          />
          <CompareStatRow
            :label="t('teams.detail.goalsFor')"
            :a="statsA.gf"
            :b="statsB.gf"
            :color-a="colorA"
            :color-b="colorB"
          />
        </div>

        <TeamMatchList
          v-if="meetings.length"
          selected="all"
          :matches="meetings"
          :teams="teamsStore.teams"
          :tournament-options="[]"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.pickers {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-2);
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.hero-teams {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
}
.hero-team {
  min-width: 0;
}
.hero-team :deep(.name) {
  font-size: var(--fs-base);
}
.hero-vs {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-score {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  width: 100%;
  text-align: center;
}
.hero-num {
  font-family: var(--font);
  font-size: 40px;
  line-height: 1;
}
.hero-num--draw {
  color: var(--draw);
}

.hero-captions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  width: 100%;
  text-align: center;
  margin-top: calc(var(--sp-2) * -1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.split-bar {
  display: flex;
  width: 100%;
  height: 8px;
  gap: 2px;
  border-radius: 4px;
  overflow: hidden;
}

.hero-goals,
.hero-never {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
