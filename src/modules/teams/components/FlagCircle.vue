<script setup lang="ts">
import { ref, watch } from "vue"
import { flagDataUrl } from "../flags"

const props = defineProps<{ code: string; size?: number }>()
const size = props.size ?? 20

const src = ref<string | undefined>(undefined)

watch(
  () => props.code,
  async (newCode) => {
    if (!newCode) {
      src.value = undefined
      return
    }
    src.value = await flagDataUrl(newCode)
  },
  { immediate: true }
)
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :width="size"
    :height="size"
    :alt="code"
    class="flag-circle"
    draggable="false"
  />
</template>

<style scoped>
.flag-circle {
  border-radius: 50%;
  object-fit: cover;
  display: block;
  flex-shrink: 0;
}
</style>
