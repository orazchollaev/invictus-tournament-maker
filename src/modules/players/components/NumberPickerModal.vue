<script setup lang="ts">
/** Select-styled trigger that opens a modal grid of circular 1–99 number buttons. */
import { ref } from "vue"
import { AppButton, AppIcon, AppModal } from "@/components/ui"
import { ChevronDown } from "@lucide/vue"
import { useI18n } from "vue-i18n"

defineProps<{ placeholder?: string }>()
const model = defineModel<number | null>({ required: true })

const { t } = useI18n()
const open = ref(false)
const modal = ref<InstanceType<typeof AppModal> | null>(null)

const numbers = Array.from({ length: 99 }, (_, i) => i + 1)

function pick(n: number) {
  model.value = n
  modal.value?.close()
}

function clear() {
  model.value = null
  modal.value?.close()
}
</script>

<template>
  <button type="button" class="npick-trigger" @click="open = true">
    <span class="npick-value" :class="{ 'npick-value--empty': model == null }">
      {{ model ?? placeholder ?? "—" }}
    </span>
    <AppIcon :icon="ChevronDown" size="xs" class="npick-icon" />
  </button>

  <AppModal
    v-if="open"
    ref="modal"
    :title="t('players.form.numberPickerTitle')"
    :z-index="260"
    @close="open = false"
  >
    <div class="npick-grid">
      <button
        v-for="n in numbers"
        :key="n"
        type="button"
        class="npick-cell"
        :class="{ 'npick-cell--active': model === n }"
        @click="pick(n)"
      >
        {{ n }}
      </button>
    </div>

    <template #footer>
      <AppButton variant="text" @click="clear">{{ t("players.form.numberClear") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.npick-trigger {
  display: flex;
  align-items: center;
  width: 100%;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: var(--fs-md);
  font-weight: 400;
  font-family: var(--font-ui);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.npick-trigger:hover {
  border-color: var(--accent);
}
.npick-trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: var(--focus-ring);
}

.npick-value {
  flex: 1;
  min-width: 0;
  text-align: left;
  font-family: var(--font-mono);
  font-weight: 700;
}
.npick-value--empty {
  font-family: var(--font-ui);
  font-weight: 400;
  color: var(--text-muted);
}

.npick-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.npick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
  gap: var(--sp-2);
}

.npick-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.npick-cell:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.npick-cell:active {
  transform: scale(0.92);
}
.npick-cell--active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
</style>
