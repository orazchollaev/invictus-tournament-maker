<script setup lang="ts">
import { ref } from "vue"
import type { Group } from "@/modules/tournament/types"
import { Shuffle, Check, ChevronDown } from "@lucide/vue"

defineProps<{
  groups: Group[]
  allDone: boolean
}>()

defineEmits<{
  simWeek: []
  simAll: []
  simGroup: [groupIdx: number]
  advance: []
}>()

const showSimMenu = ref(false)
</script>

<template>
  <div class="gs-toolbar">
    <!-- Mobile: single dropdown trigger -->
    <div class="sim-dropdown">
      <button class="sim-dropdown-trigger" @click="showSimMenu = !showSimMenu">
        <Shuffle :size="14" />
        Simulate
        <ChevronDown :size="12" class="sim-chevron" :class="{ open: showSimMenu }" />
      </button>
      <div v-if="showSimMenu" class="sim-dropdown-panel">
        <button :disabled="allDone" @click="(($emit('simWeek'), (showSimMenu = false)))">
          Sim Week
        </button>
        <button :disabled="allDone" @click="(($emit('simAll'), (showSimMenu = false)))">
          Simulate All
        </button>
        <template v-for="(g, gi) in groups" :key="gi">
          <button
            v-if="g.matches.some((m) => !m.result)"
            @click="(($emit('simGroup', gi), (showSimMenu = false)))"
          >
            Sim {{ g.name }}
          </button>
        </template>
      </div>
    </div>

    <!-- Desktop: inline buttons -->
    <button class="gs-sim-inline" :disabled="allDone" @click="$emit('simWeek')">
      <Shuffle :size="14" />
      Sim Week
    </button>
    <button class="gs-sim-inline" :disabled="allDone" @click="$emit('simAll')">
      <Shuffle :size="14" />
      Simulate All
    </button>
    <template v-for="(g, gi) in groups" :key="gi">
      <button
        v-if="g.matches.some((m) => !m.result)"
        class="gs-sim-inline"
        @click="$emit('simGroup', gi)"
      >
        Sim {{ g.name }}
      </button>
    </template>

    <button v-if="allDone" class="primary advance-btn" style="margin-left: auto" @click="$emit('advance')">
      <Check :size="14" />
      Advance to Knockout →
    </button>
  </div>
</template>

<style scoped>
.gs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 0 8px;
}

.sim-dropdown {
  display: none;
  position: relative;
}

.sim-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.sim-chevron {
  transition: transform 0.15s;
  &.open {
    transform: rotate(180deg);
  }
}

.sim-dropdown-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 200;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 150px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);

  button {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    font-size: 13px;
    padding: 5px 10px;
    background: var(--bg);
    &:hover {
      background: color-mix(in srgb, var(--accent) 12%, var(--bg));
    }
  }
}

@media (max-width: 600px) {
  .gs-toolbar {
    gap: 5px;
    padding: 0 4px;

    button {
      padding: 4px 8px;
      font-size: 12px;
    }

    .gs-sim-inline {
      display: none;
    }

    .sim-dropdown {
      display: block;
    }
  }
}
</style>
