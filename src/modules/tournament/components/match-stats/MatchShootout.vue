<script setup lang="ts">
/**
 * The shootout, kick by kick. Home kicks run down the left, away down the
 * right, in the order they were taken — so the moment the tie was decided
 * is the row where one column runs out of ticks.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { usePlayersStore } from "@/modules/players/store"
import type { ShootoutKick } from "../../types"

const props = defineProps<{
  kicks: ShootoutKick[]
  homeColor: string
  awayColor: string
}>()

const { t } = useI18n()
const playersStore = usePlayersStore()

function nameOf(playerId: string | null): string {
  if (!playerId) return t("matchStats.unknownPlayer")
  return playersStore.byId(playerId)?.name ?? t("matchStats.unknownPlayer")
}

/** Pair each round's two kicks so the two columns stay level. */
const rounds = computed(() => {
  const home = props.kicks.filter((k) => k.side === "home")
  const away = props.kicks.filter((k) => k.side === "away")
  const count = Math.max(home.length, away.length)

  return Array.from({ length: count }, (_, i) => ({
    round: i + 1,
    home: home[i],
    away: away[i],
  }))
})
</script>

<template>
  <ol class="shootout" :style="{ '--home': homeColor, '--away': awayColor }">
    <li v-for="row in rounds" :key="row.round" class="so-round">
      <div class="so-kick so-kick--home">
        <template v-if="row.home">
          <span class="so-name">{{ nameOf(row.home.playerId) }}</span>
          <span class="so-mark" :class="row.home.scored ? 'so-mark--in' : 'so-mark--out'">
            {{ row.home.scored ? "●" : "×" }}
          </span>
        </template>
      </div>

      <span class="so-round-no">{{ row.round }}</span>

      <div class="so-kick so-kick--away">
        <template v-if="row.away">
          <span class="so-mark" :class="row.away.scored ? 'so-mark--in' : 'so-mark--out'">
            {{ row.away.scored ? "●" : "×" }}
          </span>
          <span class="so-name">{{ nameOf(row.away.playerId) }}</span>
        </template>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.shootout {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.so-round {
  display: grid;
  grid-template-columns: 1fr 1.6rem 1fr;
  align-items: center;
  gap: var(--sp-2);
}

.so-kick {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}
.so-kick--home {
  flex-direction: row-reverse;
}

.so-name {
  font-size: var(--fs-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.so-mark {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  line-height: 1;
}
.so-mark--in {
  color: var(--success);
}
.so-mark--out {
  color: var(--danger);
}

.so-round-no {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-align: center;
}
</style>
