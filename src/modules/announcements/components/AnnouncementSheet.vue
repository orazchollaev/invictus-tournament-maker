<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { ExternalLink } from "@lucide/vue"
import { AppButton, AppIcon, AppSheet } from "@/components/ui"
import { isRtl, type Locale } from "@/i18n"
import { closeAnnouncement } from "../composables/useAnnouncements"
import type { ResolvedAnnouncement } from "../types"

const props = defineProps<{ announcement: ResolvedAnnouncement }>()

const { t } = useI18n()
const router = useRouter()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)
const imageFailed = ref(false)

// The text can be in the fallback language, not the app's: an English
// announcement inside the Arabic app still reads left to right.
const dir = computed(() => (isRtl(props.announcement.locale as Locale) ? "rtl" : "ltr"))

// Parked here, read on close: X, backdrop and Escape all close as a dismiss.
let outcome: "dismiss" | "action" = "dismiss"

function act() {
  outcome = "action"
  sheet.value?.close()
}
</script>

<template>
  <AppSheet ref="sheet" @close="closeAnnouncement(outcome, router)">
    <template #title>
      <span class="ann-title" :dir="dir" :lang="announcement.locale">
        {{ announcement.title }}
      </span>
    </template>

    <div class="ann-body" :dir="dir" :lang="announcement.locale">
      <img
        v-if="announcement.imageUrl && !imageFailed"
        :src="announcement.imageUrl"
        alt=""
        class="ann-image"
        @error="imageFailed = true"
      />
      <p class="ann-text">{{ announcement.body }}</p>
    </div>

    <template #footer>
      <div class="ann-footer">
        <AppButton :variant="announcement.ctaLabel ? 'text' : 'outlined'" @click="sheet?.close()">
          {{ t("common.close") }}
        </AppButton>
        <AppButton v-if="announcement.ctaLabel" variant="filled" @click="act">
          {{ announcement.ctaLabel }}
          <AppIcon v-if="announcement.action?.type === 'url'" :icon="ExternalLink" size="xs" />
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<style scoped>
.ann-title {
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 700;
  line-height: 1.3;
  min-width: 0;
}

.ann-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3);
}

.ann-image {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 1;
  object-fit: cover;
  border-radius: var(--radius);
  background: var(--surface-2);
}

.ann-text {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.55;
  color: var(--text);
  /* Line breaks typed in the announcement are kept; nothing else is interpreted. */
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.ann-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
</style>
