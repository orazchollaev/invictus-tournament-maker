<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { Download } from "@lucide/vue"
import { AppCard, AppChip, AppIcon } from "@/components/ui"
import type { MarketListing } from "../types"

defineProps<{ listing: MarketListing }>()

const { t } = useI18n()
</script>

<template>
  <AppCard rail interactive padding="sm" class="market-card">
    <span class="market-card-title">{{ listing.label }}</span>
    <p class="market-card-desc">{{ listing.description }}</p>
    <div class="market-card-meta">
      <AppChip variant="accent">{{ t(`market.type.${listing.type}`) }}</AppChip>
      <AppChip>{{ t("common.teams", { n: listing.teamCount }) }}</AppChip>
      <span class="market-card-downloads">
        <AppIcon :icon="Download" size="xs" />
        {{ listing.downloads }}
      </span>
      <span class="market-card-author">{{ listing.authorName }}</span>
    </div>
  </AppCard>
</template>

<style scoped>
.market-card {
  cursor: pointer;
}

.market-card :deep(.card-body) {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.market-card-title {
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-card-desc {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.market-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.market-card-downloads,
.market-card-author {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.market-card-author {
  margin-inline-start: auto;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
