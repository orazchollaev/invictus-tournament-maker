<script setup lang="ts">
import { ref } from "vue"
import { AppModal, AppIcon } from "@/components/ui"
import { Flag, Link2, ImagePlus, Shield, Smile } from "@lucide/vue"
import { useI18n } from "vue-i18n"

defineProps<{ hideFlag?: boolean; showFace?: boolean; showCrest?: boolean }>()

const emit = defineEmits<{
  close: []
  "select-flag": []
  "select-url": []
  "select-gallery": []
  "select-face": []
  "select-crest": []
}>()

const { t } = useI18n()

const modal = ref<InstanceType<typeof AppModal> | null>(null)

// The parent unmounts this chooser as it opens the next step, so the choice is
// reported only after the exit animation has played.
function choose(
  event: "select-flag" | "select-url" | "select-gallery" | "select-face" | "select-crest"
) {
  modal.value?.close(() => (emit as (e: typeof event) => void)(event))
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('teams.form.imageSourceTitle')"
    :z-index="210"
    @close="emit('close')"
  >
    <div class="source-list">
      <button v-if="showFace" type="button" class="source-btn" @click="choose('select-face')">
        <AppIcon :icon="Smile" size="md" />
        <span>{{ t("players.form.faceSource") }}</span>
      </button>
      <button v-if="showCrest" type="button" class="source-btn" @click="choose('select-crest')">
        <AppIcon :icon="Shield" size="md" />
        <span>{{ t("teams.crest.sourceOption") }}</span>
      </button>
      <button v-if="!hideFlag" type="button" class="source-btn" @click="choose('select-flag')">
        <AppIcon :icon="Flag" size="md" />
        <span>{{ t("teams.form.imageSourceFlag") }}</span>
      </button>
      <button type="button" class="source-btn" @click="choose('select-url')">
        <AppIcon :icon="Link2" size="md" />
        <span>{{ t("teams.form.imageSourceUrl") }}</span>
      </button>
      <button type="button" class="source-btn" @click="choose('select-gallery')">
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
