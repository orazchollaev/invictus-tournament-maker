<script setup lang="ts">
/**
 * One community dataset on the market list, on the same AppListItem as every
 * other list page: a club/country icon, the name over its description (or,
 * without one, its type and author), and the team and download counts.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Download, Flag, Shield } from "@lucide/vue"
import { AppChip, AppIcon, AppListItem } from "@/components/ui"
import type { MarketListing } from "../types"

const props = defineProps<{ listing: MarketListing }>()
const emit = defineEmits<{ click: [] }>()

const { t } = useI18n()

const subtitle = computed(
  () =>
    props.listing.description ||
    [t(`market.type.${props.listing.type}`), props.listing.authorName].join(" · ")
)
</script>

<template>
  <AppListItem
    :title="listing.label"
    :subtitle="subtitle"
    :lead-icon="listing.type === 'country' ? Flag : Shield"
    @open="emit('click')"
  >
    <template #trail>
      <AppChip square>{{ t("common.teams", { n: listing.teamCount }) }}</AppChip>
      <span class="downloads">
        <AppIcon :icon="Download" size="xs" />
        {{ listing.downloads }}
      </span>
    </template>
  </AppListItem>
</template>

<style scoped>
.downloads {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--fs-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
</style>
