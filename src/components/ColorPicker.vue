<script setup lang="ts">
import { ref, watch } from "vue"

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ "update:modelValue": [string] }>()

const nativeInput = ref<HTMLInputElement | null>(null)

const PRESETS = [
  "#e63946",
  "#f4722b",
  "#f4a623",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#fb7185",
  "#a16207",
  "#78716c",
  "#0f172a",
  "#334155",
  "#64748b",
  "#94a3b8",
  "#ffffff",
  "#e2e8f0",
  "#f59e0b",
  "#10b981",
]

const hexInput = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => {
    hexInput.value = v
  }
)

function selectPreset(c: string) {
  hexInput.value = c
  emit("update:modelValue", c)
}

function onHexInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  hexInput.value = raw
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    emit("update:modelValue", raw)
  }
}

function onHexBlur() {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
    hexInput.value = props.modelValue
  }
}

function openNativePicker() {
  nativeInput.value?.click()
}

function onNativePick(e: Event) {
  const val = (e.target as HTMLInputElement).value
  hexInput.value = val
  emit("update:modelValue", val)
}
</script>

<template>
  <div class="cp">
    <div class="presets">
      <button
        v-for="c in PRESETS"
        :key="c"
        class="swatch"
        :class="{ selected: modelValue === c }"
        :style="{ background: c }"
        :title="c"
        type="button"
        @click="selectPreset(c)"
      />
    </div>
    <div class="hex-row">
      <span
        class="preview"
        :style="{ background: modelValue }"
        title="Open color picker"
        @click="openNativePicker"
      />
      <input
        ref="nativeInput"
        type="color"
        :value="modelValue"
        class="native-picker"
        tabindex="-1"
        @input="onNativePick"
      />
      <input
        :value="hexInput"
        class="hex-input"
        maxlength="7"
        spellcheck="false"
        placeholder="#rrggbb"
        @input="onHexInput"
        @blur="onHexBlur"
      />
    </div>
  </div>
</template>

<style scoped>
.cp {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.presets {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
}

.swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.1s,
    border-color 0.1s;
  outline: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
}
.swatch:hover {
  transform: scale(1.12);
}
.swatch.selected {
  border-color: var(--text);
  transform: scale(1.1);
}

.hex-row {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.preview {
  width: 28px;
  height: 28px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1) inset;
  cursor: pointer;
  transition: transform 0.1s;
}
.preview:hover {
  transform: scale(1.1);
}
.native-picker {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.hex-input {
  flex: 1;
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
