<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { ChevronRight, Store } from "@lucide/vue"
import { AppCard, AppIcon } from "@/components/ui"
import { isMarketAvailable } from "../services/authService"

const { t } = useI18n()
</script>

<template>
  <RouterLink v-if="isMarketAvailable" to="/market" class="market-banner">
    <AppCard variant="outlined" interactive padding="sm">
      <div class="market-banner-row">
        <span class="market-banner-icon"><AppIcon :icon="Store" size="md" /></span>
        <span class="market-banner-text">
          <span class="market-banner-title">{{ t("market.title") }}</span>
          <span class="market-banner-desc">{{ t("market.bannerDesc") }}</span>
        </span>
        <AppIcon :icon="ChevronRight" size="sm" />
      </div>
    </AppCard>
  </RouterLink>
</template>

<style scoped>
.market-banner {
  display: block;
  margin-bottom: var(--sp-3);
  color: inherit;
  text-decoration: none;
}

.market-banner-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.market-banner-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--accent-subtle);
  color: var(--accent);
}

.market-banner-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.market-banner-title {
  font-weight: 700;
}

.market-banner-desc {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
