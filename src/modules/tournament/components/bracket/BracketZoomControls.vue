<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { Expand, Minus, Plus } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import { MAX_ZOOM, MIN_ZOOM } from "../../composables/useBracketViewport"

const { t } = useI18n()

defineProps<{ zoom: number }>()
defineEmits<{ "zoom-in": []; "zoom-out": []; fit: [] }>()
</script>

<template>
  <div class="zoom-controls">
    <AppButton
      variant="outlined"
      size="xs"
      icon-only
      :disabled="zoom <= MIN_ZOOM"
      @click="$emit('zoom-out')"
    >
      <AppIcon :icon="Minus" size="sm" />
    </AppButton>
    <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
    <AppButton
      variant="outlined"
      size="xs"
      icon-only
      :disabled="zoom >= MAX_ZOOM"
      @click="$emit('zoom-in')"
    >
      <AppIcon :icon="Plus" size="sm" />
    </AppButton>
    <AppButton
      variant="outlined"
      size="xs"
      icon-only
      class="fit-btn"
      :title="t('bracket.fitScreen')"
      @click="$emit('fit')"
    >
      <AppIcon :icon="Expand" size="sm" />
    </AppButton>
  </div>
</template>

<style scoped>
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-family: var(--font-ui);
  width: 32px;
  text-align: center;
}

.fit-btn {
  margin-left: 2px;
}
</style>
