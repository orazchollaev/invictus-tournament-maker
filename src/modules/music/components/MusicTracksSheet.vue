<script setup lang="ts">
/** The library: what is available to play, and adding to it. */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Plus } from "@lucide/vue"
import { AppButton, AppIcon, AppSheet } from "@/components/ui"
import { showAlert } from "@/composables/useDialog"
import { useMusicStore } from "../store"
import { ACCEPTED_AUDIO, MAX_TRACK_BYTES } from "../constants"
import { rejectionFor } from "../services/trackStorage"
import MusicTrackRow from "./MusicTrackRow.vue"

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useMusicStore()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const tracks = computed(() => store.allTracks())
const maxMb = computed(() => Math.round(MAX_TRACK_BYTES / 1024 / 1024))

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset first, so picking the same file twice still fires a change.
  input.value = ""
  if (!file) return

  const rejection = rejectionFor(file)
  if (rejection === "type") {
    showAlert(t("music.invalidType"))
    return
  }
  if (rejection === "size") {
    showAlert(t("music.tooLarge", { max: maxMb.value }))
    return
  }

  try {
    await store.addUpload(file)
  } catch {
    showAlert(t("music.saveFailed"))
  }
}
</script>

<template>
  <AppSheet ref="sheet" :title="t('music.tracksTitle')" @close="emit('close')">
    <div class="mts-body">
      <p class="mts-hint">{{ t("music.tracksHint", { max: maxMb }) }}</p>

      <div class="mts-list">
        <MusicTrackRow
          v-for="track in tracks"
          :key="track.id"
          :track="track"
          :current="track.id === store.currentTrackId"
          @select="store.currentTrackId = track.id"
          @remove="store.removeUpload(track.id)"
        />
      </div>

      <input
        ref="fileInput"
        type="file"
        :accept="ACCEPTED_AUDIO"
        class="visually-hidden"
        @change="onFileChange"
      />
    </div>

    <template #footer>
      <AppButton variant="filled" @click="fileInput?.click()">
        <AppIcon :icon="Plus" size="xs" />
        {{ t("music.addTrack") }}
      </AppButton>
      <AppButton @click="sheet?.close()">{{ t("common.close") }}</AppButton>
    </template>
  </AppSheet>
</template>

<style scoped>
.mts-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
}

.mts-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mts-list {
  display: flex;
  flex-direction: column;
  max-height: 52vh;
  overflow-y: auto;
}
</style>
