<script setup lang="ts">
/**
 * One phase of a custom tournament, rendered by whichever kind it is.
 *
 * It takes the phase id rather than a prepared view, and builds that view here,
 * for two reasons. One is scope: a component is a render boundary, so a result
 * entered in another phase cannot re-render this one. The other is dependency
 * width — the detail page used to build every phase's view in a single computed
 * that spread the whole tournament, so *any* change invalidated *all* of them
 * and handed every panel a new object identity. Reading only the fields a panel
 * needs keeps that from happening.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { AppSubTabBar } from "@/components/ui"
import { phaseDestinations } from "@/engine"
import { phaseTournamentView } from "@/modules/tournament/utils/phaseView"
import { BracketPanel } from "@/modules/tournament/components/bracket"
import { GroupStage, WildcardRankings } from "@/modules/tournament/components/group"
import { LeagueView } from "@/modules/tournament/components/league"

const props = defineProps<{
  tournament: Tournament
  phaseId: string
  teams: Team[]
}>()

const { t } = useI18n()

const phase = computed<TournamentPhase | undefined>(() =>
  props.tournament.phases?.find((p) => p.id === props.phaseId)
)

const view = computed(() => {
  const p = phase.value
  return p ? phaseTournamentView(props.tournament, p) : undefined
})

const hasWildcards = computed(
  () => phase.value?.config.kind === "group" && phase.value.config.group.wildcardCount > 0
)

/**
 * Which places of this phase's table go where, as colour bands. A group phase
 * does not get them: its own card already tints the automatic places and the
 * wildcard row, which is the same information in the shape that format has
 * always used.
 */
const bands = computed(() => {
  const p = phase.value
  if (!p || p.kind === "group") return undefined
  const destinations = phaseDestinations(props.tournament, p.id)
  if (!destinations.length) return undefined
  return destinations.map((d, i) => ({
    fromRank: d.fromRank,
    toRank: d.toRank,
    label: d.target.name,
    colorIdx: i,
  }))
})

const groupView = ref<"groups" | "wildcards">("groups")
</script>

<template>
  <div v-if="phase && view" class="phase-panel">
    <div v-if="phase.status === 'pending'" class="locked-panel">
      {{ t("tournament.phases.notStarted") }}
    </div>

    <template v-else-if="phase.kind === 'group'">
      <!-- Same pair of views the fixed group format offers: the tables, and the
           race for the wildcard places when the phase has any. -->
      <div v-if="hasWildcards" class="gs-subtab-row">
        <AppSubTabBar
          v-model="groupView"
          :options="[
            { value: 'groups', label: t('tournament.tabs.groups') },
            { value: 'wildcards', label: t('tournament.tabs.wildcards') },
          ]"
        />
      </div>
      <div class="gs-body">
        <GroupStage
          v-if="!hasWildcards || groupView === 'groups'"
          :tournament="view"
          :teams="teams"
        />
        <WildcardRankings v-else :tournament="view" :teams="teams" />
      </div>
    </template>

    <BracketPanel
      v-else-if="phase.kind === 'knockout'"
      :tournament="view"
      :teams="teams"
      :phase-id="phase.id"
      :title="phase.name"
    />

    <LeagueView
      v-else
      :tournament="view"
      :teams="teams"
      :league-override="phase.league"
      :bands="bands"
    />
  </div>
</template>

<style scoped>
/* Passes the tab panel's height straight through. The bracket sizes itself with
   `height: 100%` and a flex viewport inside it, so against an auto-height parent
   it collapses to nothing and the bracket simply does not appear — which is what
   wrapping the panels in this div did. Group and league tables are auto-height
   and grow past it instead, which the tab panel scrolls, exactly as before. */
.phase-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  height: 100%;
}

/* Copies of the detail page's own panel helpers: they are scoped there, and a
   phase panel has to look the same as the fixed-format panel it replaces. */
.gs-subtab-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.locked-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  padding: var(--sp-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
</style>
