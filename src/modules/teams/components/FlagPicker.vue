<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import FlagCircle from "./FlagCircle.vue"
import { X, Search } from "@lucide/vue"
import { COUNTRY_FLAGS } from "@/constants.ts"

const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ "update:modelValue": [string | undefined] }>()

const { t } = useI18n()
const search = ref("")

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return COUNTRY_FLAGS
  return COUNTRY_FLAGS.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  )
})

function select(code: string) {
  emit("update:modelValue", code)
}

function clear() {
  emit("update:modelValue", undefined)
  search.value = ""
}
</script>

<template>
  <div class="flag-picker">
    <div class="search-row">
      <div class="search-wrap">
        <Search class="search-icon" :size="14" />
        <input
          v-model="search"
          class="search-input"
          :placeholder="t('teams.form.flagSearch')"
          autocomplete="off"
        />
      </div>
      <button
        v-show="modelValue"
        class="btn-clear"
        type="button"
        :title="t('teams.form.flagRemove')"
        @click="clear"
      >
        <X :size="14" />
      </button>
    </div>

    <div class="grid">
      <button
        v-for="c in filtered"
        :key="c.code"
        type="button"
        class="flag-btn"
        :class="{ selected: modelValue === c.code }"
        :title="c.name"
        @click="select(c.code)"
      >
        <FlagCircle :code="c.code" :size="40" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.flag-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-row {
  display: flex;
  align-items: stretch;
  gap: 6px;
}

.search-wrap {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 8px;
  color: var(--text-muted);
  pointer-events: none;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  font-size: 13px;
  padding-left: 28px;
}

.btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--text-muted);
  flex-shrink: 0;
  transition:
    color 0.1s,
    background 0.1s;
}
.btn-clear:hover {
  color: var(--text);
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 6px;
  overflow-y: auto;
}

.flag-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  padding: 0;
  background: transparent;
  border: 2px solid transparent;
  border-radius: var(--radius);
  cursor: pointer;
  transition:
    border-color 0.1s,
    background 0.1s;
}
.flag-btn:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
}
.flag-btn.selected {
  border-color: var(--accent, #3b82f6);
}
</style>
