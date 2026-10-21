<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from "vue"
import {
  AppButton,
  AppField,
  AppIcon,
  AppModal,
  AppColorPicker,
  AppStarRating,
} from "@/components/ui"
import FlagPicker from "./FlagPicker.vue"
import FlagCircle from "./FlagCircle.vue"
import TeamCategoryEditor from "./TeamCategoryEditor.vue"
import TeamImageSourceModal from "./TeamImageSourceModal.vue"
import TeamImageUrlModal from "./TeamImageUrlModal.vue"
import { CrestBuilderModal } from "./crest"
import { flagPrimaryColor } from "../utils/flags"
import { isDrawnCrest, resizeImageFile } from "../utils/imageUtils"
import { categoriesToRows, categoryRowsValid, rowsToCategories } from "../utils/categories"
import { loadCrestEngine, useCrestEngine } from "../composables/useCrestEngine"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import { randomTeamName } from "@/composables/useRandomNames"
import { showAlert } from "@/composables/useDialog"
import { Dices, Pencil, Shuffle, X } from "@lucide/vue"
import type { Team } from "../types"
import type { CrestSpec } from "@/engine/crest"
import { useI18n } from "vue-i18n"
import { logEvent } from "@/composables/useAnalytics"

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
const crest = ref<CrestSpec | undefined>(props.team?.crest)
const categoryRows = ref(categoriesToRows(props.team?.categories))
const canSubmit = computed(() => !!name.value.trim() && categoryRowsValid(categoryRows.value))
const crestEngine = useCrestEngine()
const showCrestBuilder = ref(false)
const showFlagPicker = ref(false)
const showSourceChooser = ref(false)
const showUrlModal = ref(false)
const imgError = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Cosmetic only — power (1-99) stays the source of truth for simulation.
const powerStars = computed(() => Math.round((power.value / 99) * 10) / 2)

const abbrPlaceholder = ref(autoAbbr(name.value))
watch(name, (v) => {
  abbrPlaceholder.value = autoAbbr(v)
})

const crestText = computed(() => ({
  name: name.value.trim(),
  abbr: abbr.value.trim() || abbrPlaceholder.value,
}))

// A builder crest is redrawn from its spec as the name and abbreviation are
// typed, so the preview always shows what will be saved.
const shownImage = computed(() =>
  crest.value && crestEngine.value
    ? crestEngine.value.renderCrestDataUrl(crest.value, crestText.value)
    : image.value
)

function setCrest(spec: CrestSpec) {
  crest.value = spec
  flag.value = undefined
  image.value = undefined
  imgError.value = false
  color.value = spec.colors.field
}

async function rollCrest() {
  const engine = await loadCrestEngine()
  setCrest(engine.randomCrest())
}

// A new team opens with a crest already drawn: something to keep, reroll or tweak.
onMounted(() => {
  if (!isEdit) void rollCrest()
})

async function onChooseCrest() {
  showSourceChooser.value = false
  await loadCrestEngine()
  crest.value ??= crestEngine.value!.randomCrest(Math.random, color.value)
  showCrestBuilder.value = true
}

function onCrestApply(spec: CrestSpec) {
  setCrest(spec)
  showCrestBuilder.value = false
}

async function onFlagSelect(code: string | undefined) {
  flag.value = code
  image.value = undefined
  crest.value = undefined
  flagModal.value?.close()
  if (code) {
    const primary = await flagPrimaryColor(code)
    if (primary) color.value = primary
  }
}

function onUrlSelect(url: string) {
  image.value = url
  flag.value = undefined
  crest.value = undefined
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
    crest.value = undefined
    imgError.value = false
  } catch {
    showAlert(t("teams.form.imageInvalid"))
  }
}

function clearImage() {
  flag.value = undefined
  image.value = undefined
  crest.value = undefined
}

function submit() {
  if (!canSubmit.value) return
  const categories = rowsToCategories(categoryRows.value)
  // Without the engine loaded there is nothing new to draw; keep what was there.
  const finalImage = crest.value && crestEngine.value ? shownImage.value : image.value
  const finalCrest = crest.value && crestEngine.value ? crest.value : undefined
  if (isEdit && props.team) {
    store.update(props.team.id, {
      name: name.value.trim(),
      abbr: abbr.value.trim().slice(0, 7) || undefined,
      color: color.value,
      flag: flag.value,
      image: finalImage,
      crest: finalCrest ?? (finalImage === props.team.image ? props.team.crest : undefined),
      power: power.value,
      categories,
    })
  } else {
    store.add(
      name.value.trim(),
      color.value,
      power.value,
      abbr.value.trim() || undefined,
      flag.value,
      finalImage,
      finalCrest,
      categories
    )
    void logEvent("team_created")
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
    <div class="form" :style="{ '--team-color': color, '--power-color': color }">
      <!-- Live identity preview: click the crest to pick a flag or a custom image. -->
      <div class="preview">
        <div
          class="crest"
          :class="{ 'crest--filled': flag || shownImage, 'crest--drawn': isDrawnCrest(shownImage) }"
          @click="showSourceChooser = true"
        >
          <img
            v-if="shownImage && !imgError"
            :src="shownImage"
            class="crest-img"
            alt=""
            @error="imgError = true"
          />
          <FlagCircle v-else-if="flag" :code="flag" :size="52" class="crest-img" />
          <button
            v-if="flag || shownImage"
            type="button"
            class="crest-clear"
            :title="t('teams.form.imageRemove')"
            @click.stop="clearImage"
          >
            <AppIcon :icon="X" size="xs" />
          </button>
          <!-- Tells users the crest is tappable; the tap itself is the crest's. -->
          <span class="crest-edit" aria-hidden="true">
            <AppIcon :icon="Pencil" size="xs" />
          </span>
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
            <AppStarRating :value="powerStars" :size="12" class="preview-stars" />
          </p>
        </div>
        <AppButton
          variant="text"
          size="sm"
          icon-only
          class="crest-roll"
          :title="t('teams.crest.random')"
          :aria-label="t('teams.crest.random')"
          @click="rollCrest"
        >
          <AppIcon :icon="Dices" />
        </AppButton>
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

      <div class="section">
        <AppField layout="stack" :label="t('teams.categories.label')">
          <TeamCategoryEditor v-model="categoryRows" />
        </AppField>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!canSubmit" @click="submit">
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
    show-crest
    @select-crest="onChooseCrest"
    @close="showSourceChooser = false"
    @select-flag="onChooseFlag"
    @select-url="onChooseUrl"
    @select-gallery="onGallerySelect"
  />

  <CrestBuilderModal
    v-if="showCrestBuilder && crest"
    :spec="crest"
    :text="crestText"
    @close="showCrestBuilder = false"
    @apply="onCrestApply"
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

.crest--drawn .crest-img {
  border-radius: 0;
}

.crest-roll {
  margin-inline-start: auto;
  flex-shrink: 0;
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

.crest-edit {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--elev-1);
  pointer-events: none;
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

.preview-stars {
  margin-inline-start: var(--sp-1);
  vertical-align: -1px;
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

@media (prefers-reduced-motion: reduce) {
  .crest {
    transition: none;
  }
}
</style>
