<script setup lang="ts">
/**
 * Two halves: "Built-in" is the datasets shipped with the app (offline, every
 * platform) and "Community" is the online market. Every "pick a dataset" link
 * in the app lands on the built-in tab via `?tab=offline`.
 */
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Plus, Store } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppEmptyState, AppIcon, AppSearchInput } from "@/components/ui"
import { useMarketStore } from "../store"
import { useMarketActions } from "../composables/useMarketActions"
import {
  MarketBuiltinDatasets,
  MarketDetailSheet,
  MarketListingCard,
  MarketPublishSheet,
} from "../components"
import type { MarketListing, MarketSort } from "../types"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const market = useMarketStore()
const actions = useMarketActions()

type Tab = "offline" | "online"

const tabs = computed(() => [
  { value: "offline", label: t("market.tabBuiltin") },
  { value: "online", label: t("market.tabCommunity") },
])

function initialTab(): Tab {
  if (!market.available) return "offline"
  return route.query.tab === "offline" ? "offline" : "online"
}

const tab = ref<Tab>(initialTab())

// Kept in the URL so going back to the market returns to the same half.
function selectTab(value: string) {
  tab.value = value === "offline" ? "offline" : "online"
  void router.replace({ query: { ...route.query, tab: tab.value } })
}

const query = ref("")
const selected = ref<MarketListing | null>(null)
const publishing = ref(false)

const sorts = computed(() => [
  { value: "new", label: t("market.sortNew") },
  { value: "popular", label: t("market.sortPopular") },
])

const typeFilter = ref<"all" | MarketListing["type"]>("all")
const typeFilters = computed(() => [
  { value: "all", label: t("market.filterAll") },
  { value: "club", label: t("market.type.club") },
  { value: "country", label: t("market.type.country") },
])

// Searches and filters what is already loaded: a server-side query would need
// an index per sort order, and a page is only 20 small documents anyway.
const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return market.listings.filter(
    (l) =>
      (typeFilter.value === "all" || l.type === typeFilter.value) &&
      (!q || [l.label, l.description, l.authorName].some((s) => s.toLowerCase().includes(q)))
  )
})

// Signing in is asked for only here, at the moment it is needed. Account
// management (sign out, delete) lives in Settings → Market.
async function openPublish() {
  if (await actions.ensureSignedIn()) publishing.value = true
}

// The network is touched only once the community tab is actually opened.
let started = false
watch(
  tab,
  async (value) => {
    if (value !== "online" || started) return
    started = true
    await market.init()
    if (!market.listings.length) await market.load(true)
  },
  { immediate: true }
)
</script>

<template>
  <div class="page market">
    <div class="page-top">
      <h2 class="page-title">{{ t("market.title") }}</h2>
      <AppButton
        v-if="market.available && tab === 'online'"
        variant="filled"
        icon-only
        :title="t('market.publish')"
        :aria-label="t('market.publish')"
        @click="openPublish"
      >
        <AppIcon :icon="Plus" size="xs" />
      </AppButton>
    </div>

    <AppButtonGroup
      v-if="market.available"
      :model-value="tab"
      :options="tabs"
      block
      class="market-tabs"
      @update:model-value="selectTab"
    />

    <MarketBuiltinDatasets v-if="tab === 'offline'" />

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

      <AppButtonGroup
        v-model="typeFilter"
        :options="typeFilters"
        size="md"
        block
        class="market-filter"
      />

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
.market-tabs {
  margin-bottom: var(--sp-3);
}

.market-filter {
  margin-bottom: var(--sp-3);
}

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
