<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { AppButton, AppField, AppIcon, AppModal, ColorPicker } from "@/components/ui"
import FlagPicker from "./FlagPicker.vue"
import FlagCircle from "./FlagCircle.vue"
import { flagPrimaryColor } from "../flags"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import { randomTeamName } from "@/composables/useRandomNames"
import { Shuffle, X, Plus } from "@lucide/vue"
import type { Team } from "../types"
import { useI18n } from "vue-i18n"
import { COUNTRY_FLAGS } from "@/constants.ts"

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
const power = ref(props.team?.power ?? 70)
const showFlagPicker = ref(false)

const abbrPlaceholder = ref(autoAbbr(name.value))
watch(name, (v) => {
  abbrPlaceholder.value = autoAbbr(v)
})

const flagName = computed(
  () => COUNTRY_FLAGS.find((c) => c.code === flag.value)?.name ?? flag.value
)

/* Crest preview. The initials sit directly on the team colour, so pick the
   ink from the fill's luminance — a light colour like white needs dark text. */
const crestAbbr = computed(() =>
  (abbr.value.trim() || abbrPlaceholder.value || "—").slice(0, 3).toUpperCase()
)

const crestInk = computed(() => {
  const hex = color.value.replace("#", "")
  if (hex.length !== 6) return "#ffffff"
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return l > 0.45 ? "#111827" : "#ffffff"
})

async function onFlagSelect(code: string | undefined) {
  flag.value = code
  flagModal.value?.close()
  if (code) {
    const primary = await flagPrimaryColor(code)
    if (primary) color.value = primary
  }
}

function submit() {
  if (!name.value.trim()) return
  if (isEdit && props.team) {
    store.update(props.team.id, {
      name: name.value.trim(),
      abbr: abbr.value.trim().slice(0, 7) || undefined,
      color: color.value,
      flag: flag.value,
      power: power.value,
    })
  } else {
    store.add(
      name.value.trim(),
      color.value,
      power.value,
      abbr.value.trim() || undefined,
      flag.value
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
    <div class="form" :style="{ '--team-color': color, '--crest-ink': crestInk }">
      <!-- Live identity preview: everything below feeds this crest. -->
      <div class="preview">
        <div class="crest">
          <span class="crest-abbr">{{ crestAbbr }}</span>
          <FlagCircle v-if="flag" :code="flag" :size="20" class="crest-flag" />
        </div>
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

        <div class="field-row">
          <AppField layout="stack" :label="t('teams.form.abbreviation')" class="field-grow">
            <input
              v-model="abbr"
              class="input-abbr"
              :placeholder="abbrPlaceholder"
              maxlength="7"
              @keyup.enter="submit"
            />
          </AppField>

          <AppField layout="stack">
            <template #label>
              {{ t("teams.form.flag") }}
              <span class="label-optional">{{ t("common.optional") }}</span>
            </template>
            <div class="flag-slot">
              <button
                type="button"
                class="flag-btn"
                :class="{ 'flag-btn--empty': !flag }"
                :title="flag ? flagName : t('teams.form.flagPickerTitle')"
                @click="showFlagPicker = true"
              >
                <FlagCircle v-if="flag" :code="flag" :size="30" />
                <AppIcon v-else :icon="Plus" size="sm" />
              </button>
              <button
                v-if="flag"
                type="button"
                class="flag-clear"
                :title="t('teams.form.flagRemove')"
                @click="flag = undefined"
              >
                <AppIcon :icon="X" size="xs" />
              </button>
            </div>
          </AppField>
        </div>
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
          <ColorPicker v-model="color" />
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
  transition: background var(--dur) var(--ease);
}

.crest-abbr {
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--crest-ink);
}

.crest-flag {
  position: absolute;
  right: -2px;
  bottom: -2px;
  box-shadow: 0 0 0 2px var(--surface);
  border-radius: var(--radius-pill);
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

.field-row {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-end;
}

.field-grow {
  flex: 1;
  min-width: 0;
}

.label-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-2);
}

.label-optional {
  font-weight: 400;
  font-size: var(--fs-xs);
  color: var(--text-muted);
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
  padding-right: var(--sp-6);
}

.btn-random {
  position: absolute;
  right: var(--sp-1);
}

/* ── Flag ─────────────────────────────────────────────────────── */
.flag-slot {
  position: relative;
  flex-shrink: 0;
}

.flag-btn {
  width: 38px;
  height: 38px;
  padding: 0;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--text-muted);
}
.flag-btn--empty {
  border-style: dashed;
}

.flag-clear {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  padding: 0;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text-muted);
  box-shadow: var(--elev-1);
}
.flag-clear:hover {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--surface);
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

@media (prefers-reduced-motion: reduce) {
  .crest,
  .power-slider::-webkit-slider-thumb {
    transition: none;
  }
}
</style>
