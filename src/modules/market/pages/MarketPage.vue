<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Plus, Store } from "@lucide/vue"
import {
  AppButton,
  AppButtonGroup,
  AppCard,
  AppEmptyState,
  AppIcon,
  AppSearchInput,
} from "@/components/ui"
import { showAlert } from "@/composables/useDialog"
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

async function openPublish() {
  if (await actions.ensureSignedIn()) publishing.value = true
}

async function signIn() {
  try {
    await market.signIn()
  } catch {
    await showAlert(t("market.signInFailed"))
  }
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
      <AppButton v-if="market.available" variant="filled" @click="openPublish">
        <AppIcon :icon="Plus" size="xs" />
        {{ t("market.publish") }}
      </AppButton>
    </div>

    <AppEmptyState v-if="!market.available" :icon="Store" :description="t('market.androidOnly')" />

    <template v-else>
      <AppCard variant="outlined" padding="sm" class="market-account">
        <template v-if="market.user">
          <span class="market-user">{{ t("market.signedInAs", { name: market.user.name }) }}</span>
          <AppButton size="xs" variant="text" @click="market.signOut()">
            {{ t("market.signOut") }}
          </AppButton>
          <AppButton size="xs" variant="text" @click="actions.deleteAccount()">
            {{ t("market.deleteAccount") }}
          </AppButton>
        </template>
        <template v-else>
          <span class="market-user">{{ t("market.signInHint") }}</span>
          <AppButton size="xs" variant="tonal" @click="signIn">{{ t("market.signIn") }}</AppButton>
        </template>
      </AppCard>

      <AppButtonGroup
        :model-value="market.sort"
        :options="sorts"
        block
        @update:model-value="market.setSort($event as MarketSort)"
      />

      <AppSearchInput v-model="query" :placeholder="t('market.search')" />

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
      <AppButton v-else-if="market.cursor && !market.failed" block @click="market.load()">
        {{ t("market.loadMore") }}
      </AppButton>
    </template>

    <MarketDetailSheet v-if="selected" :listing="selected" @close="selected = null" />
    <MarketPublishSheet v-if="publishing" @close="publishing = false" />
  </div>
</template>

<style scoped>
/* `.page` only pads; the vertical rhythm between blocks is this page's own. */
.market {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.market .page-top {
  margin-bottom: var(--sp-1);
}

.market-account :deep(.card-body) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
}

.market-user {
  margin-inline-end: auto;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
}

.market-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.market-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
