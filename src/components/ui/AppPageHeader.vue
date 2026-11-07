<script setup lang="ts">
/**
 * The top row of every detail page, so they all read as the same kind of
 * screen: back · (optional crest or avatar) · title over a muted subtitle ·
 * actions.
 *
 * Slots:
 *   lead      — a small crest/avatar before the title.
 *   subtitle  — replaces the `subtitle` text when it needs markup (a season
 *               picker, a team badge).
 *   actions   — buttons on the right; a ⋯ AppMenu goes last.
 */
import { ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import AppButton from "./AppButton.vue"
import AppIcon from "./AppIcon.vue"

defineProps<{
  title: string
  subtitle?: string
}>()

const emit = defineEmits<{ back: [] }>()

const { t } = useI18n()
</script>

<template>
  <header class="page-header">
    <AppButton icon-only :aria-label="t('common.back')" @click="emit('back')">
      <AppIcon :icon="ArrowLeft" size="md" />
    </AppButton>

    <div v-if="$slots.lead" class="page-header-lead">
      <slot name="lead" />
    </div>

    <div class="page-header-identity">
      <h1 class="page-header-title">{{ title }}</h1>
      <div v-if="$slots.subtitle || subtitle" class="page-header-subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </div>
    </div>

    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-3);
}

.page-header-lead {
  display: flex;
  flex-shrink: 0;
}

.page-header-identity {
  flex: 1;
  min-width: 0;
}

.page-header-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-md);
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.page-header-subtitle {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}
</style>
