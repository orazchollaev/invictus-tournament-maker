<script setup lang="ts">
/**
 * Prev/next pager for long lists. Keeps the caller's own list slice — this
 * only tracks the current page number and reports how many pages there are.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronLeft, ChevronRight } from "@lucide/vue"
import AppButton from "./AppButton.vue"
import AppIcon from "./AppIcon.vue"

const props = defineProps<{
  totalItems: number
  pageSize: number
}>()

const page = defineModel<number>({ required: true })

const { t } = useI18n()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

function prev() {
  if (page.value > 1) page.value -= 1
}

function next() {
  if (page.value < totalPages.value) page.value += 1
}
</script>

<template>
  <div v-if="totalPages > 1" class="pagination">
    <AppButton
      variant="text"
      size="sm"
      icon-only
      :disabled="page <= 1"
      :title="t('common.previousPage')"
      @click="prev"
    >
      <AppIcon :icon="ChevronLeft" size="sm" />
    </AppButton>
    <span class="pagination-info">{{ t("common.pageOf", { page, total: totalPages }) }}</span>
    <AppButton
      variant="text"
      size="sm"
      icon-only
      :disabled="page >= totalPages"
      :title="t('common.nextPage')"
      @click="next"
    >
      <AppIcon :icon="ChevronRight" size="sm" />
    </AppButton>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding-block: var(--sp-2);
}

.pagination-info {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 3.5em;
  text-align: center;
}
</style>
