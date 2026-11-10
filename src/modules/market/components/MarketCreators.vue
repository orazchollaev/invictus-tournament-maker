<script setup lang="ts">
/**
 * The creators view of the community tab: last week's winner on top, then
 * everyone who has published, most downloaded first — with how many datasets
 * they have up and how many weeks they have won. Meant as the nudge to publish.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Download, Info, Trophy, Users } from "@lucide/vue"
import { AppButton, AppEmptyState, AppIcon, AppListItem } from "@/components/ui"
import { useMarketStore } from "../store"
import type { MarketCreator } from "../types"

const props = defineProps<{ query: string }>()
const emit = defineEmits<{ open: [creator: MarketCreator] }>()

const { t } = useI18n()
const market = useMarketStore()

/** The counting rules, behind the ⓘ so the strip stays one line. */
const showRules = ref(false)

const ranked = computed(() => market.creators.map((c, i) => ({ ...c, rank: i + 1 })))
const visible = computed(() => {
  const q = props.query.trim().toLowerCase()
  return q ? ranked.value.filter((c) => c.name.toLowerCase().includes(q)) : ranked.value
})

function subtitle(c: MarketCreator) {
  const parts = [t("market.creators.datasets", { n: c.datasets })]
  const won = market.wins.get(c.uid)
  if (won) parts.push(t("market.creators.wins", { n: won }))
  return parts.join(" · ")
}
</script>

<template>
  <div class="mc">
    <div class="mc-champion" :class="{ 'mc-champion--empty': !market.champion }">
      <AppIcon :icon="Trophy" size="xs" class="mc-trophy" />
      <span class="mc-champion-text">
        <template v-if="market.champion">
          <strong class="mc-champion-name">{{ market.champion.authorName }}</strong>
          <span class="mc-muted">
            · {{ t("market.creators.champion") }} ·
            {{ t("market.creators.championCount", { n: market.champion.count }) }}
          </span>
        </template>
        <span v-else class="mc-muted">{{ t("market.creators.noChampion") }}</span>
      </span>
      <AppButton
        variant="text"
        icon-only
        size="xs"
        :title="t('market.creators.rules')"
        :aria-label="t('market.creators.rules')"
        :aria-expanded="showRules"
        @click="showRules = !showRules"
      >
        <AppIcon :icon="Info" size="xs" />
      </AppButton>
    </div>
    <p v-if="showRules" class="mc-rules">{{ t("market.creators.rules") }}</p>

    <p v-if="market.creatorsFailed" class="mc-note">
      {{ t("market.networkError") }}
      <AppButton size="xs" @click="market.loadCreators()">{{ t("market.retry") }}</AppButton>
    </p>
    <p v-else-if="market.creatorsLoading && !market.creators.length" class="mc-note">
      {{ t("market.loading") }}
    </p>
    <AppEmptyState
      v-else-if="!visible.length"
      :icon="Users"
      :description="query ? t('market.noMatch', { query }) : t('market.creators.empty')"
    />

    <div v-if="visible.length" class="mc-list">
      <AppListItem
        v-for="c in visible"
        :key="c.uid"
        :title="c.name"
        :subtitle="subtitle(c)"
        @open="emit('open', c)"
      >
        <template #lead>
          <span class="mc-rank">{{ c.rank }}</span>
        </template>
        <template #trail>
          <span
            v-if="market.champion?.authorUid === c.uid"
            class="mc-badge"
            :title="t('market.creators.champion')"
          >
            <AppIcon :icon="Trophy" size="xs" />
          </span>
          <span class="mc-downloads">
            <AppIcon :icon="Download" size="xs" />
            {{ c.downloads }}
          </span>
        </template>
      </AppListItem>
    </div>
  </div>
</template>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

/* One quiet strip: trophy, winner, count, and the ⓘ for the rules. */
.mc-champion {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) var(--sp-1) var(--sp-1) var(--sp-3);
  border-radius: var(--radius);
  background: var(--gold-faint);
  font-size: var(--fs-sm);
}

.mc-champion--empty {
  background: var(--fill-1);
}

.mc-trophy {
  flex-shrink: 0;
  color: var(--gold-text);
}

.mc-champion--empty .mc-trophy {
  color: var(--text-muted);
}

.mc-champion-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* With no winner the line is an explanation, so it may wrap rather than cut. */
.mc-champion--empty .mc-champion-text {
  white-space: normal;
}

.mc-muted {
  color: var(--text-muted);
}

.mc-rules {
  margin: calc(-1 * var(--sp-1)) 0 0;
  padding: 0 var(--sp-3);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.mc-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin: var(--sp-3) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mc-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.mc-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.mc-badge {
  display: inline-flex;
  color: var(--gold-text);
}

.mc-downloads {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
</style>
