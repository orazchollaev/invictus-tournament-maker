<script setup lang="ts">
/** Pick a random face and tweak it feature by feature. Emits the result on save. */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronLeft, ChevronRight, Dices } from "@lucide/vue"
import { AppButton, AppField, AppIcon, AppModal, AppNumberInput } from "@/components/ui"
import {
  FACE_FEATURES,
  HAIR_COLORS,
  SKIN_TONES,
  faceOptions,
  faceSvg,
  featureId,
  cloneFace,
  randomFace,
  withFatness,
  withFeature,
  withHairColor,
  withSkin,
  type FaceConfig,
  type FaceFeature,
} from "@/lib/faces"
import { useModal } from "@/composables/useModal"

const props = defineProps<{ face?: FaceConfig; zIndex?: number }>()
const emit = defineEmits<{ close: []; save: [face: FaceConfig] }>()

const { t } = useI18n()
useModal(() => modal.value?.close())
const modal = ref<InstanceType<typeof AppModal> | null>(null)

const face = ref<FaceConfig>(props.face ? cloneFace(props.face) : randomFace())
const svg = computed(() => faceSvg(face.value))

const options = new Map(FACE_FEATURES.map((f) => [f, faceOptions(f)] as [FaceFeature, string[]]))

function place(f: FaceFeature) {
  const list = options.get(f)!
  return { at: list.indexOf(featureId(face.value, f)), of: list.length }
}

function step(f: FaceFeature, dir: 1 | -1) {
  const list = options.get(f)!
  const { at } = place(f)
  face.value = withFeature(face.value, f, list[(at + dir + list.length) % list.length])
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const fatness = computed({
  get: () => Math.round(face.value.fatness * 100),
  set: (v: number) => (face.value = withFatness(face.value, Math.round(v) / 100)),
})

function save() {
  emit("save", face.value)
  modal.value?.close()
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="t('players.face.title')"
    :z-index="zIndex ?? 210"
    @close="emit('close')"
  >
    <div class="face-editor">
      <!-- Stays at the top while the controls below it scroll. -->
      <div class="preview">
        <!-- eslint-disable-next-line vue/no-v-html -- SVG markup built locally by facesjs -->
        <span class="preview-face" aria-hidden="true" v-html="svg" />
        <AppButton variant="text" size="sm" @click="face = randomFace()">
          <AppIcon :icon="Dices" size="sm" />
          {{ t("players.face.random") }}
        </AppButton>
      </div>

      <div class="controls">
        <AppField :label="t('players.face.skin')" layout="stack">
          <div class="swatches">
            <button
              v-for="c in SKIN_TONES"
              :key="c"
              type="button"
              class="swatch"
              :class="{ 'swatch--on': same(face.body.color, c) }"
              :style="{ background: c }"
              :aria-label="t('players.face.skin')"
              @click="face = withSkin(face, c)"
            />
          </div>
        </AppField>
        <AppField :label="t('players.face.hairColor')" layout="stack">
          <div class="swatches">
            <button
              v-for="c in HAIR_COLORS"
              :key="c"
              type="button"
              class="swatch"
              :class="{ 'swatch--on': same(face.hair.color, c) }"
              :style="{ background: c }"
              :aria-label="t('players.face.hairColor')"
              @click="face = withHairColor(face, c)"
            />
          </div>
        </AppField>

        <div v-for="f in FACE_FEATURES" :key="f" class="step">
          <span class="step-label">{{ t(`players.face.${f}`) }}</span>
          <button
            type="button"
            class="step-btn"
            :aria-label="t('players.face.previous')"
            @click="step(f, -1)"
          >
            <ChevronLeft :size="16" />
          </button>
          <span class="step-value">{{ place(f).at + 1 }} / {{ place(f).of }}</span>
          <button
            type="button"
            class="step-btn"
            :aria-label="t('players.face.next')"
            @click="step(f, 1)"
          >
            <ChevronRight :size="16" />
          </button>
        </div>

        <AppField :label="t('players.face.fatness')">
          <AppNumberInput v-model="fatness" :min="0" :max="100" :step="5" size="sm" />
        </AppField>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" @click="save">{{ t("common.save") }}</AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.face-editor {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.preview {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-2) 0;
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
}

.preview-face {
  display: block;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--surface-2);
  line-height: 0;
}
.preview-face :deep(svg) {
  width: 100%;
  height: 100%;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 2px solid var(--border);
  border-radius: 50%;
}

.swatch--on {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-subtle);
}

.step {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.step-label {
  flex: 1;
  min-width: 0;
  font-size: var(--fs-md);
  font-weight: 600;
}

.step-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
}

.step-value {
  min-width: 56px;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
