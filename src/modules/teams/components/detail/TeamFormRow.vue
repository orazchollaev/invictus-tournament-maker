<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { AppCard } from "@/components/ui"
import type { MatchRow } from "../../composables/useTeamMatchHistory"

defineProps<{
  form: MatchRow[]
  getTeamName: (id: string | null) => string
}>()

const { t } = useI18n()
</script>

<template>
  <AppCard padding="md">
    <template #title>
      {{ t("teams.detail.recentForm") }}
      <span class="count">({{ t("teams.detail.last5") }})</span>
    </template>

    <div class="form-row">
      <div
        v-for="(m, i) in form"
        :key="i"
        class="form-bubble"
        :class="`form-bubble--${m.outcome.toLowerCase()}`"
        :title="`${m.outcome} vs ${getTeamName(m.opponentId)} ${m.goalsFor}–${m.goalsAgainst}${m.penGoalsFor !== null ? ` (pen. ${m.penGoalsFor}–${m.penGoalsAgainst})` : ''}`"
      >
        {{ m.outcome }}
      </div>
    </div>

    <div class="form-labels">
      <span v-for="(m, i) in form" :key="i" class="form-label">
        {{ m.goalsFor }}–{{ m.goalsAgainst }}
        <template v-if="m.penGoalsFor !== null">
          <br />
          <span class="pen-tag">p.</span>
        </template>
      </span>
    </div>
  </AppCard>
</template>

<style scoped>
.form-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-1);
}

.form-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--on-accent);
  cursor: default;
}
.form-bubble--w {
  background: var(--success);
}
.form-bubble--d {
  background: var(--draw);
}
.form-bubble--l {
  background: var(--danger);
}

.form-labels {
  display: flex;
  gap: var(--sp-2);
}

.form-label {
  width: 32px;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.pen-tag {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1;
}
</style>
