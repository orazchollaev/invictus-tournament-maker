<script setup lang="ts">
/** Titles won and top-scorer seasons, newest first. */
import { useI18n } from "vue-i18n"
import { Goal, Trophy } from "@lucide/vue"
import { AppCard, AppIcon } from "@/components/ui"
import type { Honour } from "../../composables/usePlayerCareer"

defineProps<{ honours: Honour[] }>()

const { t } = useI18n()
</script>

<template>
  <AppCard padding="md">
    <template #title>
      {{ t("playerDetail.honoursTitle") }}
      <span class="count">({{ honours.length }})</span>
    </template>

    <ul class="honours">
      <li
        v-for="(honour, i) in honours"
        :key="`${honour.kind}-${i}`"
        class="honour"
        :class="`honour--${honour.kind}`"
      >
        <span class="badge">
          <AppIcon :icon="honour.kind === 'title' ? Trophy : Goal" size="sm" />
        </span>
        <span class="text">
          <span class="headline">
            {{
              honour.kind === "title"
                ? t("playerDetail.honourTitle")
                : t("playerDetail.honourTopScorer", { goals: honour.goals })
            }}
          </span>
          <span class="where">
            {{ honour.tournamentName }} · {{ t("common.season", 1) }} {{ honour.season }}
          </span>
        </span>
      </li>
    </ul>
  </AppCard>
</template>

<style scoped>
.count {
  color: var(--text-muted);
  font-weight: 400;
}

.honours {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.honour {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg);
}

/* A title outranks a top-scorer season, and the card should say so before
   the text is read. */
.honour--title {
  border-color: var(--gold-soft);
  background: var(--gold-faint);
}

.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--bg-hover);
  color: var(--text-muted);
}
.honour--title .badge {
  background: var(--gold-soft);
  color: var(--gold-text);
}
.honour--topScorer .badge {
  background: var(--accent-subtle);
  color: var(--accent);
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.headline {
  font-size: var(--fs-base);
  font-weight: 600;
}

.where {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
