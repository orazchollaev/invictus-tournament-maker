<script setup lang="ts">
/**
 * One side's eleven, with what each of them did. Positions are grouped in
 * pitch order (GK first, forwards last) so the list reads like a team
 * sheet rather than a database dump.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { Star } from "@lucide/vue"
import { AppTable } from "@/components/ui"
import { usePlayersStore } from "@/modules/players/store"
import PlayerRatingChip from "@/modules/players/components/PlayerRatingChip.vue"
import type { PlayerMatchLine } from "../../types"
import type { PlayerPosition } from "@/modules/players/types"

const props = withDefaults(
  defineProps<{
    lines: PlayerMatchLine[]
    teamName: string
    teamColor: string
    /** Highest-rated player across both sides, marked with a star. */
    manOfTheMatch?: string | null
  }>(),
  { manOfTheMatch: null }
)

const { t } = useI18n()
const router = useRouter()
const playersStore = usePlayersStore()

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]

const rows = computed(() =>
  [...props.lines]
    .sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
    .map((line, index) => {
      const player = line.playerId ? playersStore.byId(line.playerId) : undefined
      return {
        key: `${line.playerId ?? "unknown"}-${index}`,
        line,
        name: player?.name ?? t("matchStats.unknownPlayer"),
        number: player?.number,
        known: !!player,
      }
    })
)

function open(playerId: string | null, known: boolean) {
  if (!playerId || !known) return
  void router.push(`/players/${playerId}`)
}
</script>

<template>
  <div class="side">
    <p class="side-head" :style="{ '--tc': teamColor }">{{ teamName }}</p>

    <AppTable dense>
      <thead>
        <tr>
          <th>{{ t("matchStats.player") }}</th>
          <th class="num" :title="t('matchStats.goalsFull')">{{ t("matchStats.goalsShort") }}</th>
          <th class="num" :title="t('matchStats.assistsFull')">
            {{ t("matchStats.assistsShort") }}
          </th>
          <th class="num">{{ t("matchStats.ratingShort") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          :class="{ 'row--link': row.known, 'row--unknown': !row.known }"
          @click="open(row.line.playerId, row.known)"
        >
          <td>
            <span class="player">
              <span class="pos" :data-pos="row.line.position">{{ row.line.position }}</span>
              <span class="name">
                <span v-if="row.number" class="shirt">{{ row.number }}</span>
                {{ row.name }}
              </span>
              <Star
                v-if="manOfTheMatch && row.line.playerId === manOfTheMatch"
                :size="11"
                class="motm"
                :aria-label="t('matchStats.manOfTheMatch')"
              />
              <span
                v-if="row.line.red"
                class="card card--red"
                :title="t('matchStats.events.red')"
              />
              <span
                v-else-if="row.line.yellow"
                class="card card--yellow"
                :title="t('matchStats.events.yellow')"
              />
            </span>
          </td>
          <td class="num">{{ row.line.goals || "–" }}</td>
          <td class="num">{{ row.line.assists || "–" }}</td>
          <td class="num">
            <PlayerRatingChip :rating="row.line.rating" />
          </td>
        </tr>
      </tbody>
    </AppTable>
  </div>
</template>

<style scoped>
.side {
  min-width: 0;
}

.side-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-1);
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.side-head::before {
  content: "";
  width: 3px;
  height: 12px;
  border-radius: var(--radius-pill);
  background: var(--tc);
}

.player {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

/* Position tag doubles as the grouping cue — same width for every row so
   the names line up into a column. */
.pos {
  flex-shrink: 0;
  width: 2.6em;
  padding: 1px 0;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  color: var(--text-muted);
}
.pos[data-pos="GK"] {
  color: var(--accent-2);
  background: color-mix(in srgb, var(--accent-2) 12%, transparent);
}

.name {
  display: flex;
  align-items: baseline;
  gap: var(--sp-1);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shirt {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.card {
  width: 8px;
  height: 11px;
  flex-shrink: 0;
  border-radius: 1px;
}
.card--yellow {
  background: var(--warning);
}
.motm {
  flex-shrink: 0;
  color: var(--gold-text);
  fill: var(--gold);
}

.card--red {
  background: var(--danger);
}

.num {
  text-align: end;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.row--link {
  cursor: pointer;
}
.row--link:hover {
  background: var(--bg-hover);
}
.row--unknown .name {
  color: var(--text-muted);
  font-style: italic;
}
</style>
