<script setup lang="ts">
/**
 * "Your next match." The one place a user who is managing a side is told
 * what he owes the season, and the one button that takes him into it.
 *
 * It opens the ordinary score modal rather than a manager-only screen, so
 * the result is committed through exactly the same path every other fixture
 * uses — and so the escape hatches (simulate it, type a score, watch it) stay
 * available for a match the user does not feel like managing.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ClipboardList } from "@lucide/vue"
import { AppButton, AppCard, AppChip } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import { legOf, nextManagedFixture } from "@/modules/tournament/utils/managerFixtures"
import type { MatchEntry } from "@/engine"

const props = defineProps<{ tournamentId: string }>()

const { t } = useI18n()
const store = useTournamentStore()
const teamsStore = useTeamsStore()

const tournament = computed(() => store.tournaments.find((x) => x.id === props.tournamentId))
const fixture = computed<MatchEntry | null>(() =>
  tournament.value ? nextManagedFixture(tournament.value) : null
)

const managedTeam = computed(() =>
  teamsStore.teams.find((tm) => tm.id === tournament.value?.manager?.teamId)
)
const homeTeam = computed(() => teamsStore.teams.find((tm) => tm.id === fixture.value?.homeId))
const awayTeam = computed(() => teamsStore.teams.find((tm) => tm.id === fixture.value?.awayId))

const stageLabel = computed(() => {
  const src = fixture.value?.source
  if (!src) return ""
  if (src.kind === "group") return src.groupName
  if (src.kind === "league")
    return src.tierName ? `${src.tierName} · ${src.matchdayName}` : src.matchdayName
  if (src.kind === "third-place") return t("rounds.thirdPlace")
  return src.roundName
})

/** A knockout tie has to produce a winner — except in the first leg of two. */
const requiresWinner = computed(() => {
  const entry = fixture.value
  if (!entry) return false
  if (entry.source.kind !== "knockout" && entry.source.kind !== "third-place") return false
  return !entry.isDoubleLeg || legOf(entry) === 2
})

/** Leg 2 counts the first leg, flipped into this leg's home/away frame. */
const aggregateOffset = computed(() => {
  const entry = fixture.value
  if (!entry || legOf(entry) !== 2) return null
  const leg1 = entry.match.result
  if (!leg1) return null
  return { home: leg1.away, away: leg1.home }
})

const open = ref(false)

function save(home: number, away: number, penHome?: number, penAway?: number) {
  const entry = fixture.value
  if (!entry) return
  store.setFixtureResult(props.tournamentId, entry, home, away, penHome, penAway)
}
</script>

<template>
  <AppCard v-if="fixture && managedTeam" variant="outlined" padding="md" class="mb-card">
    <div class="mb-row">
      <div class="mb-lead">
        <ClipboardList :size="16" class="mb-icon" />
        <div class="mb-labels">
          <span class="mb-title">{{ t("manager.banner.title", { team: managedTeam.name }) }}</span>
          <AppChip square size="xs">{{ stageLabel }}</AppChip>
        </div>
      </div>

      <div class="mb-fixture">
        <TeamBadge :team="homeTeam" :size="20" />
        <span class="mb-vs">{{ t("common.vs") }}</span>
        <TeamBadge :team="awayTeam" :size="20" />
      </div>

      <AppButton variant="filled" @click="open = true">
        {{ t("manager.banner.play") }}
      </AppButton>
    </div>

    <MatchScoreModal
      v-if="open"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="fixture.result"
      :requires-winner="requiresWinner"
      :subtitle="stageLabel"
      :match-id="fixture.match.id"
      :leg="legOf(fixture)"
      :aggregate-offset="aggregateOffset"
      @save="save"
      @close="open = false"
    />
  </AppCard>
</template>

<style scoped>
.mb-card {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

.mb-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.mb-lead {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
.mb-icon {
  flex-shrink: 0;
  color: var(--accent);
}
.mb-labels {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  min-width: 0;
}
.mb-title {
  font-size: var(--fs-sm);
  font-weight: 700;
}

.mb-fixture {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
  min-width: 0;
}
.mb-vs {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .mb-row {
    gap: var(--sp-2);
  }
  .mb-fixture {
    flex-basis: 100%;
  }
}
</style>
