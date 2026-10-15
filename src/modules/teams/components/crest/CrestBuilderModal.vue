<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Dices } from "@lucide/vue"
import {
  AppButton,
  AppButtonGroup,
  AppColorPicker,
  AppField,
  AppIcon,
  AppModal,
  AppSubTabBar,
  AppToggle,
} from "@/components/ui"
import type { CrestPart, CrestPlacement, CrestSpec, CrestText } from "@/engine/crest"
import { useCrestEngine } from "@/modules/teams/composables/useCrestEngine"
import CrestOptionGrid from "./CrestOptionGrid.vue"
import CrestPlacementControl from "./CrestPlacementControl.vue"

const props = defineProps<{ spec: CrestSpec; text: CrestText }>()
const emit = defineEmits<{ close: []; apply: [spec: CrestSpec] }>()

const { t } = useI18n()
const engine = useCrestEngine()
const modal = ref<InstanceType<typeof AppModal> | null>(null)

const spec = ref<CrestSpec>(JSON.parse(JSON.stringify(props.spec)))
const tab = ref("shape")
const rolling = ref(false)

const tabs = computed(() =>
  ["shape", "colors", "pattern", "emblem", "extras"].map((value) => ({
    value,
    label: t(`teams.crest.tabs.${value}`),
  }))
)

const preview = computed(() => engine.value?.renderCrestDataUrl(spec.value, props.text) ?? "")

/** The current crest with one thing changed, stripped of stars and banner so the shield fills the tile. */
function thumb(patch: Partial<CrestSpec>): string {
  if (!engine.value) return ""
  return engine.value.renderCrestDataUrl(
    { ...spec.value, stars: 0, ribbon: false, ...patch },
    props.text
  )
}

const shapeOptions = computed(() =>
  (engine.value?.CREST_SHAPES ?? []).map((shape, i) => ({
    value: shape,
    src: thumb({ shape }),
    label: `${t("teams.crest.tabs.shape")} ${i + 1}`,
  }))
)

const patternOptions = computed(() =>
  (engine.value?.CREST_PATTERNS ?? []).map((pattern, i) => ({
    value: pattern,
    src: thumb({ pattern, emblem: { kind: "none" }, year: undefined }),
    label: `${t("teams.crest.tabs.pattern")} ${i + 1}`,
  }))
)

const emblemValue = computed(() => {
  const e = spec.value.emblem
  return e.kind === "charge" ? e.id : e.kind
})

const emblemBasics = computed(() => [
  { value: "none", label: t("teams.crest.emblemNone") },
  {
    value: "monogram",
    src: thumb({ emblem: { kind: "monogram", text: monogram.value || undefined } }),
    label: t("teams.crest.emblemMonogram"),
  },
])

const emblemGroups = computed(() => {
  const e = engine.value
  if (!e) return []
  return e.CHARGE_GROUPS.map((group) => ({
    group,
    options: e.chargesInGroup(group).map((id) => ({
      value: id,
      src: thumb({ emblem: { kind: "charge", id } }),
      label: id,
    })),
  }))
})

const monogram = ref(spec.value.emblem.kind === "monogram" ? (spec.value.emblem.text ?? "") : "")

function setEmblem(value: string) {
  if (value === "none") spec.value.emblem = { kind: "none" }
  else if (value === "monogram")
    spec.value.emblem = { kind: "monogram", text: monogram.value.trim() || undefined }
  else spec.value.emblem = { kind: "charge", id: value }
}

function onMonogramInput() {
  setEmblem("monogram")
}

function applyPalette([field, pattern, emblem]: [string, string, string]) {
  spec.value.colors = { field, pattern, emblem }
}

const starOptions = [0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))
const fontOptions = computed(() => [
  { value: "sans", label: t("teams.crest.fontSans") },
  { value: "serif", label: t("teams.crest.fontSerif") },
])

function placementOf(part: CrestPart): CrestPlacement {
  return engine.value?.placement(spec.value, part) ?? { pos: "center", size: "md" }
}

function setPlacement(part: CrestPart, value: CrestPlacement) {
  spec.value.layout = { ...spec.value.layout, [part]: value }
}

function shuffle() {
  if (!engine.value) return
  spec.value = engine.value.randomCrest()
  monogram.value = ""
  rolling.value = false
  requestAnimationFrame(() => (rolling.value = true))
}

function apply() {
  emit("apply", JSON.parse(JSON.stringify(spec.value)))
  modal.value?.close()
}
</script>

<template>
  <AppModal ref="modal" :title="t('teams.crest.title')" :z-index="210" @close="emit('close')">
    <div v-if="engine" class="builder">
      <div class="head">
        <div class="stage">
          <img
            :src="preview"
            alt=""
            class="stage-img"
            :class="{ 'stage-img--roll': rolling }"
            @animationend="rolling = false"
          />
          <AppButton variant="filled" size="sm" class="stage-roll" @click="shuffle">
            <AppIcon :icon="Dices" size="sm" />
            {{ t("teams.crest.shuffle") }}
          </AppButton>
        </div>

        <AppSubTabBar v-model="tab" :options="tabs" class="tabs" />
      </div>

      <section v-if="tab === 'shape'">
        <CrestOptionGrid v-model="spec.shape" :options="shapeOptions" />
      </section>

      <section v-else-if="tab === 'colors'" class="stack">
        <div>
          <p class="label">{{ t("teams.crest.palettes") }}</p>
          <div class="palettes">
            <button
              v-for="(p, i) in engine.CREST_PALETTES"
              :key="i"
              type="button"
              class="palette"
              :aria-label="`${t('teams.crest.palettes')} ${i + 1}`"
              @click="applyPalette(p)"
            >
              <span v-for="(c, j) in p" :key="j" :style="{ background: c }" />
            </button>
          </div>
        </div>
        <AppField layout="stack" :label="t('teams.crest.colorField')">
          <AppColorPicker v-model="spec.colors.field" />
        </AppField>
        <AppField layout="stack" :label="t('teams.crest.colorPattern')">
          <AppColorPicker v-model="spec.colors.pattern" />
        </AppField>
        <AppField layout="stack" :label="t('teams.crest.colorEmblem')">
          <AppColorPicker v-model="spec.colors.emblem" />
        </AppField>
      </section>

      <section v-else-if="tab === 'pattern'">
        <CrestOptionGrid v-model="spec.pattern" :options="patternOptions" />
      </section>

      <section v-else-if="tab === 'emblem'" class="stack">
        <CrestPlacementControl
          v-if="spec.emblem.kind !== 'none'"
          :positions="engine.CREST_POSITIONS.emblem"
          :sizes="engine.CREST_SIZES"
          :model-value="placementOf('emblem')"
          @update:model-value="(v) => setPlacement('emblem', v)"
        />
        <CrestOptionGrid
          :model-value="emblemValue"
          :options="emblemBasics"
          @update:model-value="setEmblem"
        />
        <input
          v-if="spec.emblem.kind === 'monogram'"
          v-model="monogram"
          maxlength="4"
          :placeholder="text.abbr || t('teams.crest.monogramPlaceholder')"
          @input="onMonogramInput"
        />
        <div v-for="g in emblemGroups" :key="g.group">
          <p class="label">{{ t(`teams.crest.groups.${g.group}`) }}</p>
          <CrestOptionGrid
            :model-value="emblemValue"
            :options="g.options"
            @update:model-value="setEmblem"
          />
        </div>
      </section>

      <section v-else class="stack">
        <AppField layout="stack" :label="t('teams.crest.stars')">
          <AppButtonGroup
            :options="starOptions"
            :model-value="String(spec.stars)"
            block
            @update:model-value="(v) => (spec.stars = Number(v))"
          />
        </AppField>
        <CrestPlacementControl
          v-if="spec.stars > 0"
          :positions="engine.CREST_POSITIONS.stars"
          :sizes="engine.CREST_SIZES"
          :model-value="placementOf('stars')"
          @update:model-value="(v) => setPlacement('stars', v)"
        />
        <AppField layout="split" :label="t('teams.crest.ribbon')">
          <AppToggle v-model="spec.ribbon" :aria-label="t('teams.crest.ribbon')" />
        </AppField>
        <CrestPlacementControl
          v-if="spec.ribbon"
          :positions="engine.CREST_POSITIONS.ribbon"
          :sizes="engine.CREST_SIZES"
          :model-value="placementOf('ribbon')"
          @update:model-value="(v) => setPlacement('ribbon', v)"
        />
        <AppField layout="split" :label="t('teams.crest.trim')">
          <AppToggle v-model="spec.trim" :aria-label="t('teams.crest.trim')" />
        </AppField>
        <AppField layout="stack" :label="t('teams.crest.year')">
          <input
            v-model="spec.year"
            inputmode="numeric"
            maxlength="4"
            :placeholder="t('teams.crest.yearPlaceholder')"
          />
        </AppField>
        <CrestPlacementControl
          v-if="spec.year"
          :positions="engine.CREST_POSITIONS.year"
          :sizes="engine.CREST_SIZES"
          :model-value="placementOf('year')"
          @update:model-value="(v) => setPlacement('year', v)"
        />
        <AppField layout="stack" :label="t('teams.crest.font')">
          <AppButtonGroup
            :options="fontOptions"
            :model-value="spec.font"
            block
            @update:model-value="(v) => (spec.font = v as CrestSpec['font'])"
          />
        </AppField>
      </section>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!engine" @click="apply">
        {{ t("teams.crest.apply") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}

/*
 * Preview and tabs stay in view while the options scroll, so each change
 * shows at once. Pulled out over the drawer body's 14px padding so nothing
 * scrolls past above it.
 */
.head {
  position: sticky;
  top: -14px;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin: -14px -14px 0;
  padding: 14px 14px var(--sp-2);
  background: var(--surface);
}

.stage {
  position: relative;
  display: grid;
  place-items: center;
  padding: var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: radial-gradient(
    circle at 50% 40%,
    color-mix(in srgb, var(--accent) 14%, var(--surface)),
    var(--surface) 70%
  );
}

.stage-img {
  width: 150px;
  height: 150px;
  object-fit: contain;
}
.stage-img--roll {
  animation: roll 420ms var(--ease);
}

.stage-roll {
  position: absolute;
  right: var(--sp-2);
  bottom: var(--sp-2);
}

@keyframes roll {
  0% {
    transform: scale(0.82) rotate(-8deg);
    opacity: 0.4;
  }
  60% {
    transform: scale(1.06) rotate(3deg);
    opacity: 1;
  }
  100% {
    transform: none;
  }
}

.tabs {
  align-self: stretch;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.label {
  margin: 0 0 var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-muted);
}

.palettes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: var(--sp-2);
}

.palette {
  display: flex;
  /* Global button styles centre and space their content, which collapses the empty swatches. */
  align-items: stretch;
  gap: 0;
  height: 30px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
}
.palette:hover {
  border-color: var(--accent);
}
.palette span {
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  .stage-img--roll {
    animation: none;
  }
}
</style>
