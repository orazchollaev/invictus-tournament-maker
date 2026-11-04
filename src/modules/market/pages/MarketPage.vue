<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Plus, Store } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppEmptyState, AppIcon, AppSearchInput } from "@/components/ui"
import { useMarketStore } from "../store"
import { useMarketActions } from "../composables/useMarketActions"
import { MarketDetailSheet, MarketListingCard, MarketPublishSheet } from "../components"
import type { MarketListing, MarketSort } from "../types"

const { t } = useI18n()
const market = useMarketStore()
const actions = useMarketActions()

const query = ref("")
const selected = ref<MarketListing | null>(null)
const publishing = ref(false)

const sorts = computed(() => [
  { value: "new", label: t("market.sortNew") },
  { value: "popular", label: t("market.sortPopular") },
])

// Searches what is already loaded: a server-side text search would need an
// index per sort order, and a page is only 20 small documents anyway.
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return market.listings
  return market.listings.filter((l) =>
    [l.label, l.description, l.authorName].some((s) => s.toLowerCase().includes(q))
  )
})

// Signing in is asked for only here, at the moment it is needed. Account
// management (sign out, delete) lives in Settings → Market.
async function openPublish() {
  if (await actions.ensureSignedIn()) publishing.value = true
}

onMounted(async () => {
  await market.init()
  if (!market.listings.length) await market.load(true)
})
</script>

<template>
  <div class="page market">
    <div class="page-top">
      <h2 class="page-title">{{ t("market.title") }}</h2>
      <AppButton
        v-if="market.available"
        variant="filled"
        icon-only
        :title="t('market.publish')"
        :aria-label="t('market.publish')"
        @click="openPublish"
      >
        <AppIcon :icon="Plus" size="xs" />
      </AppButton>
    </div>

    <AppEmptyState v-if="!market.available" :icon="Store" :description="t('market.androidOnly')" />

    <template v-else>
      <div class="search-row">
        <AppSearchInput v-model="query" :placeholder="t('market.search')" />
        <AppButtonGroup
          :model-value="market.sort"
          :options="sorts"
          size="md"
          @update:model-value="market.setSort($event as MarketSort)"
        />
      </div>

      <p v-if="market.failed" class="market-note">
        {{ t("market.networkError") }}
        <AppButton size="xs" @click="market.load(!market.listings.length)">
          {{ t("market.retry") }}
        </AppButton>
      </p>

      <AppEmptyState
        v-else-if="!market.loading && !visible.length"
        :icon="Store"
        :description="query ? t('market.noMatch', { query }) : t('market.empty')"
      />

      <div v-if="visible.length" class="market-list">
        <MarketListingCard v-for="l in visible" :key="l.id" :listing="l" @click="selected = l" />
      </div>

      <p v-if="market.loading" class="market-note">{{ t("market.loading") }}</p>
      <AppButton
        v-else-if="market.cursor && !market.failed"
        variant="text"
        block
        @click="market.load()"
      >
        {{ t("market.loadMore") }}
      </AppButton>
    </template>

    <MarketDetailSheet v-if="selected" :listing="selected" @close="selected = null" />
    <MarketPublishSheet v-if="publishing" @close="publishing = false" />
  </div>
</template>

<style scoped>
.market-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.market-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin: var(--sp-3) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
