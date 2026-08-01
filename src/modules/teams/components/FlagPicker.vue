<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import FlagCircle from "./FlagCircle.vue"
import { X } from "@lucide/vue"
import { AppSearchInput } from "@/components/ui"
import { COUNTRY_FLAGS } from "@/constants.ts"

defineProps<{ modelValue?: string }>()
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
      <AppSearchInput v-model="search" size="sm" :placeholder="t('teams.form.flagSearch')" />
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

/* Stretch so the clear button matches the field height. */
.search-row {
  align-items: stretch;
  gap: var(--sp-2);
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
  background: var(--bg-hover);
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
  background: var(--bg-hover);
}
.flag-btn.selected {
  border-color: var(--accent, #3b82f6);
}
</style>
