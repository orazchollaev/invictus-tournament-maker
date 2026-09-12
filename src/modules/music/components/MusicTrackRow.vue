<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Check, Music, Trash2 } from "@lucide/vue"
import { AppButton, AppChip, AppIcon } from "@/components/ui"
import type { MusicTrack } from "../types"

const props = defineProps<{ track: MusicTrack; current: boolean }>()
const emit = defineEmits<{ select: []; remove: [] }>()

const { t } = useI18n()

const sizeLabel = computed(() => {
  if (!props.track.size) return null
  return `${Math.max(1, Math.round(props.track.size / 1024 / 1024))} MB`
})
</script>

<template>
  <div class="mt-row" :class="{ 'mt-row--current': current }">
    <button class="mt-pick" @click="emit('select')">
      <AppIcon :icon="current ? Check : Music" size="xs" class="mt-icon" />
      <span class="mt-name">{{ track.name }}</span>
    </button>
    <AppChip v-if="track.source === 'builtin'" square size="xs">
      {{ t("music.builtIn") }}
    </AppChip>
    <AppChip v-else-if="sizeLabel" square size="xs">{{ sizeLabel }}</AppChip>
    <AppButton
      v-if="track.source === 'upload'"
      variant="danger"
      icon-only
      size="xs"
      :title="t('common.delete')"
      @click="emit('remove')"
    >
      <AppIcon :icon="Trash2" size="xs" />
    </AppButton>
  </div>
</template>

<style scoped>
.mt-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-1);
  border-bottom: 1px solid var(--border-light);
}
.mt-row:last-child {
  border-bottom: none;
}
.mt-row--current .mt-name {
  color: var(--accent);
  font-weight: 700;
}

.mt-pick {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
  min-width: 0;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  text-align: start;
  font-size: var(--fs-base);
  cursor: pointer;
  min-height: var(--tap-min);
}
.mt-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}
.mt-row--current .mt-icon {
  color: var(--accent);
}
.mt-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
