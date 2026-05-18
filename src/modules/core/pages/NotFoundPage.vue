<script setup lang="ts">
import { useRouter } from "vue-router"

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="message">Page not found</p>
    <button class="primary" @click="router.push('/')">Go home</button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 12px;
}
.code {
  font-size: 72px;
  font-weight: 700;
  color: var(--text-muted);
  line-height: 1;
}
.message {
  font-size: 16px;
  color: var(--text-muted);
}
</style>
