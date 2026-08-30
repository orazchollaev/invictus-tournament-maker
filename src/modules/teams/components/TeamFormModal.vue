<script setup lang="ts">
import { ref, watch, nextTick } from "vue"
import { AppButton, AppField, AppIcon, AppModal, AppColorPicker } from "@/components/ui"
import FlagPicker from "./FlagPicker.vue"
import FlagCircle from "./FlagCircle.vue"
import TeamImageSourceModal from "./TeamImageSourceModal.vue"
import TeamImageUrlModal from "./TeamImageUrlModal.vue"
import { flagPrimaryColor } from "../utils/flags"
import { resizeImageFile } from "../utils/imageUtils"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import { randomTeamName } from "@/composables/useRandomNames"
import { showAlert } from "@/composables/useDialog"
import { Shuffle, X } from "@lucide/vue"
import type { Team } from "../types"
import { useI18n } from "vue-i18n"

const props = defineProps<{ team?: Team }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useTeamsStore()
useModal(() => modal.value?.close())

const modal = ref<InstanceType<typeof AppModal> | null>(null)
const flagModal = ref<InstanceType<typeof AppModal> | null>(null)
const isEdit = !!props.team

const name = ref(props.team?.name ?? "")
const abbr = ref(props.team?.abbr ?? "")
const color = ref(props.team?.color ?? "#3366cc")
const flag = ref<string | undefined>(props.team?.flag)
const image = ref<string | undefined>(props.team?.image)
const power = ref(props.team?.power ?? 70)
const showFlagPicker = ref(false)
const showSourceChooser = ref(false)
const showUrlModal = ref(false)
const imgError = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const abbrPlaceholder = ref(autoAbbr(name.value))
watch(name, (v) => {
  abbrPlaceholder.value = autoAbbr(v)
})

async function onFlagSelect(code: string | undefined) {
  flag.value = code
  image.value = undefined
  flagModal.value?.close()
  if (code) {
    const primary = await flagPrimaryColor(code)
    if (primary) color.value = primary
  }
}

function onUrlSelect(url: string) {
  image.value = url
  flag.value = undefined
  imgError.value = false
  showUrlModal.value = false
}

function onGallerySelect() {
  showSourceChooser.value = false
  nextTick(() => fileInput.value?.click())
}

function onChooseFlag() {
  showSourceChooser.value = false
  showFlagPicker.value = true
}

function onChooseUrl() {
  showSourceChooser.value = false
  showUrlModal.value = true
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ""
  if (!file) return

  try {
    const dataUrl = await resizeImageFile(file)
    image.value = dataUrl
    flag.value = undefined
    imgError.value = false
  } catch {
    showAlert(t("teams.form.imageInvalid"))
  }
}

function clearImage() {
  flag.value = undefined
  image.value = undefined
}

function submit() {
  if (!name.value.trim()) return
  if (isEdit && props.team) {
    store.update(props.team.id, {
      name: name.value.trim(),
      abbr: abbr.value.trim().slice(0, 7) || undefined,
      color: color.value,
      flag: flag.value,
      image: image.value,
      power: power.value,
    })
  } else {
    store.add(
      name.value.trim(),
      color.value,
      power.value,
      abbr.value.trim() || undefined,
      flag.value,
      image.value
    )
  }
  modal.value?.close()
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="isEdit ? t('teams.form.editTitle') : t('teams.form.addTitle')"
    @close="emit('close')"
  >
    <div class="form" :style="{ '--team-color': color }">
      <!-- Live identity preview: click the crest to pick a flag or a custom image. -->
      <div class="preview">
        <div
          class="crest"
          :class="{ 'crest--filled': flag || image }"
          @click="showSourceChooser = true"
        >
          <img
            v-if="image && !imgError"
            :src="image"
            class="crest-img"
            alt=""
            @error="imgError = true"
          />
          <FlagCircle v-else-if="flag" :code="flag" :size="52" class="crest-img" />
          <button
            v-if="flag || image"
            type="button"
            class="crest-clear"
            :title="t('teams.form.imageRemove')"
            @click.stop="clearImage"
          >
            <AppIcon :icon="X" size="xs" />
          </button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="visually-hidden"
          @change="onFileChange"
        />
        <div class="preview-text">
          <p class="preview-name" :class="{ 'preview-name--empty': !name.trim() }">
            {{ name.trim() || t("teams.form.namePlaceholder") }}
          </p>
          <p class="preview-meta">
            {{ t("teams.form.power") }}
            <strong>{{ power }}</strong>
          </p>
        </div>
      </div>

      <div class="section">
        <AppField layout="stack" :label="t('teams.form.name')">
          <div class="input-wrap">
            <input
              v-model="name"
              class="input-full"
              :placeholder="t('teams.form.namePlaceholder')"
              autofocus
              @keyup.enter="submit"
            />
            <AppButton
              variant="text"
              size="xs"
              icon-only
              class="btn-random"
              :title="t('teams.form.randomName')"
              @click="name = randomTeamName()"
            >
              <AppIcon :icon="Shuffle" />
            </AppButton>
          </div>
        </AppField>

        <AppField layout="stack" :label="t('teams.form.abbreviation')">
          <input
            v-model="abbr"
            class="input-abbr"
            :placeholder="abbrPlaceholder"
            maxlength="7"
            @keyup.enter="submit"
          />
        </AppField>
      </div>

      <div class="section">
        <AppField layout="stack">
          <template #label>
            <span class="label-row">
              {{ t("teams.form.power") }}
              <span class="power-value">{{ power }}</span>
            </span>
          </template>
          <input
            v-model.number="power"
            class="power-slider"
            type="range"
            min="1"
            max="99"
            step="1"
            :style="{ '--pct': `${((power - 1) / 98) * 100}%` }"
            :aria-label="t('teams.form.power')"
          />
        </AppField>
      </div>

      <div class="section">
        <AppField layout="stack" :label="t('teams.form.color')">
          <AppColorPicker v-model="color" />
        </AppField>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!name.trim()" @click="submit">
        {{ isEdit ? t("common.save") : t("teams.form.addTitle") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>

  <AppModal
    v-if="showFlagPicker"
    ref="flagModal"
    :title="t('teams.form.flagPickerTitle')"
    :z-index="210"
    @close="showFlagPicker = false"
  >
    <FlagPicker :model-value="flag" @update:model-value="onFlagSelect" />
  </AppModal>

  <TeamImageSourceModal
    v-if="showSourceChooser"
    @close="showSourceChooser = false"
    @select-flag="onChooseFlag"
    @select-url="onChooseUrl"
    @select-gallery="onGallerySelect"
  />

  <TeamImageUrlModal
    v-if="showUrlModal"
    @close="showUrlModal = false"
    @update:model-value="onUrlSelect"
  />
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
  max-width: 100%;
}

/* ── Live preview ─────────────────────────────────────────────── */
.preview {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: color-mix(in srgb, var(--team-color) 8%, var(--surface));
  min-width: 0;
}

.crest {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--team-color);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.crest--filled {
  background: transparent;
}

.crest-img {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-pill);
  object-fit: contain;
  display: block;
}

.crest-clear {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  box-shadow: var(--elev-1);
  cursor: pointer;
}
.crest-clear:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.preview-text {
  min-width: 0;
}

.preview-name {
  margin: 0;
  font-family: var(--font);
  font-size: var(--fs-lg);
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-name--empty {
  color: var(--text-muted);
  font-weight: 400;
}

.preview-meta {
  margin: 2px 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.preview-meta strong {
  font-family: var(--font-mono);
  color: var(--text);
}

/* ── Sections ─────────────────────────────────────────────────── */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--border-light);
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

/* ── Name & abbreviation ──────────────────────────────────────── */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-full,
.input-abbr {
  width: 100%;
}
.input-full {
  padding-inline-end: var(--sp-6);
}

.btn-random {
  position: absolute;
  right: var(--sp-1);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ── Power slider ─────────────────────────────────────────────── */
.power-value {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--team-color);
  /* Keeps the number legible when the team colour is near-white. */
  text-shadow: 0 0 1px color-mix(in srgb, var(--text) 25%, transparent);
}

.power-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}
.power-slider:focus {
  outline: none;
  box-shadow: none;
}

.power-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: var(--radius-pill);
  background: linear-gradient(to right, var(--team-color) var(--pct), var(--border) var(--pct));
}
.power-slider::-moz-range-track {
  height: 6px;
  border-radius: var(--radius-pill);
  background: linear-gradient(to right, var(--team-color) var(--pct), var(--border) var(--pct));
}

.power-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  margin-top: -6px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 3px solid var(--team-color);
  box-shadow: var(--elev-1);
  transition: transform var(--dur-fast) var(--ease);
}
.power-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  border: 3px solid var(--team-color);
  box-shadow: var(--elev-1);
}

.power-slider:active::-webkit-slider-thumb {
  transform: scale(1.15);
}
.power-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--focus-ring);
}
.power-slider:focus-visible::-moz-range-thumb {
  box-shadow: var(--focus-ring);
}

/* ── Design languages ────────────────────────────────────────────
   iOS: a hairline track under a large white puck — the thumb is the
   control, the track is just a line. */
[data-design="ios"] .power-slider::-webkit-slider-runnable-track {
  height: 4px;
}
[data-design="ios"] .power-slider::-moz-range-track {
  height: 4px;
}
[data-design="ios"] .power-slider::-webkit-slider-thumb {
  width: 26px;
  height: 26px;
  margin-top: -11px;
  border: none;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.14),
    0 3px 8px rgba(0, 0, 0, 0.16);
}
[data-design="ios"] .power-slider::-moz-range-thumb {
  width: 26px;
  height: 26px;
  border: none;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.14),
    0 3px 8px rgba(0, 0, 0, 0.16);
}
[data-design="ios"] .power-slider:active::-webkit-slider-thumb {
  transform: none;
}

/* M3: the handle is a short vertical bar, not a knob, and the track is
   split into an active and an inactive half with rounded ends. */
[data-design="android"] .power-slider::-webkit-slider-runnable-track {
  height: 16px;
}
[data-design="android"] .power-slider::-moz-range-track {
  height: 16px;
}
[data-design="android"] .power-slider::-webkit-slider-thumb {
  width: 4px;
  height: 28px;
  margin-top: -6px;
  border: none;
  border-radius: 2px;
  background: var(--player-color);
  box-shadow: none;
}
[data-design="android"] .power-slider::-moz-range-thumb {
  width: 4px;
  height: 28px;
  border: none;
  border-radius: 2px;
  background: var(--player-color);
  box-shadow: none;
}
[data-design="android"] .power-slider:active::-webkit-slider-thumb {
  transform: scaleY(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .crest,
  .power-slider::-webkit-slider-thumb {
    transition: none;
  }
}
</style>
