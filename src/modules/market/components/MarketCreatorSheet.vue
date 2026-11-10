<script setup lang="ts">
/** One creator's datasets, opened from the creators list. */
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppSheet } from "@/components/ui"
import * as api from "../services/marketApi"
import type { MarketCreator, MarketListing } from "../types"
import MarketListingCard from "./MarketListingCard.vue"

const props = defineProps<{ creator: MarketCreator }>()
const emit = defineEmits<{ close: []; select: [listing: MarketListing] }>()

const { t } = useI18n()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)
const items = ref<MarketListing[]>([])
const loading = ref(true)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    items.value = await api.listMyDatasets(props.creator.uid)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Closes first, so the dataset's own sheet does not open on top of this one.
let picked: MarketListing | null = null
function pick(listing: MarketListing) {
  picked = listing
  sheet.value?.close()
}

function onClose() {
  emit("close")
  if (picked) emit("select", picked)
}
</script>

<template>
  <AppSheet ref="sheet" :title="creator.name" @close="onClose">
    <div class="mcs-body">
      <p v-if="loading" class="mcs-note">{{ t("market.loading") }}</p>
      <p v-else-if="failed" class="mcs-note">
        {{ t("market.networkError") }}
        <AppButton size="xs" @click="load">{{ t("market.retry") }}</AppButton>
      </p>
      <p v-else-if="!items.length" class="mcs-note">{{ t("market.creators.noDatasets") }}</p>
      <MarketListingCard v-for="l in items" :key="l.id" :listing="l" @click="pick(l)" />
    </div>
  </AppSheet>
</template>

<style scoped>
.mcs-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
  padding: var(--sp-3);
}

.mcs-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin: var(--sp-3) 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
