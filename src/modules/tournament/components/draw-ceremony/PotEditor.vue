<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { VueDraggable } from "vue-draggable-plus"
import type { Team } from "@/modules/teams/types"
import type { Pot } from "@/engine"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  pots: Pot[]
  teams: Team[]
  errors: string[]
  readonly?: boolean
}>()

defineEmits<{ reset: [] }>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)
</script>

<template>
  <div class="pe-wrap">
    <div class="pe-top">
      <p class="pe-hint">
        {{ t(readonly ? "drawCeremony.crossLocked" : "drawCeremony.potsHint") }}
      </p>
      <button v-if="!readonly" class="pe-reset" @click="$emit('reset')">
        {{ t("drawCeremony.resetPots") }}
      </button>
    </div>

    <div v-if="errors.length" class="pe-errors">
      <span v-for="e in errors" :key="e">{{ t(`drawCeremony.errors.${e}`) }}</span>
    </div>

    <div class="pe-pots">
      <div v-for="(pot, i) in pots" :key="i" class="pe-pot">
        <div class="pe-pot-head">
          <span class="pe-pot-label">{{ pot.label }}</span>
          <span class="pe-pot-count">{{ pot.teamIds.length }}</span>
        </div>
        <VueDraggable
          v-model="pot.teamIds"
          :group="{ name: 'pots' }"
          :animation="150"
          :delay="120"
          :delay-on-touch-only="true"
          :disabled="readonly"
          ghost-class="pe-ghost"
          class="pe-pot-list"
          :class="{ 'pe-pot-list--locked': readonly }"
        >
          <div v-for="id in pot.teamIds" :key="id" class="pe-team">
            <TeamBadge :team="teamById(id)" :size="12" class="pe-name" />
          </div>
        </VueDraggable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pe-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pe-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pe-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}
.pe-reset {
  font-size: 11px;
  padding: 3px 9px;
  flex-shrink: 0;
}
.pe-errors {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--danger);
}
.pe-pots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}
.pe-pot {
  border: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
}
.pe-pot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
}
.pe-pot-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.03em;
}
.pe-pot-count {
  font-size: 10px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.pe-pot-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
  min-height: 36px;
}
.pe-team {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: grab;
  touch-action: manipulation;
  user-select: none;
}
.pe-team:active {
  cursor: grabbing;
}
.pe-pot-list--locked .pe-team {
  cursor: default;
}
.pe-ghost {
  opacity: 0.45;
  border-style: dashed;
  border-color: var(--accent);
}
.pe-name {
  font-size: 12px;
}

@media (max-width: 500px) {
  .pe-pots {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
