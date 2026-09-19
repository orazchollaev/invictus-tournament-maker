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
import AppSelect from "./AppSelect.vue"

const props = defineProps<{
  totalItems: number
  pageSize: number
}>()

const page = defineModel<number>({ required: true })

const { t } = useI18n()

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalItems / props.pageSize)))

// AppSelect only takes string values, so the page number round-trips through
// a string here — the caller's model stays a plain number.
const pageOptions = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => {
    const n = i + 1
    return { value: String(n), label: t("common.pageOf", { page: n, total: totalPages.value }) }
  })
)

const pageSelectModel = computed({
  get: () => String(page.value),
  set: (value: string) => {
    page.value = Number(value)
  },
})

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
    <div class="pagination-select">
      <AppSelect v-model="pageSelectModel" size="sm" :options="pageOptions" />
    </div>
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

.pagination-select {
  width: 100px;
  flex-shrink: 0;
}

.pagination-select :deep(.asel-value) {
  text-align: center;
}
</style>
