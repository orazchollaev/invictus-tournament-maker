<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { teamAbbr } from "@/composables/useTeamLookup"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"
import { useSettingsStore } from "@/modules/settings/store"
import { useI18n } from "vue-i18n"
import FixtureLegRow from "./FixtureLegRow.vue"
import type { FlatMatch } from "./types"

const settings = useSettingsStore()
const { t } = useI18n()

const props = defineProps<{ match: FlatMatch; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [
    match: FlatMatch,
    leg: 1 | 2,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "clear-result": [match: FlatMatch, leg: 1 | 2]
  "sim-leg1": [match: FlatMatch]
  "sim-leg2": [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

function getAbbr(id: string | null): string {
  const t = getTeam(id)
  if (!t) return "TBD"
  return settings.showTeamAbbr ? teamAbbr(t) : t.name
}

function aggLabel(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  const h = match.result.home + match.leg2Result.away
  const hPen = (match.result?.penAway || 0) + (match.leg2Result?.penAway || 0)
  const a = match.result.away + match.leg2Result.home
  const aPen = (match.result?.penHome || 0) + (match.leg2Result?.penHome || 0)

  if (hPen || aPen) return `${h + hPen} – ${a + aPen}p`
  return `${h} – ${a}`
}

function aggWinnerId(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  return getWinnerId(match)
}

/** Leg 2's row frame is home=awayId/away=homeId, so leg 1's score offsets swapped. */
function leg2AggregateOffset(match: FlatMatch): { home: number; away: number } | null {
  if (!match.result) return null
  return { home: match.result.away, away: match.result.home }
}

function onSim(leg: 1 | 2) {
  if (leg === 1) emit("sim-leg1", props.match)
  else emit("sim-leg2", props.match)
}
</script>

<template>
  <div class="tie-card">
    <!-- Who the tie is between, and where it stands on aggregate. The legs
         below never repeat this at full width. -->
    <div class="tie-hd">
      <div
        class="tie-hd-team"
        :class="{ through: aggWinnerId(match) === match.homeId }"
        :style="{ '--tc': getTeam(match.homeId)?.color ?? 'var(--border)' }"
      >
        <FlagCircle
          v-if="getTeam(match.homeId)?.flag"
          :code="getTeam(match.homeId)!.flag!"
          :size="16"
        />
        <span v-else class="cdot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
        <span class="tie-hd-name">{{ getAbbr(match.homeId) }}</span>
      </div>

      <div class="tie-hd-center">
        <span v-if="aggLabel(match)" class="agg" :class="{ 'agg--decided': aggWinnerId(match) }">
          {{ aggLabel(match) }}
        </span>
        <span v-else class="agg agg--tbd">–</span>
        <span class="agg-label">{{ t("tournament.aggregate") }}</span>
      </div>

      <div
        class="tie-hd-team tie-hd-team--r"
        :class="{ through: aggWinnerId(match) === match.awayId }"
        :style="{ '--tc': getTeam(match.awayId)?.color ?? 'var(--border)' }"
      >
        <span class="tie-hd-name">{{ getAbbr(match.awayId) }}</span>
        <FlagCircle
          v-if="getTeam(match.awayId)?.flag"
          :code="getTeam(match.awayId)!.flag!"
          :size="16"
        />
        <span v-else class="cdot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
      </div>
    </div>

    <div class="tie-legs">
      <FixtureLegRow
        :match="match"
        :leg="1"
        :home-id="match.homeId"
        :away-id="match.awayId"
        :result="match.result"
        :teams="teams"
        @set-result="(leg, h, a, ph, pa) => emit('set-result', match, leg, h, a, ph, pa)"
        @clear-result="(leg) => emit('clear-result', match, leg)"
        @sim="onSim"
      />
      <!-- Leg 2 is played at the other venue, so the sides swap. -->
      <FixtureLegRow
        :match="match"
        :leg="2"
        :home-id="match.awayId"
        :away-id="match.homeId"
        :result="match.leg2Result"
        :teams="teams"
        :disabled="!match.result"
        :aggregate-offset="leg2AggregateOffset(match)"
        @set-result="(leg, h, a, ph, pa) => emit('set-result', match, leg, h, a, ph, pa)"
        @clear-result="(leg) => emit('clear-result', match, leg)"
        @sim="onSim"
      />
    </div>
  </div>
</template>

<style scoped>
.tie-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  animation: fade-up var(--dur) var(--ease) both;
}

/* Names get the room here — the centre column is sized to the aggregate
   score rather than taking a third of the card, which is what used to
   squeeze both names into an ellipsis. */
.tie-hd {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.tie-hd-team {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
}
.tie-hd-team--r {
  flex-direction: row-reverse;
}
/* The side that went through carries its club colour. */
.tie-hd-team.through {
  font-weight: 700;
}
.tie-hd-team.through .tie-hd-name {
  color: var(--tc);
}

.tie-hd-name {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tie-hd-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}

.agg {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
  line-height: 1.1;
}
.agg--decided {
  color: var(--accent);
}
.agg--tbd {
  color: var(--text-muted);
  opacity: 0.6;
}

/* Says what the number is, once, instead of the placeholder having to. */
.agg-label {
  font-family: var(--font-ui);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.tie-legs {
  display: flex;
  flex-direction: column;
}

/* ── Colour dot (fallback when a team has no flag) ── */
/* Sized here rather than inherited — it had no dimensions at all before, so
   a team without a flag showed nothing where its badge should be. */
.cdot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}
</style>
