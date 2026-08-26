<script setup lang="ts">
import { ref } from "vue"
import { ChevronDown, Shuffle } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import type { Match, Round } from "../../types"
import { useI18n } from "vue-i18n"
import { useEngineLabels } from "@/composables/useEngineLabels"

defineProps<{
  rounds: Round[]
  thirdPlaceMatch?: Match | null
}>()

const emit = defineEmits<{
  "sim-all": []
  "sim-round": [roundIdx: number]
  "sim-third-place": []
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
        <AppButton variant="text" size="xs" block @click="run(() => emit('sim-all'))">
          {{ t("tournament.simulateAll") }}
        </AppButton>

        <AppButton
          v-for="(round, ri) in rounds"
          :key="ri"
          variant="text"
          size="xs"
          block
          @click="run(() => emit('sim-round', ri))"
        >
          {{ t("tournament.simulateRound", { round: engineLabel(round.name) }) }}
        </AppButton>

        <AppButton
          v-if="thirdPlaceMatch"
          variant="text"
          size="xs"
          block
          @click="run(() => emit('sim-third-place'))"
        >
          {{ t("tournament.simulateThirdPlace") }}
        </AppButton>
      </div>
    </div>

    <AppButton variant="outlined" size="xs" class="sim-inline" @click="emit('sim-all')">
      <AppIcon :icon="Shuffle" size="md" />
      {{ t("tournament.simulateAll") }}
    </AppButton>

    <AppButton
      v-for="(round, ri) in rounds"
      :key="ri"
      variant="outlined"
      size="xs"
      class="sim-inline"
      @click="emit('sim-round', ri)"
    >
      {{ t("tournament.simulateRound", { round: engineLabel(round.name) }) }}
    </AppButton>

    <AppButton
      v-if="thirdPlaceMatch"
      variant="outlined"
      size="xs"
      class="sim-inline"
      @click="emit('sim-third-place')"
    >
      {{ t("tournament.simulateThirdPlace") }}
    </AppButton>
  </div>
</template>

<style scoped>
.sim-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: var(--sp-3);
  flex-wrap: wrap;
  gap: var(--sp-2);
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
