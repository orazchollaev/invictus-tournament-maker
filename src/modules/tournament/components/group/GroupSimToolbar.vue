<script setup lang="ts">
import { ref } from "vue"
import type { Group } from "@/modules/tournament/types"
import { Shuffle, Check, ChevronDown } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"
import { useEngineLabels } from "@/composables/useEngineLabels"

defineProps<{
  groups: Group[]
  allDone: boolean
}>()

const emit = defineEmits<{
  simWeek: []
  simAll: []
  simGroup: [groupIdx: number]
  advance: []
}>()

const { t } = useI18n()
const { engineLabel } = useEngineLabels()

const menuOpen = ref(false)

function run(action: () => void) {
  action()
  menuOpen.value = false
}
</script>

<template>
  <div class="sim-toolbar">
    <div class="sim-dropdown">
      <AppButton variant="outlined" size="xs" @click="menuOpen = !menuOpen">
        <AppIcon :icon="Shuffle" size="xs" />
        {{ t("tournament.simulate") }}
        <AppIcon :icon="ChevronDown" size="xs" class="sim-chevron" :class="{ open: menuOpen }" />
      </AppButton>

      <div v-if="menuOpen" class="sim-dropdown-panel">
        <AppButton
          variant="text"
          size="xs"
          block
          :disabled="allDone"
          @click="run(() => emit('simWeek'))"
        >
          {{ t("tournament.simulateWeek") }}
        </AppButton>

        <AppButton
          variant="text"
          size="xs"
          block
          :disabled="allDone"
          @click="run(() => emit('simAll'))"
        >
          {{ t("tournament.simulateAll") }}
        </AppButton>

        <template v-for="(g, gi) in groups" :key="gi">
          <AppButton
            v-if="g.matches.some((m) => !m.result)"
            variant="text"
            size="xs"
            block
            @click="run(() => emit('simGroup', gi))"
          >
            {{ t("tournament.simulateGroup", { group: engineLabel(g.name) }) }}
          </AppButton>
        </template>
      </div>
    </div>

    <AppButton
      variant="outlined"
      size="xs"
      class="sim-inline"
      :disabled="allDone"
      @click="emit('simWeek')"
    >
      <AppIcon :icon="Shuffle" size="xs" />
      {{ t("tournament.simulateWeek") }}
    </AppButton>

    <AppButton
      variant="outlined"
      size="xs"
      class="sim-inline"
      :disabled="allDone"
      @click="emit('simAll')"
    >
      <AppIcon :icon="Shuffle" size="xs" />
      {{ t("tournament.simulateAll") }}
    </AppButton>

    <template v-for="(g, gi) in groups" :key="gi">
      <AppButton
        v-if="g.matches.some((m) => !m.result)"
        variant="outlined"
        size="xs"
        class="sim-inline"
        @click="emit('simGroup', gi)"
      >
        {{ t("tournament.simulateGroup", { group: engineLabel(g.name) }) }}
      </AppButton>
    </template>

    <AppButton
      v-if="allDone"
      variant="filled"
      size="xs"
      class="advance-btn"
      @click="emit('advance')"
    >
      <AppIcon :icon="Check" size="xs" />
      {{ t("tournament.advanceToKnockout") }}
    </AppButton>
  </div>
</template>

<style scoped>
.sim-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.advance-btn {
  margin-inline-start: auto;
}

.sim-dropdown {
  display: none;
  position: relative;
}

.sim-chevron {
  transition: transform var(--dur-fast) var(--ease);
}

.sim-chevron.open {
  transform: rotate(180deg);
}

.sim-dropdown-panel {
  position: absolute;
  top: calc(100% + var(--sp-1));
  inset-inline-start: 0;
  z-index: var(--z-dropdown);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 150px;
  box-shadow: var(--elev-2);
  max-height: 200px;
  overflow-y: auto;
}

.sim-dropdown-panel :deep(.btn) {
  justify-content: flex-start;
  text-align: start;
}

@media (max-width: 600px) {
  .sim-toolbar {
    gap: var(--sp-1);
  }

  .sim-inline {
    display: none;
  }

  .sim-dropdown {
    display: block;
  }
}
</style>
