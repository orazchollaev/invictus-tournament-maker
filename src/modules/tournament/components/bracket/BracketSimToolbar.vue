<script setup lang="ts">
import { ref } from "vue"
import { ChevronDown, Shuffle } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import type { Match, Round } from "../../types"

const props = defineProps<{
  rounds: Round[]
  thirdPlaceMatch?: Match | null
}>()

const emit = defineEmits<{
  "sim-all": []
  "sim-round": [roundIdx: number]
  "sim-third-place": []
}>()

const menuOpen = ref(false)

/** 3rd place can only run once both semi-finals have produced losers. */
function thirdPlaceReady() {
  const m = props.thirdPlaceMatch
  return !!m && !!m.homeId && !!m.awayId && !m.result
}

function run(action: () => void) {
  action()
  menuOpen.value = false
}
</script>

<template>
  <div class="sim-toolbar">
    <!-- Mobile: one dropdown holding every sim action -->
    <div class="sim-dropdown">
      <AppButton variant="outlined" size="xs" @click="menuOpen = !menuOpen">
        <AppIcon :icon="Shuffle" size="xs" />
        Simulate
        <AppIcon :icon="ChevronDown" size="xs" class="sim-chevron" :class="{ open: menuOpen }" />
      </AppButton>
      <div v-if="menuOpen" class="sim-dropdown-panel">
        <AppButton variant="text" size="xs" block @click="run(() => emit('sim-all'))">
          Simulate All
        </AppButton>
        <AppButton
          v-for="(round, ri) in rounds"
          :key="ri"
          variant="text"
          size="xs"
          block
          @click="run(() => emit('sim-round', ri))"
        >
          Sim {{ round.name }}
        </AppButton>
        <AppButton
          v-if="thirdPlaceMatch"
          variant="text"
          size="xs"
          block
          :disabled="!thirdPlaceReady()"
          @click="run(() => emit('sim-third-place'))"
        >
          Sim 3rd Place
        </AppButton>
      </div>
    </div>

    <!-- Desktop: the same actions laid out inline -->
    <AppButton variant="outlined" size="xs" class="sim-inline" @click="emit('sim-all')">
      <AppIcon :icon="Shuffle" size="md" />
      Simulate All
    </AppButton>
    <AppButton
      v-for="(round, ri) in rounds"
      :key="ri"
      variant="outlined"
      size="xs"
      class="sim-inline"
      @click="emit('sim-round', ri)"
    >
      Sim {{ round.name }}
    </AppButton>
    <AppButton
      v-if="thirdPlaceMatch"
      variant="outlined"
      size="xs"
      class="sim-inline"
      :disabled="!thirdPlaceReady()"
      @click="emit('sim-third-place')"
    >
      Sim 3rd Place
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
  left: 0;
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
  text-align: left;
}

@media (max-width: 640px) {
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
