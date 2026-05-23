<script setup lang="ts">
interface Props {
  size?: number | string
}
const { size = 24 } = defineProps<Props>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 240 240"
    fill="none"
  >
    <g stroke="var(--text-muted)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <line x1="60" y1="30" x2="60" y2="210" />
      <line x1="30" y1="50" x2="60" y2="50" />
      <line x1="30" y1="90" x2="60" y2="90" />
      <line x1="30" y1="150" x2="60" y2="150" />
      <line x1="30" y1="190" x2="60" y2="190" />
      <line x1="60" y1="70" x2="100" y2="70" />
      <line x1="60" y1="170" x2="100" y2="170" />
      <line x1="100" y1="70" x2="100" y2="170" />
      <line x1="100" y1="120" x2="200" y2="120" />
    </g>
    <circle cx="210" cy="120" r="13" fill="var(--accent)" />
  </svg>
</template>
