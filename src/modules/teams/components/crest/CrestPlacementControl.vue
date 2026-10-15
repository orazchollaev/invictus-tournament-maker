<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { AppButtonGroup } from "@/components/ui"
import type { CrestPlacement, CrestPos, CrestSize } from "@/engine/crest"

const props = defineProps<{
  positions: CrestPos[]
  sizes: CrestSize[]
  modelValue: CrestPlacement
}>()

const emit = defineEmits<{ "update:modelValue": [value: CrestPlacement] }>()

const { t } = useI18n()

const posOptions = computed(() =>
  props.positions.map((value) => ({ value, label: t(`teams.crest.pos.${value}`) }))
)
const sizeOptions = computed(() =>
  props.sizes.map((value) => ({ value, label: t(`teams.crest.size.${value}`) }))
)
</script>

<template>
  <div class="placement">
    <div class="row">
      <span class="caption">{{ t("teams.crest.position") }}</span>
      <AppButtonGroup
        :options="posOptions"
        :model-value="modelValue.pos"
        size="xs"
        block
        @update:model-value="
          (v) => emit('update:modelValue', { ...modelValue, pos: v as CrestPos })
        "
      />
    </div>
    <div class="row">
      <span class="caption">{{ t("teams.crest.sizeLabel") }}</span>
      <AppButtonGroup
        :options="sizeOptions"
        :model-value="modelValue.size"
        size="xs"
        block
        @update:model-value="
          (v) => emit('update:modelValue', { ...modelValue, size: v as CrestSize })
        "
      />
    </div>
  </div>
</template>

<style scoped>
.placement {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.row {
  display: grid;
  grid-template-columns: 56px 1fr;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.caption {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
