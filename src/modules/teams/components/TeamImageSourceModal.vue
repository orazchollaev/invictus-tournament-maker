<script setup lang="ts">
import { AppModal, AppIcon } from "@/components/ui"
import { Flag, Link2, ImagePlus } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const emit = defineEmits<{
  close: []
  "select-flag": []
  "select-url": []
  "select-gallery": []
}>()

const { t } = useI18n()
</script>

<template>
  <AppModal :title="t('teams.form.imageSourceTitle')" :z-index="210" @close="emit('close')">
    <div class="source-list">
      <button type="button" class="source-btn" @click="emit('select-flag')">
        <AppIcon :icon="Flag" size="md" />
        <span>{{ t("teams.form.imageSourceFlag") }}</span>
      </button>
      <button type="button" class="source-btn" @click="emit('select-url')">
        <AppIcon :icon="Link2" size="md" />
        <span>{{ t("teams.form.imageSourceUrl") }}</span>
      </button>
      <button type="button" class="source-btn" @click="emit('select-gallery')">
        <AppIcon :icon="ImagePlus" size="md" />
        <span>{{ t("teams.form.imageSourceGallery") }}</span>
      </button>
    </div>
  </AppModal>
</template>

<style scoped>
.source-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.source-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 600;
  text-align: start;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.source-btn:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}
</style>
