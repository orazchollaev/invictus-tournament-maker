<script setup lang="ts">
/**
 * Team picker built on reka-ui Select — a real dropdown (trigger click opens
 * it immediately, like a native <select>) with a search box inside the
 * popup to filter long team lists. Combobox was tried first but its input
 * only opens the list via keyboard/typing by default, which read as broken.
 */
import { ref, computed } from "vue"
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from "reka-ui"
import { ChevronDown, Check } from "@lucide/vue"
import { AppIcon, AppSearchInput } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"

const props = withDefaults(
  defineProps<{
    teams: Team[]
    placeholder?: string
    /** Prepends an "All teams" pseudo-option (sentinel value `"all"`). */
    allowAll?: boolean
  }>(),
  { allowAll: false }
)

const model = defineModel<string>({ required: true })
const { t } = useI18n()

const selectedTeam = computed(() => props.teams.find((tm) => tm.id === model.value))
const search = ref("")

const filteredTeams = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? props.teams.filter((tm) => tm.name.toLowerCase().includes(q)) : props.teams
})

// Search state is local to the popup — drop it once the popup closes so it
// starts fresh next time, instead of silently hiding teams on reopen.
function onOpenChange(open: boolean) {
  if (!open) search.value = ""
}
</script>

<template>
  <SelectRoot v-model="model" @update:open="onOpenChange">
    <SelectTrigger class="tsel-trigger">
      <SelectValue class="tsel-value" :placeholder="placeholder">
        <TeamBadge v-if="selectedTeam" :team="selectedTeam" :size="14" />
        <span v-else-if="model === 'all'">{{ t("players.filter.allTeams") }}</span>
      </SelectValue>
      <SelectIcon class="tsel-icon">
        <AppIcon :icon="ChevronDown" size="xs" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent class="tsel-content" :side-offset="4" position="popper">
        <div class="tsel-search-wrap" @keydown.stop @pointerdown.stop>
          <AppSearchInput
            v-model="search"
            size="sm"
            :placeholder="t('players.filter.searchPlaceholder')"
          />
        </div>
        <SelectViewport class="tsel-viewport">
          <SelectItem v-if="allowAll" value="all" class="tsel-item">
            <SelectItemText>{{ t("players.filter.allTeams") }}</SelectItemText>
            <SelectItemIndicator class="tsel-item-check">
              <AppIcon :icon="Check" size="xs" />
            </SelectItemIndicator>
          </SelectItem>
          <SelectItem v-for="tm in filteredTeams" :key="tm.id" :value="tm.id" class="tsel-item">
            <SelectItemText>
              <TeamBadge :team="tm" :size="14" />
            </SelectItemText>
            <SelectItemIndicator class="tsel-item-check">
              <AppIcon :icon="Check" size="xs" />
            </SelectItemIndicator>
          </SelectItem>
          <p v-if="!filteredTeams.length && !allowAll" class="tsel-empty">
            {{ t("players.filter.noResults") }}
          </p>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style scoped>
/* Matches the plain <input>/<select> baseline (elements.css) exactly, so
   this reads as the same form control as the name field next to it. */
.tsel-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: var(--fs-md);
  font-weight: 400;
  font-family: var(--font-ui);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.tsel-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.tsel-value {
  flex: 1;
  min-width: 0;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* TeamBadge sizes its name span down for compact list rows — reset it here
   so the selected value reads at the same size/weight as any other field. */
.tsel-value :deep(.name) {
  font-size: inherit;
  font-weight: inherit;
}

.tsel-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>

<!-- Unscoped: SelectPortal teleports content to <body>, past scoped-attr propagation. -->
<style>
.tsel-content {
  z-index: 1000;
  width: var(--reka-select-trigger-width);
  max-height: 280px;
  padding: var(--sp-1);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--elev-2);
  overflow: hidden;
}

.tsel-search-wrap {
  padding: var(--sp-1);
  flex-shrink: 0;
}

.tsel-viewport {
  overflow-y: auto;
}

.tsel-empty {
  padding: var(--sp-3);
  margin: 0;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.tsel-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-radius: calc(var(--radius) - 3px);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text);
  cursor: pointer;
  outline: none;
  user-select: none;
}

.tsel-item[data-highlighted] {
  background: var(--bg-hover);
}

.tsel-item[data-state="checked"] {
  color: var(--accent);
  font-weight: 600;
}

.tsel-item-check {
  margin-left: auto;
  display: flex;
  color: var(--accent);
  flex-shrink: 0;
}

.tsel-content[data-state="open"] {
  animation: tsel-content-in 0.14s ease-out both;
}
.tsel-content[data-state="closed"] {
  animation: tsel-content-out 0.1s ease-in both;
}

@keyframes tsel-content-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes tsel-content-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tsel-content[data-state="open"],
  .tsel-content[data-state="closed"] {
    animation: none;
  }
}
</style>
