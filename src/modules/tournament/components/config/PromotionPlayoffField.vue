<script setup lang="ts">
/**
 * How many places of each lower division play for one extra promotion spot.
 * Shared by the create and settings league modals so both offer the same sizes.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppButtonGroup } from "@/components/ui"
import { PROMOTION_PLAYOFF_SIZES } from "@/engine"

const props = defineProps<{
  /** Largest size the smallest division can hold; bigger options are disabled. */
  max: number
}>()

const size = defineModel<number>({ required: true })

const { t } = useI18n()

const options = computed(() =>
  PROMOTION_PLAYOFF_SIZES.map((n) => ({
    value: String(n),
    label: n === 0 ? t("tournament.create.promotionPlayoffOff") : String(n),
    disabled: n > props.max,
  }))
)
</script>

<template>
  <div class="ppf">
    <div class="form-row">
      <span class="form-label">{{ t("tournament.create.promotionPlayoff") }}</span>
      <AppButtonGroup
        :model-value="String(size)"
        :options="options"
        size="xs"
        @update:model-value="(v) => (size = Number(v))"
      />
    </div>
    <span class="form-hint">{{ t("tournament.create.promotionPlayoffHint") }}</span>
  </div>
</template>

<style scoped>
.ppf {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}
</style>
