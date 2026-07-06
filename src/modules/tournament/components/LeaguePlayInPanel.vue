<script setup lang="ts">
import { reactive } from "vue"
import { useI18n } from "vue-i18n"
import type { Round } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  playIn: Round
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [matchIdx: number, home: number, away: number]
}>()

const { t } = useI18n()

const drafts = reactive<Record<number, { home: string; away: string }>>({})

function teamById(id: string | null) {
  return props.teams.find((tm) => tm.id === id)
}

function draftFor(i: number) {
  if (!drafts[i]) drafts[i] = { home: "", away: "" }
  return drafts[i]
}

function commit(i: number) {
  const d = drafts[i]
  const home = parseInt(d?.home ?? "")
  const away = parseInt(d?.away ?? "")
  if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return
  emit("setResult", i, home, away)
}
</script>

<template>
  <div class="lpi-wrap">
    <div class="lpi-title">{{ t("leaguePlayoff.playInTitle") }}</div>
    <div class="lpi-matches">
      <div v-for="(match, i) in playIn.matches" :key="match.id" class="lpi-match">
        <TeamBadge :team="teamById(match.homeId)" class="lpi-team lpi-team--home" />
        <template v-if="match.result">
          <span class="lpi-score">{{ match.result.home }} – {{ match.result.away }}</span>
        </template>
        <template v-else>
          <input
            v-model="draftFor(i).home"
            class="lpi-score-input"
            type="number"
            min="0"
            max="20"
            @keyup.enter="commit(i)"
          />
          <span class="lpi-sep">–</span>
          <input
            v-model="draftFor(i).away"
            class="lpi-score-input"
            type="number"
            min="0"
            max="20"
            @keyup.enter="commit(i)"
          />
          <button class="primary lpi-btn-xs" @click="commit(i)">✓</button>
        </template>
        <TeamBadge :team="teamById(match.awayId)" class="lpi-team lpi-team--away" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lpi-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.lpi-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.lpi-matches {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lpi-match {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 12px;
}
.lpi-team {
  flex: 1;
  min-width: 0;
}
.lpi-team--home {
  flex-direction: row-reverse;
  justify-content: flex-end;
}
.lpi-score {
  font-weight: 700;
  min-width: 40px;
  text-align: center;
}
.lpi-score-input {
  width: 34px;
  text-align: center;
  padding: 2px 3px;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.lpi-sep {
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}
.lpi-btn-xs {
  padding: 1px 6px;
  font-size: 11px;
  flex-shrink: 0;
}
</style>
