<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppCard } from "@/components/ui"
import type { MarketListing } from "../types"

const props = defineProps<{ listing: MarketListing }>()

const { t } = useI18n()

// One quiet line instead of a row of badges.
const meta = computed(() =>
  [
    t("common.teams", { n: props.listing.teamCount }),
    t(`market.type.${props.listing.type}`),
    `↓ ${props.listing.downloads}`,
    props.listing.authorName,
  ].join(" · ")
)
</script>

<template>
  <AppCard variant="outlined" interactive padding="sm" class="market-card">
    <span class="market-card-title">{{ listing.label }}</span>
    <p class="market-card-desc">{{ listing.description }}</p>
    <p class="market-card-meta">{{ meta }}</p>
  </AppCard>
</template>

<style scoped>
.market-card {
  cursor: pointer;
}

.market-card :deep(.card-body) {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.market-card-title {
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-card-desc,
.market-card-meta {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.market-card-meta {
  font-size: var(--fs-xs);
  opacity: 0.8;
}
</style>
