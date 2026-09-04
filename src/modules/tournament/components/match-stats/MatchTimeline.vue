<script setup lang="ts">
/**
 * The match as it happened, down a minute rail: home events branch left,
 * away events branch right, and the minute sits on the spine between
 * them. A match *is* a sequence in time, so the ordering carries real
 * information — this is the one place in the app where a numbered spine
 * is telling the truth rather than decorating.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppIcon } from "@/components/ui"
import { usePlayersStore } from "@/modules/players/store"
import { useSettingsStore } from "@/modules/settings/store"
import type { MatchEvent } from "@/modules/tournament/types"
import { EVENT_META } from "./eventMeta"
import { formatMinute } from "./matchTime"

const props = withDefaults(
  defineProps<{
    events: MatchEvent[]
    /** Decides whether a minute past 90 reads as stoppage or as extra time. */
    hasExtraTime?: boolean
  }>(),
  { hasExtraTime: false }
)

const { t } = useI18n()
const playersStore = usePlayersStore()
const settings = useSettingsStore()

function nameOf(playerId: string | null): string {
  if (!playerId) return t("matchStats.unknownPlayer")
  return playersStore.byId(playerId)?.name ?? t("matchStats.unknownPlayer")
}

// Newest event first, and only the event types the user has left enabled
// in Settings.
const rows = computed(() =>
  props.events
    .map((event, index) => ({
      key: `${event.minute}-${event.type}-${index}`,
      event,
      meta: EVENT_META[event.type],
      minute: formatMinute(event.minute, props.hasExtraTime),
      scorer: nameOf(event.playerId),
      assist: event.assistId ? nameOf(event.assistId) : null,
    }))
    .filter((row) => settings.liveEventFilter[row.event.type])
    .reverse()
)
</script>

<template>
  <ol v-if="rows.length" class="timeline">
    <li
      v-for="row in rows"
      :key="row.key"
      class="tl-row"
      :class="`tl-row--${row.event.side}`"
      :style="{ '--ev-color': row.meta.color }"
    >
      <div class="tl-entry">
        <span class="tl-mark" :aria-hidden="true">
          <AppIcon
            v-if="row.meta.kind === 'icon' && row.meta.icon"
            :icon="row.meta.icon"
            size="xs"
          />
          <span v-else class="tl-card" />
        </span>
        <span class="tl-text">
          <span class="tl-name">
            {{ row.scorer }}
            <span v-if="row.meta.suffixKey" class="tl-suffix">{{ t(row.meta.suffixKey) }}</span>
          </span>
          <span v-if="row.assist" class="tl-assist">
            {{ t("matchStats.assistBy", { name: row.assist }) }}
          </span>
          <span v-else-if="!row.meta.isGoal" class="tl-assist">{{ t(row.meta.labelKey) }}</span>
        </span>
      </div>

      <span class="tl-minute">{{ row.minute }}'</span>
    </li>
  </ol>

  <p v-else class="empty-inline">{{ t("matchStats.noEvents") }}</p>
</template>

<style scoped>
.timeline {
  position: relative;
  list-style: none;
  margin: 0;
  padding: var(--sp-1) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

/* The spine. Sits behind every row, so the rail reads as continuous time
   rather than as a border on each entry. */
.timeline::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: var(--border-light);
}

.tl-row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-2);
}

.tl-entry {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

/* Home on the left of the rail, away on the right — the same spatial
   convention the score header and the tables use. */
.tl-row--home .tl-entry {
  grid-column: 1;
  flex-direction: row-reverse;
  text-align: end;
}
.tl-row--home .tl-text {
  align-items: flex-end;
}
.tl-row--away .tl-entry {
  grid-column: 3;
}
.tl-row--home .tl-minute {
  grid-column: 2;
}
.tl-row--away .tl-minute {
  grid-column: 2;
}

.tl-minute {
  grid-column: 2;
  grid-row: 1;
  z-index: 1;
  min-width: 2.9em;
  padding: 1px var(--sp-1);
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 1px solid var(--border-light);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  text-align: center;
}

.tl-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--ev-color) 14%, transparent);
  color: var(--ev-color);
}

/* A booking is a card, not an icon — the shape is the label. */
.tl-card {
  width: 9px;
  height: 12px;
  border-radius: 1px;
  background: var(--ev-color);
}

.tl-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tl-name {
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tl-suffix {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--ev-color);
}

.tl-assist {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .tl-name {
    font-size: var(--fs-sm);
  }
}
</style>
