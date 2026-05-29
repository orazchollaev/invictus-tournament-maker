<script setup lang="ts">
import { computed } from "vue"
import { LOGOS } from "@/assets/logos"

const props = defineProps<{
  logoId: string
  color1: string
  color2: string
  size?: number
}>()

const logo = computed(() => LOGOS.find((l) => l.id === props.logoId) ?? LOGOS[0])
const sz = computed(() => props.size ?? 16)
const innerSz = computed(() => Math.round(props.size ? props.size * 0.72 : 12))
</script>

<template>
  <span class="team-logo" :style="{ background: color2, width: sz + 'px', height: sz + 'px' }">
    <svg
      :viewBox="logo.viewBox"
      :width="innerSz"
      :height="innerSz"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        v-for="(p, i) in logo.paths"
        :key="i"
        :d="p.d"
        :fill="p.layer === 1 ? color1 : color2"
        :fill-rule="p.fillRule"
        :clip-rule="p.fillRule"
      />
    </svg>
  </span>
</template>

<style scoped>
.team-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.18);
}
</style>
