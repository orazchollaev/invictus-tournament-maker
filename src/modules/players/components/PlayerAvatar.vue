<script setup lang="ts">
/** Initial-on-colour avatar; shows the photo instead when the player has one. */
import { computed, ref, watch } from "vue"
import { faceSvg, type FaceConfig } from "@/lib/faces"

const props = withDefaults(
  defineProps<{
    name: string
    color: string
    size?: number
    number?: number | null
    image?: string | null
    face?: FaceConfig | null
  }>(),
  { size: 28 }
)
const imgError = ref(false)
watch(
  () => props.image,
  () => {
    imgError.value = false
  }
)
const showImage = computed(() => !!props.image && !imgError.value)

// A photo wins; a drawn face fills in when there is none (or it fails to load).
const svg = computed(() => (!showImage.value && props.face ? faceSvg(props.face) : ""))

const initial = computed(() => props.number ?? (props.name.trim().charAt(0).toUpperCase() || "?"))

// Two-digit numbers need to shrink a touch to keep clear of the circle edge.
const fontScale = computed(() => (props.number != null && props.number >= 10 ? 0.34 : 0.42))

/**
 * White text was hardcoded here, which vanishes on a pale team colour like
 * white or a light yellow. Pick black or white by the background's relative
 * luminance instead — readable against any team colour, not just dark ones.
 */
const textColor = computed(() => {
  const hex = props.color.trim()
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!match) return "#fff"

  const full =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : match[1]

  const r = parseInt(full.slice(0, 2), 16) / 255
  const g = parseInt(full.slice(2, 4), 16) / 255
  const b = parseInt(full.slice(4, 6), 16) / 255
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

  return luminance > 0.6 ? "#111" : "#fff"
})
</script>

<template>
  <span
    class="player-avatar"
    :class="{ 'player-avatar--number': number != null && !showImage && !svg }"
    :style="{
      background: color,
      color: textColor,
      width: size + 'px',
      height: size + 'px',
      fontSize: size * fontScale + 'px',
    }"
  >
    <img v-if="showImage" :src="image!" class="player-avatar-img" alt="" @error="imgError = true" />
    <!-- eslint-disable-next-line vue/no-v-html -- SVG markup built locally by facesjs -->
    <span v-else-if="svg" class="player-avatar-face" v-html="svg" />
    <template v-else>{{ initial }}</template>
  </span>
</template>

<style scoped>
.player-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  overflow: hidden;
  font-weight: 700;
  font-family: var(--font-ui);
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.15);
}

.player-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}
.player-avatar-face {
  display: block;
  width: 100%;
  height: 100%;
  line-height: 0;
}
.player-avatar-face :deep(svg) {
  width: 100%;
  height: 100%;
}
.player-avatar--number {
  font-family: var(--font-mono);
}
</style>
