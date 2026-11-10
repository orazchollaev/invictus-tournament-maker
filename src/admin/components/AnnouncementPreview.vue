<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { AnnouncementForm } from "../utils/form"

const props = defineProps<{ form: AnnouncementForm }>()

const locale = ref(props.form.content[0]?.locale ?? "")
watch(
  () => props.form.content.map((r) => r.locale),
  (locales) => {
    if (!locales.includes(locale.value)) locale.value = locales[0] ?? ""
  }
)

const row = computed(() => props.form.content.find((r) => r.locale === locale.value))
const rtl = computed(() => ["ar", "fa"].includes(locale.value))
const imageFailed = ref(false)
watch(
  () => props.form.imageUrl,
  () => (imageFailed.value = false)
)
</script>

<template>
  <div class="preview">
    <div class="preview-tabs">
      <button
        v-for="r in form.content"
        :key="r.locale"
        class="btn-xs"
        :class="{ primary: r.locale === locale }"
        @click="locale = r.locale"
      >
        {{ r.locale }}
      </button>
    </div>

    <div v-if="row" class="sheet" :dir="rtl ? 'rtl' : 'ltr'" :lang="row.locale">
      <img
        v-if="form.imageUrl && !imageFailed"
        class="sheet-image"
        :src="form.imageUrl"
        alt=""
        @error="imageFailed = true"
      />
      <div class="sheet-title">{{ row.title || "Başlık" }}</div>
      <div class="sheet-body">{{ row.body || "Metin" }}</div>
      <button v-if="form.actionType !== 'none'" class="primary sheet-cta">
        {{ row.cta || "Buton" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.preview-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1);
}

.sheet {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-width: 420px;
}

.sheet-image {
  width: 100%;
  aspect-ratio: 2 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--fill-1);
}

.sheet-title {
  font-size: var(--fs-lg);
  font-weight: 700;
}

.sheet-body {
  white-space: pre-line;
  color: var(--text-muted);
  line-height: 1.5;
}

.sheet-cta {
  justify-content: center;
  pointer-events: none;
}
</style>
