<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppIcon, AppSelect } from "@/components/ui"
import { Check, Plus, X } from "@lucide/vue"
import { useTeamsStore } from "../store"
import { newCategoryRow, type CategoryRow } from "../utils/categories"

const rows = defineModel<CategoryRow[]>({ required: true })

const { t } = useI18n()
const store = useTeamsStore()

// Id of the row currently naming a brand-new key, and the name typed so far.
const addingId = ref<number | null>(null)
const draft = ref("")
const root = ref<HTMLElement | null>(null)

// Keys already in use across the roster plus any just created in this form.
const allKeys = computed(() => {
  const keys = new Set(store.knownCategoryKeys)
  for (const r of rows.value) if (r.key) keys.add(r.key)
  return [...keys]
})

function optionsFor(row: CategoryRow) {
  const taken = new Set(rows.value.filter((r) => r.id !== row.id && r.key).map((r) => r.key))
  return allKeys.value.filter((k) => !taken.has(k)).map((k) => ({ value: k, label: k }))
}

function valueSuggestions(key: string) {
  return store.categoryValues(key)
}

function startAdding(row: CategoryRow) {
  addingId.value = row.id
  draft.value = ""
  // `autofocus` does nothing on an input mounted after page load.
  void nextTick(() => root.value?.querySelector<HTMLInputElement>(".cat-new-key")?.focus())
}

function confirmKey(row: CategoryRow) {
  const name = draft.value.trim()
  if (!name) return
  // Typing an existing key just selects it, unless another row already holds it.
  const clash = rows.value.some((r) => r.id !== row.id && r.key === name)
  if (!clash) {
    row.key = name
    store.addCategoryKey(name)
  }
  addingId.value = null
}

function addRow() {
  const row = newCategoryRow()
  rows.value.push(row)
  // Nothing to pick from yet: go straight to naming the first category.
  if (!allKeys.value.length) startAdding(row)
}

function removeRow(row: CategoryRow) {
  rows.value = rows.value.filter((r) => r.id !== row.id)
  if (addingId.value === row.id) addingId.value = null
}
</script>

<template>
  <div ref="root" class="cats">
    <div v-for="row in rows" :key="row.id" class="cat-row">
      <div class="cat-top">
        <div class="cat-key">
          <template v-if="addingId === row.id">
            <input
              v-model="draft"
              class="cat-input cat-new-key"
              :placeholder="t('teams.categories.newKeyPlaceholder')"
              @keyup.enter="confirmKey(row)"
              @keyup.esc="addingId = null"
            />
            <AppButton
              variant="tonal"
              size="md"
              icon-only
              :disabled="!draft.trim()"
              :title="t('teams.categories.confirmKey')"
              @click="confirmKey(row)"
            >
              <AppIcon :icon="Check" size="xs" />
            </AppButton>
          </template>
          <template v-else>
            <AppSelect
              v-model="row.key"
              :options="optionsFor(row)"
              :placeholder="t('teams.categories.keyPlaceholder')"
            />
            <AppButton
              variant="outlined"
              size="md"
              icon-only
              :title="t('teams.categories.newKey')"
              @click="startAdding(row)"
            >
              <AppIcon :icon="Plus" size="xs" />
            </AppButton>
          </template>
        </div>
        <AppButton
          variant="text"
          size="md"
          icon-only
          :title="t('teams.categories.removeRow')"
          @click="removeRow(row)"
        >
          <AppIcon :icon="X" size="xs" />
        </AppButton>
      </div>

      <input
        v-model="row.value"
        class="cat-input cat-value"
        :class="{ 'cat-input--invalid': row.key && !row.value.trim() }"
        :list="`cat-values-${row.id}`"
        :placeholder="t('teams.categories.valuePlaceholder')"
        :aria-required="!!row.key"
        :aria-invalid="!!row.key && !row.value.trim()"
        :disabled="!row.key"
      />
      <datalist :id="`cat-values-${row.id}`">
        <option v-for="v in valueSuggestions(row.key)" :key="v" :value="v" />
      </datalist>
    </div>

    <AppButton variant="tonal" size="sm" class="cat-add" @click="addRow">
      <AppIcon :icon="Plus" size="xs" />
      {{ t("teams.categories.addRow") }}
    </AppButton>
  </div>
</template>

<style scoped>
.cats {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  min-width: 0;
}

.cat-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.cat-top {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.cat-key {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
}

.cat-key > :first-child {
  flex: 1;
  min-width: 0;
}

.cat-input {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-md);
  min-width: 0;
}

.cat-input--invalid {
  border-color: var(--danger);
}

.cat-add {
  align-self: flex-start;
}
</style>
