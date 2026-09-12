<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Music } from "@lucide/vue"
import {
  AppButton,
  AppCard,
  AppChip,
  AppField,
  AppIcon,
  AppNumberInput,
  AppSelect,
  AppToggle,
} from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"
import { useMusicStore } from "@/modules/music/store"
import { MusicTracksSheet } from "@/modules/music/components"

const { t } = useI18n()
const music = useMusicStore()

const tracksOpen = ref(false)

const trackOptions = computed(() =>
  music.allTracks().map((track) => ({ value: track.id, label: track.name }))
)

const volumeLabel = computed(() => {
  const v = music.volume
  if (v === 0) return t("music.volume.silent")
  if (v <= 25) return t("music.volume.quiet")
  if (v <= 60) return t("music.volume.gentle")
  return t("music.volume.loud")
})
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Music" size="md" />
      {{ t("music.title") }}
    </template>

    <AppField layout="split" :label="t('music.enabled.label')">
      <template #description>
        <SettingDesc>{{ t("music.enabled.desc") }}</SettingDesc>
      </template>
      <AppToggle v-model="music.enabled" :aria-label="t('music.enabled.label')" />
    </AppField>

    <AppField layout="split" :label="t('music.volume.label')">
      <template #description>
        <SettingDesc>{{ t("music.volume.desc") }}</SettingDesc>
      </template>
      <AppChip variant="accent" square>{{ volumeLabel }}</AppChip>
      <AppNumberInput
        v-model="music.volume"
        :min="0"
        :max="100"
        :step="5"
        editable
        value-width="md"
      />
    </AppField>

    <AppField layout="split" :label="t('music.track.label')">
      <template #description>
        <SettingDesc>{{ t("music.track.desc") }}</SettingDesc>
      </template>
      <AppSelect v-model="music.currentTrackId" :options="trackOptions" />
    </AppField>

    <AppField layout="split" :label="t('music.loop.label')">
      <template #description>
        <SettingDesc>{{ t("music.loop.desc") }}</SettingDesc>
      </template>
      <AppToggle v-model="music.loop" :aria-label="t('music.loop.label')" />
    </AppField>

    <AppField layout="split" :label="t('music.tracksTitle')">
      <template #description>
        <SettingDesc>{{ t("music.manageDesc") }}</SettingDesc>
      </template>
      <AppButton size="xs" @click="tracksOpen = true">{{ t("music.manage") }}</AppButton>
    </AppField>

    <MusicTracksSheet v-if="tracksOpen" @close="tracksOpen = false" />
  </AppCard>
</template>
