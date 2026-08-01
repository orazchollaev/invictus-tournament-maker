<script setup lang="ts">
/**
 * Search field with a leading magnifier. Replaces the three separate
 * `.search-wrap` / `.search-icon` / `.search-input` triples that
 * TeamsPage, FlagPicker and TeamSelector each defined for themselves.
 */
import { Search } from "@lucide/vue"
import AppIcon from "./AppIcon.vue"

withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    /** Shorter field for dense panels. */
    size?: "sm" | "md"
  }>(),
  { size: "md" }
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="search-field" :class="`search-field--${size}`">
    <AppIcon :icon="Search" size="sm" class="search-field-icon" />
    <input
      v-model="model"
      type="text"
      class="search-field-input"
      :disabled="disabled"
      :placeholder="placeholder"
    />
  </div>
</template>

<style scoped>
.search-field {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.search-field-icon {
  position: absolute;
  left: var(--sp-3);
  color: var(--text-muted);
  pointer-events: none;
}

.search-field-input {
  width: 100%;
  padding: var(--sp-2) var(--sp-3) var(--sp-2) var(--sp-6);
  font-size: var(--fs-base);
  font-family: var(--font-ui);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  box-sizing: border-box;
  transition: border-color var(--dur-fast) var(--ease);
}
.search-field--md .search-field-input {
  height: 34px;
}
.search-field-input:focus {
  outline: none;
  border-color: var(--accent);
}
.search-field-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.search-field-input::placeholder {
  color: var(--text-muted);
}
</style>
