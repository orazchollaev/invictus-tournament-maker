<script setup lang="ts">
import { computed } from "vue"
import { ChevronRight, Users } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import { FlagCircle } from "@/modules/teams/components"

/**
 * Compact entry point to team selection: label, count and a crest preview.
 * The list itself lives in TeamSelectorFullscreenModal, opened on click.
 */
const props = defineProps<{ teams: Team[]; selected: string[]; label?: string }>()
defineEmits<{ click: [] }>()

/** How many crests to show before collapsing the rest into "+N". */
const PREVIEW_COUNT = 5

const selectedTeams = computed(() => {
  const byId = new Map(props.teams.map((tm) => [tm.id, tm]))
  return props.selected.map((id) => byId.get(id)).filter((tm): tm is Team => !!tm)
})
const preview = computed(() => selectedTeams.value.slice(0, PREVIEW_COUNT))
const overflow = computed(() => selectedTeams.value.length - preview.value.length)
const tooFew = computed(() => selectedTeams.value.length < 2)
</script>

<template>
  <button type="button" class="tsb" @click="$emit('click')">
    <span class="tsb-icon">
      <Users :size="18" />
    </span>

    <span class="tsb-text">
      <span class="tsb-label">{{ label ?? $t("tournament.create.teams") }}</span>
      <span class="tsb-summary" :class="{ 'tsb-summary--warn': tooFew }">
        <template v-if="!selectedTeams.length">{{ $t("teamSelector.emptySelected") }}</template>
        <template v-else-if="tooFew">{{ $t("teamSelector.minTeams") }}</template>
        <template v-else>{{ $t("common.teams", { n: selectedTeams.length }) }}</template>
      </span>
    </span>

    <span v-if="preview.length" class="tsb-stack">
      <span v-for="tm in preview" :key="tm.id" class="tsb-crest">
        <img v-if="tm.image" :src="tm.image" alt="" class="tsb-crest-img" />
        <FlagCircle v-else-if="tm.flag" :code="tm.flag" :size="22" />
        <span v-else class="tsb-crest-dot" :style="{ background: tm.color }" />
      </span>
      <span v-if="overflow > 0" class="tsb-more">+{{ overflow }}</span>
    </span>

    <ChevronRight :size="16" class="tsb-chevron" />
  </button>
</template>

<style scoped>
.tsb {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2);
  background: var(--bg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  font-family: var(--font-ui);
  text-align: start;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tsb:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
[data-design="ios"] .tsb:active {
  opacity: 0.6;
}
[data-design="android"] .tsb:active {
  box-shadow: inset 0 0 0 999px color-mix(in srgb, var(--accent) 10%, transparent);
}

.tsb-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.tsb-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}
.tsb-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tsb-summary {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tsb-summary--warn {
  color: var(--danger);
}

.tsb-stack {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.tsb-crest,
.tsb-more {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  background: var(--bg);
  box-shadow: 0 0 0 2px var(--bg);
}
.tsb-crest + .tsb-crest,
.tsb-crest + .tsb-more {
  margin-inline-start: -8px;
}
.tsb-crest-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}
.tsb-crest-dot {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-pill);
}
.tsb-more {
  width: auto;
  min-width: 26px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--bg));
}

.tsb-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>
